import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { Article, DB, Employee, Issue, Order } from './types'
import seedRaw from './data/seed.json'

const STORAGE_KEY = 'arbeitskleidung-db-v1'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/* ---------- Seed: Excel-Daten in DB-Form bringen ---------- */

interface SeedIssue {
  employee: string
  articleId: string
  qty: number
  size: string | null
  date: string | null
}
interface SeedOrder {
  articleId: string
  qty: number
  size: string | null
  status: string
  date: string | null
}

function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildSeedDb(): DB {
  const seed = seedRaw as unknown as {
    articles: Article[]
    employees: Employee[]
    stock: Record<string, Record<string, number>>
    issues: SeedIssue[]
    orders: SeedOrder[]
    seedDate: string
  }
  const employees: Employee[] = seed.employees.map((e) => ({ ...e }))
  const byName = new Map(employees.map((e) => [e.name.toLowerCase(), e]))

  const issues: Issue[] = seed.issues.map((si) => {
    let emp = byName.get(si.employee.toLowerCase())
    if (!emp) {
      // Mitarbeiter tauchte nur in der Warenausgabe auf → trotzdem anlegen
      emp = { id: slugify(si.employee), name: si.employee, active: true, sizes: {} }
      employees.push(emp)
      byName.set(si.employee.toLowerCase(), emp)
    }
    return {
      id: uid(),
      employeeId: emp.id,
      articleId: si.articleId,
      size: si.size,
      qty: si.qty,
      date: si.date ?? seed.seedDate,
      type: 'ausgabe',
      seed: true,
    }
  })

  const orders: Order[] = seed.orders.map((so) => ({
    id: uid(),
    articleId: so.articleId,
    size: so.size ?? '?',
    qty: so.qty,
    status: so.status === 'Geliefert' ? 'Geliefert' : 'Bestellt',
    orderDate: so.date ?? seed.seedDate,
    deliveryDate: so.status === 'Geliefert' ? (so.date ?? seed.seedDate) : undefined,
    seed: true,
  }))

  return {
    version: 1,
    articles: seed.articles.map((a) => ({ ...a })),
    employees,
    stock: JSON.parse(JSON.stringify(seed.stock)),
    issues,
    orders,
  }
}

/* ---------- Reducer ---------- */

export type Action =
  | { type: 'ISSUE_ADD'; issue: Omit<Issue, 'id'> }
  | { type: 'ISSUE_DELETE'; id: string }
  | { type: 'ORDER_ADD'; order: Omit<Order, 'id'> }
  | { type: 'ORDER_DELIVER'; id: string; deliveryDate: string }
  | { type: 'ORDER_CANCEL'; id: string }
  | { type: 'ORDER_DELETE'; id: string }
  | { type: 'STOCK_SET'; articleId: string; size: string; qty: number }
  | { type: 'ARTICLE_SAVE'; article: Article }
  | { type: 'ARTICLE_DELETE'; id: string }
  | { type: 'EMPLOYEE_SAVE'; employee: Employee }
  | { type: 'EMPLOYEE_DELETE'; id: string }
  | { type: 'IMPORT_DB'; db: DB }
  | { type: 'RESET_DB' }

function addStock(stock: DB['stock'], articleId: string, size: string, delta: number): DB['stock'] {
  const next = { ...stock, [articleId]: { ...(stock[articleId] ?? {}) } }
  next[articleId][size] = Math.max(0, (next[articleId][size] ?? 0) + delta)
  return next
}

