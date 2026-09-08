// Server fuer den Azure-Betrieb (und lokal fuer die Entwicklung).
//
//   1. gebaute Seite aus dist/ ausliefern: einmal in den Speicher gelesen,
//      Gzip vorgerechnet, ETag/304 – Azure komprimiert selbst nichts
//   2. /api/daten: der gemeinsame Datenstand als eine JSON-Datei, mit ETag,
//      damit sich zwei gleichzeitige Schreiber nicht ueberschreiben
//   3. /api/foto/<id>: hochgeladene Fotos als eigene Dateien neben dem Datenstand
//   4. /api/ich: wer angemeldet ist (aus den Easy-Auth-Kopfzeilen)
//
// Speicher: Azure Blob ueber die verwaltete Identitaet der Web-App (kein
// Schluessel in den Einstellungen). Lokal stattdessen Dateien, wenn
// DATEN_DATEI gesetzt ist. Nur Node-Bordmittel, keine Pakete.
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extname, join, relative } from 'node:path'
import { seedLaden } from './seed.mjs'

const PORT = Number(process.env.PORT) || 8080
const DIST = fileURLToPath(new URL('../dist/', import.meta.url))

const KONTO = process.env.SPEICHER_KONTO
const CONTAINER = process.env.SPEICHER_CONTAINER || 'daten'
const BLOB = process.env.SPEICHER_BLOB || 'arbeitskleidung.json'
const FOTO_PRAEFIX = 'fotos/'
const BLOB_VERSION = '2021-08-06'
const DATEN_GRENZE = 8 * 1024 * 1024
const FOTO_GRENZE = 2 * 1024 * 1024

// Lokaler Betrieb ohne Azure: Datenstand und Fotos als Dateien
const LOKAL_DATEI = process.env.DATEN_DATEI
const LOKAL_FOTOS = process.env.FOTO_ORDNER || (LOKAL_DATEI ? join(LOKAL_DATEI, '..', 'fotos') : null)

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}
const KOMPRIMIERBAR = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg'])

const JSON_KOPF = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
const TEXT_KOPF = { 'Content-Type': 'text/plain; charset=utf-8' }

function antwort(res, status, kopf, body) {
  res.writeHead(status, kopf)
  res.end(body)
}
const fehler = (res, status, text) => antwort(res, status, TEXT_KOPF, text)

// ---------- verwaltete Identitaet ----------

let token = null

async function tokenHolen() {
  if (token && token.ablauf - 120_000 > Date.now()) return token.wert
  const endpunkt = process.env.IDENTITY_ENDPOINT
  const kopf = process.env.IDENTITY_HEADER
  if (!endpunkt || !kopf) throw new Error('Keine verwaltete Identitaet (IDENTITY_ENDPOINT fehlt)')
  const url = `${endpunkt}?resource=${encodeURIComponent('https://storage.azure.com/')}&api-version=2019-08-01`
  const r = await fetch(url, { headers: { 'X-IDENTITY-HEADER': kopf } })
  if (!r.ok) throw new Error(`Token nicht erhalten (${r.status})`)
  const j = await r.json()
  const roh = j.expires_on
  const ablauf = /^\d+$/.test(String(roh)) ? Number(roh) * 1000 : Date.parse(roh)
  token = { wert: j.access_token, ablauf: Number.isFinite(ablauf) ? ablauf : Date.now() + 3_000_000 }
  return token.wert
}

async function blobKopf(zusatz = {}) {
  return { Authorization: `Bearer ${await tokenHolen()}`, 'x-ms-version': BLOB_VERSION, ...zusatz }
}

const blobUrl = (name) => `https://${KONTO}.blob.core.windows.net/${CONTAINER}/${name}`

// ---------- Speicher: eine Schnittstelle, zwei Umsetzungen ----------
//
// lesen(name)                    -> { body: Buffer, etag } | null
// schreiben(name, body, typ, bedingung) -> { etag } | 'konflikt'
// loeschen(name)

