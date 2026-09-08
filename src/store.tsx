import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Article, DB, Employee, Issue, Order } from './types'
import { AnmeldungAbgelaufen, ladeDaten, ladeIch, neuAnmelden, speichereDaten, type Ich } from './lib/api'
import { uid } from './lib/text'

/* ---------- Reducer: alle Datenänderungen an einer Stelle ---------- */

export type Action =
  | { type: 'ISSUE_ADD'; issue: Omit<Issue, 'id'> }
  | { type: 'ISSUE_DELETE'; id: string }
  | { type: 'ORDER_ADD'; order: Omit<Order, 'id'> }
  | { type: 'ORDER_DELIVER'; id: string; deliveryDate: string }
  | { type: 'ORDER_CONFIRM'; id: string; date: string }
  | { type: 'ORDER_CORRECT'; id: string; actualQty: number; note: string; keepRestOpen: boolean; date: string }
  | { type: 'ORDER_CANCEL'; id: string }
  | { type: 'ORDER_DELETE'; id: string }
  | { type: 'STOCK_SET'; articleId: string; size: string; qty: number }
  | { type: 'ARTICLE_SAVE'; article: Article }
  | { type: 'ARTICLE_DELETE'; id: string }
  | { type: 'EMPLOYEE_SAVE'; employee: Employee }
  | { type: 'EMPLOYEE_DELETE'; id: string }
  | { type: 'IMPORT_DB'; db: DB }

function addStock(stock: DB['stock'], articleId: string, size: string, delta: number): DB['stock'] {
  const next = { ...stock, [articleId]: { ...(stock[articleId] ?? {}) } }
  next[articleId][size] = Math.max(0, (next[articleId][size] ?? 0) + delta)
  return next
}

/** Bestandswirkung einer Bestellung je Status: Lieferung füllt, Rücksendung leert */
function orderDelta(order: Order): number {
  if (order.status === 'Geliefert') return order.qty
  if (order.status === 'Zurückgesendet') return -order.qty
  return 0
}

