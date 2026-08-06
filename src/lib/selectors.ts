import type { Article, DB, Employee, Issue } from '../types'

export function fmtEuro(v: number): string {
  return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export function fmtEuroCent(v: number): string {
  return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '–'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function articleById(db: DB, id: string): Article | undefined {
  return db.articles.find((a) => a.id === id)
}

export function employeeById(db: DB, id: string): Employee | undefined {
  return db.employees.find((e) => e.id === id)
}

export function stockOf(db: DB, articleId: string, size: string): number {
  return db.stock[articleId]?.[size] ?? 0
}

export function totalStockOf(db: DB, articleId: string): number {
  return Object.values(db.stock[articleId] ?? {}).reduce((s, v) => s + v, 0)
}

export function totalSollOf(article: Article): number {
  return Object.values(article.soll).reduce((s, v) => s + v, 0)
}

/** Offene Bestellmenge (Status Bestellt) je Artikel+Größe */
export function onOrderQty(db: DB, articleId: string, size: string): number {
  return db.orders
    .filter((o) => o.status === 'Bestellt' && o.articleId === articleId && o.size === size)
    .reduce((s, o) => s + o.qty, 0)
}

export interface ShortageRow {
  article: Article
  size: string
  ist: number
  unterwegs: number
  soll: number
  fehlt: number
}

/** Bestellliste: alle Größen mit Soll > 0, Fehlmenge = Soll − Ist − Unterwegs */
export function shortageRows(db: DB): ShortageRow[] {
  const rows: ShortageRow[] = []
  for (const article of db.articles) {
    if (!article.active) continue
    for (const size of article.sizes) {
      const soll = article.soll[size] ?? 0
      const ist = stockOf(db, article.id, size)
      if (soll === 0 && ist === 0) continue
      const unterwegs = onOrderQty(db, article.id, size)
      rows.push({ article, size, ist, unterwegs, soll, fehlt: Math.max(0, soll - ist - unterwegs) })
    }
  }
  return rows
}

/** Lagerwert über alle Artikel mit Preis */
export function stockValue(db: DB): number {
  let sum = 0
  for (const a of db.articles) {
    if (a.price == null) continue
    sum += totalStockOf(db, a.id) * a.price
  }
  return sum
}

/** Aktuelle Ausstattung eines Mitarbeiters: Artikel -> Menge (Ausgaben − Rückgaben) */
export function equipmentOf(db: DB, employeeId: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const i of db.issues) {
    if (i.employeeId !== employeeId) continue
    const delta = i.type === 'ausgabe' ? i.qty : -i.qty
    map.set(i.articleId, (map.get(i.articleId) ?? 0) + delta)
  }
  return map
}

export function issuesOf(db: DB, employeeId: string): Issue[] {
  return db.issues
    .filter((i) => i.employeeId === employeeId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** Ausgegebene Stückzahlen je Monat (yyyy-mm), letzte n Monate */
export function issuesPerMonth(db: DB, months: number): { month: string; label: string; qty: number }[] {
  const now = new Date()
  const out: { month: string; label: string; qty: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('de-DE', { month: 'short' })
    out.push({ month: key, label, qty: 0 })
  }
  const byKey = new Map(out.map((o) => [o.month, o]))
  for (const i of db.issues) {
    if (i.type !== 'ausgabe') continue
    const key = i.date.slice(0, 7)
    const row = byKey.get(key)
    if (row) row.qty += i.qty
  }
  return out
}

/** Meistausgegebene Artikel (Stück gesamt) */
export function topArticles(db: DB, limit: number): { article: Article; qty: number }[] {
  const map = new Map<string, number>()
  for (const i of db.issues) {
    if (i.type !== 'ausgabe') continue
    map.set(i.articleId, (map.get(i.articleId) ?? 0) + i.qty)
  }
  return [...map.entries()]
    .map(([id, qty]) => ({ article: articleById(db, id)!, qty }))
    .filter((r) => r.article)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit)
}