const speicherBlob = {
  async lesen(name) {
    const r = await fetch(blobUrl(name), { headers: await blobKopf() })
    if (r.status === 404) return null
    if (!r.ok) throw new Error(`Speicher antwortete ${r.status}`)
    return { body: Buffer.from(await r.arrayBuffer()), etag: r.headers.get('etag'), typ: r.headers.get('content-type') }
  },
  async schreiben(name, body, typ, bedingung = {}) {
    const r = await fetch(blobUrl(name), {
      method: 'PUT',
      headers: await blobKopf({
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': typ,
        'x-ms-blob-content-type': typ,
        ...bedingung,
      }),
      body,
    })
    if (r.status === 412 || r.status === 409) return 'konflikt'
    if (!r.ok) throw new Error(`Speicher antwortete ${r.status}: ${(await r.text()).slice(0, 200)}`)
    return { etag: r.headers.get('etag') }
  },
  async loeschen(name) {
    const r = await fetch(blobUrl(name), { method: 'DELETE', headers: await blobKopf() })
    if (!r.ok && r.status !== 404) throw new Error(`Speicher antwortete ${r.status}`)
  },
}

function lokalPfad(name) {
  return name === BLOB ? LOKAL_DATEI : join(LOKAL_FOTOS, name.slice(FOTO_PRAEFIX.length))
}

async function dateiEtag(pfad) {
  const s = await stat(pfad)
  return `"${s.mtimeMs.toString(36)}-${s.size}"`
}

const speicherDatei = {
  async lesen(name) {
    const pfad = lokalPfad(name)
    try {
      const body = await readFile(pfad)
      return { body, etag: await dateiEtag(pfad), typ: name === BLOB ? 'application/json' : 'image/jpeg' }
    } catch (e) {
      if (e.code === 'ENOENT') return null
      throw e
    }
  },
  async schreiben(name, body, _typ, bedingung = {}) {
    const pfad = lokalPfad(name)
    await mkdir(join(pfad, '..'), { recursive: true })
    const vorhanden = await stat(pfad).catch(() => null)
    if (bedingung['If-None-Match'] === '*' && vorhanden) return 'konflikt'
    if (bedingung['If-Match'] && (!vorhanden || (await dateiEtag(pfad)) !== bedingung['If-Match'])) return 'konflikt'
    await writeFile(pfad, body)
    return { etag: await dateiEtag(pfad) }
  },
  async loeschen(name) {
    await rm(lokalPfad(name), { force: true })
  },
}

const speicher = LOKAL_DATEI ? speicherDatei : speicherBlob

// ---------- Anmeldung ----------