export function reducer(db: DB, action: Action): DB {
  switch (action.type) {
    case 'ISSUE_ADD': {
      const issue: Issue = { ...action.issue, id: uid() }
      const delta = issue.type === 'ausgabe' ? -issue.qty : issue.qty
      const stock = issue.size ? addStock(db.stock, issue.articleId, issue.size, delta) : db.stock
      return { ...db, issues: [issue, ...db.issues], stock }
    }
    case 'ISSUE_DELETE': {
      const issue = db.issues.find((i) => i.id === action.id)
      if (!issue) return db
      // Nur in der App erfasste Vorgänge werden beim Löschen zurückgerechnet
      const delta = issue.type === 'ausgabe' ? issue.qty : -issue.qty
      const stock = !issue.seed && issue.size ? addStock(db.stock, issue.articleId, issue.size, delta) : db.stock
      return { ...db, issues: db.issues.filter((i) => i.id !== action.id), stock }
    }
    case 'ORDER_ADD': {
      const order: Order = { ...action.order, id: uid() }
      const stock = addStock(db.stock, order.articleId, order.size, orderDelta(order))
      return { ...db, orders: [order, ...db.orders], stock }
    }
    case 'ORDER_DELIVER': {
      const order = db.orders.find((o) => o.id === action.id)
      if (!order || order.status !== 'Bestellt') return db
      return {
        ...db,
        stock: addStock(db.stock, order.articleId, order.size, order.qty),
        orders: db.orders.map((o) =>
          o.id === action.id ? { ...o, status: 'Geliefert', deliveryDate: action.deliveryDate } : o,
        ),
      }
    }
    case 'ORDER_CONFIRM':
      return {
        ...db,
        orders: db.orders.map((o) => (o.id === action.id ? { ...o, confirmedAt: action.date } : o)),
      }
    case 'ORDER_CORRECT': {
      const order = db.orders.find((o) => o.id === action.id)
      if (!order || order.status !== 'Geliefert') return db
      const actual = Math.max(0, action.actualQty)
      const delta = actual - order.qty
      // Seed-Belege sind im Excel-Bestand bereits enthalten – nur App-Buchungen korrigieren den Bestand
      const stock = !order.seed && delta !== 0 ? addStock(db.stock, order.articleId, order.size, delta) : db.stock
      const note = [order.note, `Abweichung: ${actual} statt ${order.qty} geliefert`, action.note].filter(Boolean).join(' · ')
      const orders = db.orders.map((o) => (o.id === action.id ? { ...o, qty: actual, note, confirmedAt: action.date } : o))
      if (action.keepRestOpen && delta < 0) {
        orders.unshift({
          id: uid(),
          articleId: order.articleId,
          size: order.size,
          qty: -delta,
          status: 'Bestellt',
          orderDate: action.date,
          note: 'Nachlieferung (Abweichung bei Lieferprüfung)',
        })
      }
      return { ...db, stock, orders }
    }
    case 'ORDER_CANCEL':
      return {
        ...db,
        orders: db.orders.map((o) => (o.id === action.id && o.status === 'Bestellt' ? { ...o, status: 'Storniert' } : o)),
      }
    case 'ORDER_DELETE': {
      const order = db.orders.find((o) => o.id === action.id)
      if (!order) return db
      const stock = order.seed ? db.stock : addStock(db.stock, order.articleId, order.size, -orderDelta(order))
      return { ...db, orders: db.orders.filter((o) => o.id !== action.id), stock }
    }
    case 'STOCK_SET': {
      const next = { ...db.stock, [action.articleId]: { ...(db.stock[action.articleId] ?? {}) } }
      next[action.articleId][action.size] = Math.max(0, action.qty)
      return { ...db, stock: next }
    }
    case 'ARTICLE_SAVE': {
      const exists = db.articles.some((a) => a.id === action.article.id)
      return {
        ...db,
        articles: exists
          ? db.articles.map((a) => (a.id === action.article.id ? action.article : a))
          : [...db.articles, action.article],
      }
    }
    case 'ARTICLE_DELETE': {
      const used = db.issues.some((i) => i.articleId === action.id) || db.orders.some((o) => o.articleId === action.id)
      if (used) {
        // Historie vorhanden → nur deaktivieren
        return { ...db, articles: db.articles.map((a) => (a.id === action.id ? { ...a, active: false } : a)) }
      }
      const { [action.id]: _weg, ...stock } = db.stock
      return { ...db, stock, articles: db.articles.filter((a) => a.id !== action.id) }
    }
    case 'EMPLOYEE_SAVE': {
      const exists = db.employees.some((e) => e.id === action.employee.id)
      return {
        ...db,
        employees: exists
          ? db.employees.map((e) => (e.id === action.employee.id ? action.employee : e))
          : [...db.employees, action.employee],
      }
    }
    case 'EMPLOYEE_DELETE': {
      if (db.issues.some((i) => i.employeeId === action.id)) {
        return { ...db, employees: db.employees.map((e) => (e.id === action.id ? { ...e, active: false } : e)) }
      }
      return { ...db, employees: db.employees.filter((e) => e.id !== action.id) }
    }
    case 'IMPORT_DB':
      return action.db
    default:
      return db
  }
}

/* ---------- Provider: laden, gebündelt speichern, Konflikte auflösen ---------- */

export type SpeicherStatus = 'gespeichert' | 'wartet' | 'speichert' | 'fehler'

interface StoreWert {
  db: DB
  dispatch: (action: Action) => void
  status: SpeicherStatus
  fehler: string | null
  /** vorübergehender Hinweis, z. B. nach einer Zusammenführung */
  hinweis: string | null
  ich: Ich
  /** erneuter Versuch nach einem Fehler */
  erneut: () => void
}

const StoreCtx = createContext<StoreWert | null>(null)

