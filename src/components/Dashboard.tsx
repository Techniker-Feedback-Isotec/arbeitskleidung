import React from 'react'
import type { Page } from '../types'
import { useStore } from '../store'
import {
  fmtDate,
  fmtEuro,
  issuesPerMonth,
  shortageRows,
  stockValue,
  topArticles,
  totalSollOf,
  totalStockOf,
  articleById,
  employeeById,
} from '../lib/selectors'
import { BulletChart, ColumnChart, HBarChart } from './charts'
import { ArtThumb } from './ui'
import { fmtEuroCent } from '../lib/selectors'

/** Visuelle Übersicht der Basisausstattung: was jeder Techniker standardmäßig bekommt */
function BasisAusstattung() {
  const { db } = useStore()
  const items = db.articles
    .filter((a) => a.active && a.basisQty > 0)
    .sort((a, b) => b.basisQty - a.basisQty || a.name.localeCompare(b.name, 'de'))
  if (items.length === 0) return null
  const value = items.reduce((s, a) => s + (a.price ?? 0) * a.basisQty, 0)
  const pieces = items.reduce((s, a) => s + a.basisQty, 0)
  return (
    <div className="card">
      <h2>Basisausstattung pro Techniker</h2>
      <p className="card-hint">
        {pieces} Teile · Warenwert {fmtEuroCent(value)} – Mengen pflegst du am Artikel.
      </p>
      <div className="basis-grid">
        {items.map((a) => (
          <div className="basis-tile" key={a.id} title={a.price != null ? `${a.basisQty}× ${fmtEuroCent(a.price)}` : a.name}>
            <span className="basis-img">
              <ArtThumb imageUrl={a.imageUrl} category={a.category} size={74} />
              <span className="basis-qty">{a.basisQty}×</span>
            </span>
            <span className="basis-name">{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({ go }: { go: (p: Page) => void }) {
  const { db } = useStore()

  const shortages = shortageRows(db).filter((r) => r.fehlt > 0)
  const missingQty = shortages.reduce((s, r) => s + r.fehlt, 0)
  const openOrders = db.orders.filter((o) => o.status === 'Bestellt')
  const openQty = openOrders.reduce((s, o) => s + o.qty, 0)
  const activeEmployees = db.employees.filter((e) => e.active)
  const value = stockValue(db)

  const months = issuesPerMonth(db, 9)
  const top = topArticles(db, 6)
  const bullets = db.articles
    .filter((a) => a.active && totalSollOf(a) > 0)
    .map((a) => ({ label: a.name, ist: totalStockOf(db, a.id), soll: totalSollOf(a) }))
    .sort((a, b) => a.ist / Math.max(1, a.soll) - b.ist / Math.max(1, b.soll))

  const recent = db.issues.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">Arbeitskleidung auf einen Blick – Bestand, Bedarf und Ausgaben</p>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi" onClick={() => go({ name: 'bestellliste' })}>
          <p className="kpi-label">Fehlbestand</p>
          <p className={`kpi-value${shortages.length > 0 ? ' alert' : ''}`}>{missingQty} Teile</p>
          <p className="kpi-sub">{shortages.length} Positionen unter Soll</p>
        </div>
        <div className="kpi" onClick={() => go({ name: 'bestellungen' })}>
          <p className="kpi-label">Offene Bestellungen</p>
          <p className="kpi-value">{openQty} Teile</p>
          <p className="kpi-sub">{openOrders.length} Positionen unterwegs</p>
        </div>
        <div className="kpi" onClick={() => go({ name: 'bestand' })}>
          <p className="kpi-label">Lagerwert</p>
          <p className="kpi-value">{fmtEuro(value)}</p>
          <p className="kpi-sub">auf Basis der Einkaufspreise</p>
        </div>
        <div className="kpi" onClick={() => go({ name: 'mitarbeiter' })}>
          <p className="kpi-label">Mitarbeiter</p>
          <p className="kpi-value">{activeEmployees.length}</p>
          <p className="kpi-sub">aktiv im Team</p>
        </div>
      </div>

      <BasisAusstattung />

      <div className="grid-2">
        <div className="card">
          <h2>Ausgegebene Teile pro Monat</h2>
          <ColumnChart
            data={months.map((m) => ({ label: m.label, value: m.qty, hint: m.month }))}
          />
        </div>
        <div className="card">
          <h2>Bestand vs. Soll je Artikel</h2>
          <BulletChart data={bullets} />
        </div>
        <div className="card">
          <h2>Meistausgegebene Artikel</h2>
          <HBarChart data={top.map((t) => ({ label: t.article.name, value: t.qty }))} />
        </div>
        <div className="card">
          <h2>Letzte Warenausgaben</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Mitarbeiter</th>
                  <th>Artikel</th>
                  <th className="num">Menge</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((i) => {
                  const emp = employeeById(db, i.employeeId)
                  const art = articleById(db, i.articleId)
                  return (
                    <tr
                      key={i.id}
                      className="clickable"
                      onClick={() => go({ name: 'mitarbeiterDetail', id: i.employeeId })}
                    >
                      <td>{fmtDate(i.date)}</td>
                      <td>{emp?.name ?? '?'}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <ArtThumb imageUrl={art?.imageUrl} category={art?.category} size={30} />
                          <span>
                            {art?.name ?? '?'} {i.size && <span className="badge">{i.size}</span>}
                            {i.type === 'rueckgabe' && <span className="badge badge-warn"> Rückgabe</span>}
                          </span>
                        </span>
                      </td>
                      <td className="num">{i.qty}</td>
                    </tr>
                  )
                })}
                {recent.length === 0 && (
                  <tr><td colSpan={4} className="empty">Noch keine Ausgaben erfasst</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