const EMAIL_ANSPRUECHE = ['preferred_username', 'email', 'upn', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn']

/** Easy Auth setzt fuer jeden angemeldeten Aufruf Kopfzeilen, die nur der Server sieht. */
function angemeldet(req) {
  if (process.env.DEV_EMAIL) return { email: process.env.DEV_EMAIL, name: process.env.DEV_NAME || 'Entwicklung' }
  let email = null
  let name = null
  const roh = req.headers['x-ms-client-principal']
  if (roh) {
    try {
      const claims = JSON.parse(Buffer.from(roh, 'base64').toString('utf8')).claims ?? []
      const wert = (typ) => claims.find((c) => (c.typ ?? c.type) === typ)?.val
      for (const typ of EMAIL_ANSPRUECHE) {
        const v = wert(typ)
        if (v?.includes('@')) {
          email = v.toLowerCase()
          break
        }
      }
      name = wert('name') ?? null
    } catch {
      // beschaedigte Kopfzeile: auf den Namen zurueckfallen
    }
  }
  const kopfName = req.headers['x-ms-client-principal-name']
  if (!email && kopfName?.includes('@')) email = kopfName.toLowerCase()
  return { email, name }
}

// ---------- /api/daten ----------

async function datenLesen(req, res) {
  const d = await speicher.lesen(BLOB)
  if (!d) {
    // noch nichts gespeichert: Startbestand ausliefern, der Browser legt ihn beim
    // ersten Speichern mit If-None-Match: * an
    const seed = await seedLaden()
    return antwort(res, 200, { ...JSON_KOPF, 'X-Startbestand': '1' }, JSON.stringify(seed))
  }
  if (d.etag && req.headers['if-none-match'] === d.etag) {
    return antwort(res, 304, { ETag: d.etag, 'Cache-Control': 'no-store' })
  }
  antwort(res, 200, { ...JSON_KOPF, ...(d.etag ? { ETag: d.etag } : {}) }, d.body)
}

async function datenSchreiben(req, res) {
  const rumpf = await rumpfLesen(req, DATEN_GRENZE)
  if (rumpf === null) return fehler(res, 413, 'Datenstand zu gross')
  let daten
  try {
    daten = JSON.parse(rumpf.toString('utf8'))
  } catch {
    return fehler(res, 400, 'Kein gueltiges JSON')
  }
  if (daten?.version !== 1 || !Array.isArray(daten.articles) || !Array.isArray(daten.employees)) {
    return fehler(res, 400, 'Kein Datenstand dieses Werkzeugs')
  }
  const bedingung = {}
  if (req.headers['if-match']) bedingung['If-Match'] = req.headers['if-match']
  if (req.headers['if-none-match']) bedingung['If-None-Match'] = req.headers['if-none-match']
  if (!bedingung['If-Match'] && !bedingung['If-None-Match']) {
    return fehler(res, 428, 'If-Match oder If-None-Match erforderlich')
  }
  const erg = await speicher.schreiben(BLOB, JSON.stringify(daten), 'application/json; charset=utf-8', bedingung)
  if (erg === 'konflikt') return fehler(res, 412, 'Zwischenzeitlich wurde anders gespeichert')
  antwort(res, 200, { ...JSON_KOPF, ETag: erg.etag }, '{"ok":true}')
}

function rumpfLesen(req, grenze) {
  return new Promise((fertig, abbruch) => {
    const teile = []
    let laenge = 0
    req.on('data', (t) => {
      laenge += t.length
      if (laenge > grenze) {
        req.destroy()
        fertig(null)
        return
      }
      teile.push(t)
    })
    req.on('end', () => fertig(Buffer.concat(teile)))
    req.on('error', abbruch)
  })
}

// ---------- /api/foto/<id> ----------

/** nur unbedenkliche Zeichen: der Wert wird Teil einer Adresse im Speicher */
const fotoName = (id) => (/^[A-Za-z0-9_-]{1,80}$/.test(id) ? FOTO_PRAEFIX + id : null)

async function fotoLesen(req, res, id) {
  const name = fotoName(id)
  if (!name) return fehler(res, 400, 'Ungueltige Kennung')
  const d = await speicher.lesen(name)
  if (!d) return antwort(res, 404, { 'Cache-Control': 'max-age=300' })
  if (d.etag && req.headers['if-none-match'] === d.etag) return antwort(res, 304, { ETag: d.etag })
  antwort(
    res,
    200,
    {
      'Content-Type': d.typ || 'image/jpeg',
      // die Adresse traegt eine Versionsnummer (?v=), deshalb darf lange zwischengespeichert werden
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...(d.etag ? { ETag: d.etag } : {}),
    },
    d.body,
  )
}

async function fotoSchreiben(req, res, id) {
  const name = fotoName(id)
  if (!name) return fehler(res, 400, 'Ungueltige Kennung')
  const rumpf = await rumpfLesen(req, FOTO_GRENZE)
  if (rumpf === null) return fehler(res, 413, 'Foto zu gross')
  const typ = req.headers['content-type']?.startsWith('image/') ? req.headers['content-type'] : 'image/jpeg'
  await speicher.schreiben(name, rumpf, typ)
  antwort(res, 200, JSON_KOPF, '{"ok":true}')
}

async function fotoLoeschen(res, id) {
  const name = fotoName(id)
  if (!name) return fehler(res, 400, 'Ungueltige Kennung')
  await speicher.loeschen(name)
  antwort(res, 200, JSON_KOPF, '{"ok":true}')
}

// ---------- statische Dateien: einmal lesen, Gzip vorrechnen ----------

const dateien = new Map()

async function distLaden(ordner = DIST) {
  let eintraege
  try {
    eintraege = await readdir(ordner, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of eintraege) {
    const pfad = join(ordner, e.name)
    if (e.isDirectory()) {
      await distLaden(pfad)
      continue
    }
    const raw = await readFile(pfad)
    const ext = extname(e.name).toLowerCase()
    const url = '/' + relative(DIST, pfad).split('\\').join('/')
    dateien.set(url, {
      raw,
      gz: KOMPRIMIERBAR.has(ext) && raw.length > 1024 ? gzipSync(raw, { level: 9 }) : null,
      typ: TYPEN[ext] ?? 'application/octet-stream',
      etag: `"${createHash('sha1').update(raw).digest('base64url')}"`,
      cache: url === '/index.html' ? 'no-store' : 'public, max-age=31536000, immutable',
    })
  }
}

function dateiAusliefern(req, res, url) {
  const d = dateien.get(url)
  if (!d) return false
  if (req.headers['if-none-match'] === d.etag) {
    antwort(res, 304, { ETag: d.etag, 'Cache-Control': d.cache })
    return true
  }
  const gzip = d.gz && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')
  antwort(
    res,
    200,
    {
      'Content-Type': d.typ,
      'Cache-Control': d.cache,
      ETag: d.etag,
      Vary: 'Accept-Encoding',
      ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
    },
    req.method === 'HEAD' ? undefined : gzip ? d.gz : d.raw,
  )
  return true
}

// ---------- Verteiler ----------

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const pfad = decodeURIComponent(url.pathname)
  try {
    if (pfad === '/gesund') return antwort(res, 200, TEXT_KOPF, 'ok')
    if (pfad === '/api/ich') return antwort(res, 200, JSON_KOPF, JSON.stringify(angemeldet(req)))
    if (pfad === '/api/daten') {
      if (req.method === 'GET') return await datenLesen(req, res)
      if (req.method === 'PUT') return await datenSchreiben(req, res)
      return antwort(res, 405, { Allow: 'GET, PUT' })
    }
    if (pfad.startsWith('/api/foto/')) {
      const id = pfad.slice('/api/foto/'.length)
      if (req.method === 'GET') return await fotoLesen(req, res, id)
      if (req.method === 'PUT') return await fotoSchreiben(req, res, id)
      if (req.method === 'DELETE') return await fotoLoeschen(res, id)
      return antwort(res, 405, { Allow: 'GET, PUT, DELETE' })
    }
    if (pfad.startsWith('/api/')) return fehler(res, 404, 'Unbekannter Pfad')
    if (req.method !== 'GET' && req.method !== 'HEAD') return antwort(res, 405)
    if (dateiAusliefern(req, res, pfad === '/' ? '/index.html' : pfad)) return
    // alles Uebrige an die Anwendung (eine Seite)
    if (dateiAusliefern(req, res, '/index.html')) return
    fehler(res, 404, 'Nicht gefunden')
  } catch (e) {
    console.error('Fehler bei', req.method, pfad, e)
    if (!res.headersSent) fehler(res, 500, `Serverfehler: ${e.message}`)
    else res.end()
  }
})

await distLaden()
server.listen(PORT, () => {
  const ort = LOKAL_DATEI ? `Datei ${LOKAL_DATEI}` : `Blob ${KONTO}/${CONTAINER}/${BLOB}`
  console.log(`Arbeitskleidung laeuft auf Port ${PORT}, ${dateien.size} Dateien aus dist/, Speicher: ${ort}`)
})