const SPEICHER_VERZUG = 600
const WIEDERHOLUNG = 5000

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB | null>(null)
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [status, setStatus] = useState<SpeicherStatus>('gespeichert')
  const [fehler, setFehler] = useState<string | null>(null)
  const [hinweis, setHinweisRoh] = useState<string | null>(null)
  const [ich, setIch] = useState<Ich>({ email: null, name: null })

  /** Kurzer Hinweis in der Seitenleiste (z. B. nach einer Zusammenführung), verschwindet von selbst */
  const setHinweis = useCallback((text: string) => {
    setHinweisRoh(text)
    window.setTimeout(() => setHinweisRoh((h) => (h === text ? null : h)), 8000)
  }, [])

  // Wahrheit außerhalb des Renders, damit Speichern und Konfliktauflösung nie
  // mit einem veralteten Stand arbeiten
  const dbRef = useRef<DB | null>(null)
  const etagRef = useRef<string | null>(null)
  const offen = useRef<Action[]>([]) // seit dem letzten erfolgreichen Speichern angewandt
  const timer = useRef<number | null>(null)
  const laeuft = useRef(false)

  const uebernehmen = useCallback((neu: DB, etag: string | null) => {
    dbRef.current = neu
    etagRef.current = etag
    setDb(neu)
  }, [])

  const behandleAbgelaufen = (e: unknown): boolean => {
    if (e instanceof AnmeldungAbgelaufen) {
      neuAnmelden()
      return true
    }
    return false
  }

  const speichern = useCallback(async () => {
    if (laeuft.current || !dbRef.current || offen.current.length === 0) return
    laeuft.current = true
    setStatus('speichert')
    const stand = dbRef.current
    const enthalten = offen.current.length
    try {
      const erg = await speichereDaten(stand, etagRef.current)
      if (erg.ok) {
        etagRef.current = erg.etag
        offen.current = offen.current.slice(enthalten)
        setFehler(null)
        setStatus(offen.current.length ? 'wartet' : 'gespeichert')
      } else {
        // Jemand anderes hat zwischenzeitlich gespeichert: dessen Stand holen und
        // die eigenen, noch nicht gesicherten Aktionen darauf erneut anwenden
        const frisch = await ladeDaten()
        if (frisch === 'unveraendert') throw new Error('Konflikt ohne neuen Stand')
        const zusammen = offen.current.reduce(reducer, frisch.db)
        uebernehmen(zusammen, frisch.etag)
        setHinweis('Jemand anderes hat zwischenzeitlich gespeichert – die Änderungen wurden zusammengeführt.')
        setStatus('wartet')
      }
    } catch (e) {
      if (behandleAbgelaufen(e)) return
      console.error('Speichern fehlgeschlagen:', e)
      setFehler((e as Error).message)
      setStatus('fehler')
    } finally {
      laeuft.current = false
      if (offen.current.length) {
        timer.current = window.setTimeout(speichern, status === 'fehler' ? WIEDERHOLUNG : SPEICHER_VERZUG)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uebernehmen])

  const planen = useCallback(
    (verzug: number) => {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(speichern, verzug)
    },
    [speichern],
  )

  const dispatch = useCallback(
    (action: Action) => {
      if (!dbRef.current) return
      const neu = reducer(dbRef.current, action)
      if (neu === dbRef.current) return
      dbRef.current = neu
      setDb(neu)
      offen.current.push(action)
      setStatus('wartet')
      planen(SPEICHER_VERZUG)
    },
    [planen],
  )

  // Start: Datenstand und Anmeldung laden
  useEffect(() => {
    let abgebrochen = false
    ;(async () => {
      try {
        const [stand, wer] = await Promise.all([ladeDaten(), ladeIch()])
        if (abgebrochen || stand === 'unveraendert') return
        uebernehmen(stand.db, stand.etag)
        setIch(wer)
      } catch (e) {
        if (behandleAbgelaufen(e)) return
        console.error(e)
        setLadeFehler((e as Error).message)
      }
    })()
    return () => {
      abgebrochen = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Zurück im Fenster: fremde Änderungen nachladen, solange nichts Eigenes offen ist
  useEffect(() => {
    async function nachladen() {
      if (document.visibilityState !== 'visible' || !dbRef.current || offen.current.length || laeuft.current) return
      try {
        const stand = await ladeDaten(etagRef.current)
        if (stand !== 'unveraendert' && !offen.current.length) uebernehmen(stand.db, stand.etag)
      } catch (e) {
        if (behandleAbgelaufen(e)) return
        // Netz weg o. ä.: beim nächsten Fokus erneut
      }
    }
    window.addEventListener('focus', nachladen)
    document.addEventListener('visibilitychange', nachladen)
    return () => {
      window.removeEventListener('focus', nachladen)
      document.removeEventListener('visibilitychange', nachladen)
    }
  }, [uebernehmen])

  // Nicht gesicherte Änderungen beim Schließen schützen
  useEffect(() => {
    function warnen(e: BeforeUnloadEvent) {
      if (offen.current.length) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warnen)
    return () => window.removeEventListener('beforeunload', warnen)
  }, [])

  const wert = useMemo<StoreWert | null>(
    () => (db ? { db, dispatch, status, fehler, hinweis, ich, erneut: () => planen(0) } : null),
    [db, dispatch, status, fehler, hinweis, ich, planen],
  )

  if (ladeFehler) {
    return (
      <div className="lade-schirm">
        <p className="lade-titel">Daten konnten nicht geladen werden</p>
        <p className="small muted">{ladeFehler}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>Erneut versuchen</button>
      </div>
    )
  }
  if (!wert) {
    return (
      <div className="lade-schirm">
        <span className="lade-punkt" aria-hidden="true" />
        <p className="lade-titel">Arbeitskleidung wird geladen …</p>
      </div>
    )
  }
  return <StoreCtx.Provider value={wert}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreWert {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore außerhalb des StoreProvider')
  return ctx
}