export function reducer(db: DB, action: Action): DB {
  switch (action.type) {
    case 'ISSUE_ADD': {
      const issue: Issue = { ...action.issue, id: uid() }
      let stock = db.stock
      if (issue.size) {
        const delta = issue.type === 'ausgabe' ? -issue.qty : issue.qty
        stock = addStock(stock, issue.articleId, issue.size, delta)
      }
      return { ...db, issues: [issue, ...db.issues], stock }
    }
    case 'ISSUE_DELETE': {
      const issue = db.issues.find((i) => i.id === action.id)
      if (!issue) return db
      let stock = db.stock
      // Nur in der App erfasste Vorgänge werden beim Löschen zurückgerechnet
      if (!issue.seed && issue.size) {
        const delta = issue.type === 'ausgabe' ? issue.qty : -issue.qty
        stock = addStock(stock, issue.articleId, issue.size, delta)
      }
      return { ...db, issues: db.issues.filter((i) => i.id !== action.id), stock }
    }
    case 'ORDER_ADD': {
      const order: Order = { ...action.order, id: uid() }
      let stock = db.stock
      if (order.status === 'Geliefert') {
        stock = addStock(stock, order.articleId, order.size, order.qty)
      }
      return { ...db, orders: [order, ...db.orders], stock }
    }
    case 'ORDER_DELIVER': {
      const order = db.orders.find((o) => o.id === action.id)
      if (!order || order.status === 'Geliefert') return db
      const stock = addStock(db.stock, order.articleId, order.size, order.qty)
      return {
        ...db,
        stock,
        orders: db.orders.map((o) =>
          o.id === action.id ? { ...o, status: 'Geliefert', deliveryDate: action.deliveryDate } : o,
        ),
      }
    }
    case 'ORDER_CANCEL': {
      const order = db.orders.find((o) => o.id === action.id)
      if (!order || order.status !== 'Bestellt') return db
      return {
        ...db,
        orders: db.orders.map((o) => (o.id === action.id ? { ...o, status: 'Storniert' } : o)),
      }
    }
    case 'ORDER_DELETE': {
      const order = db.orders.find((o) => o.id === action.id)
      if (!order) return db
      let stock = db.stock
      if (!order.seed && order.status === 'Geliefert') {
        stock = addStock(stock, order.articleId, order.size, -order.qty)
      }
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
      const used =
        db.issues.some((i) => i.articleId === action.id) ||
        db.orders.some((o) => o.articleId === action.id)
      if (used) {
        // Historie vorhanden → nur deaktivieren
        return {
          ...db,
          articles: db.articles.map((a) => (a.id === action.id ? { ...a, active: false } : a)),
        }
      }
      const stock = { ...db.stock }
      delete stock[action.id]
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
      const used = db.issues.some((i) => i.employeeId === action.id)
      if (used) {
        return {
          ...db,
          employees: db.employees.map((e) => (e.id === action.id ? { ...e, active: false } : e)),
        }
      }
      return { ...db, employees: db.employees.filter((e) => e.id !== action.id) }
    }
    case 'IMPORT_DB':
      return action.db
    case 'RESET_DB':
      return buildSeedDb()
    default:
      return db
  }
}

/* ---------- Context ---------- */

/** Neue optionale Artikel-Felder aus dem Seed in eine bestehende DB übernehmen */
function migrateDb(db: DB): DB {
  const seedArticles = new Map(buildSeedDb().articles.map((a) => [a.id, a]))
  return {
    ...db,
    articles: db.articles.map((a) => {
      const s = seedArticles.get(a.id)
      if (!s) return a
      return {
        ...a,
        supplier: a.supplier ?? s.supplier,
        shopUrl: a.shopUrl ?? s.shopUrl,
        imageUrl: a.imageUrl ?? s.imageUrl,
      }
    }),
  }
}

function loadDb(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const db = JSON.parse(raw) as DB
      if (db && db.version === 1 && Array.isArray(db.articles)) return migrateDb(db)
    }
  } catch (err) {
    console.error('DB konnte nicht geladen werden, Seed wird genutzt:', err)
  }
  return buildSeedDb()
}

const StoreCtx = createContext<{ db: DB; dispatch: React.Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, dispatch] = useReducer(reducer, undefined as unknown as DB, loadDb)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch (err) {
      console.error('DB konnte nicht gespeichert werden:', err)
    }
  }, [db])
  const value = useMemo(() => ({ db, dispatch }), [db])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore außerhalb des StoreProvider')
  return ctx
}
