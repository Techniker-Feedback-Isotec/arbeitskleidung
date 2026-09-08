import type { DB } from '../types'

/* Zugriff auf den Server. Alle Aufrufe laufen gegen denselben Ursprung:
   in der Entwicklung leitet Vite /api an den lokalen Server weiter,
   auf Azure liegt Easy Auth davor. */

export class AnmeldungAbgelaufen extends Error {
  constructor() {
    super('Anmeldung abgelaufen')
  }
}

/** Easy Auth leitet abgelaufene Sitzungen auf die Anmeldeseite um; fetch folgt
    und bekommt HTML mit Status 200. Das darf nie als Datenstand durchgehen. */
function sicherJson(r: Response): void {
  const typ = r.headers.get('content-type') ?? ''
  if (r.ok && !typ.includes('json')) throw new AnmeldungAbgelaufen()
}

export interface Datenstand {
  db: DB
  etag: string | null
  /** true = noch nichts gespeichert, der Server hat den Startbestand geliefert */
  start: boolean
}

export async function ladeDaten(bekannt?: string | null): Promise<Datenstand | 'unveraendert'> {
  const r = await fetch('api/daten', {
    cache: 'no-store',
    headers: bekannt ? { 'If-None-Match': bekannt } : {},
  })
  if (r.status === 304) return 'unveraendert'
  sicherJson(r)
  if (!r.ok) throw new Error(`Laden fehlgeschlagen (${r.status}): ${(await r.text()).slice(0, 200)}`)
  return {
    db: (await r.json()) as DB,
    etag: r.headers.get('etag'),
    start: r.headers.get('x-startbestand') === '1',
  }
}

export type SpeicherErgebnis = { ok: true; etag: string | null } | { ok: false; konflikt: true }

export async function speichereDaten(db: DB, etag: string | null): Promise<SpeicherErgebnis> {
  const r = await fetch('api/daten', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(etag ? { 'If-Match': etag } : { 'If-None-Match': '*' }),
    },
    body: JSON.stringify(db),
  })
  if (r.status === 412) return { ok: false, konflikt: true }
  sicherJson(r)
  if (!r.ok) throw new Error(`Speichern fehlgeschlagen (${r.status}): ${(await r.text()).slice(0, 200)}`)
  return { ok: true, etag: r.headers.get('etag') }
}

export interface Ich {
  email: string | null
  name: string | null
}

export async function ladeIch(): Promise<Ich> {
  const r = await fetch('api/ich', { cache: 'no-store' })
  sicherJson(r)
  if (!r.ok) return { email: null, name: null }
  return (await r.json()) as Ich
}

/** Lädt ein Foto hoch und liefert die Adresse, unter der es ab jetzt erreichbar ist. */
export async function fotoHochladen(id: string, bild: Blob): Promise<string> {
  const r = await fetch(`api/foto/${id}`, { method: 'PUT', headers: { 'Content-Type': bild.type || 'image/jpeg' }, body: bild })
  sicherJson(r)
  if (!r.ok) throw new Error(`Foto konnte nicht gespeichert werden (${r.status})`)
  return `api/foto/${id}?v=${Date.now().toString(36)}`
}

export async function fotoLoeschen(id: string): Promise<void> {
  const r = await fetch(`api/foto/${id}`, { method: 'DELETE' })
  sicherJson(r)
  if (!r.ok) throw new Error(`Foto konnte nicht gelöscht werden (${r.status})`)
}

/** Zur Anmeldeseite, danach zurück auf die Anwendung */
export function neuAnmelden(): void {
  window.location.assign('/.auth/login/aad?post_login_redirect_uri=' + encodeURIComponent(window.location.pathname))
}
