import React, { useState } from 'react'
import type { Page } from '../types'
import { useStore, today } from '../store'
import { articleById, equipmentOf, fmtDate, issuesOf, stockOf } from '../lib/selectors'
import { ArtThumb, Avatar, Modal, useToast } from './ui'

/** Profil eines Mitarbeiters: Größen, aktuelle Ausstattung, Historie */
export default function MitarbeiterDetail({ id, go }: { id: string; go: (p: Page) => void }) {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const employee = db.employees.find((e) => e.id === id)
  const [showBasis, setShowBasis] = useState(false)

  if (!employee) {
    return (
      <div className="card">
        <p className="empty">Mitarbeiter nicht gefunden.</p>
        <button className="btn-secondary" onClick={() => go({ name: 'mitarbeiter' })}>← Zur Übersicht</button>
      </div>
    )
  }

  const equipment = [...equipmentOf(db, employee.id).entries()]
    .map(([articleId, qty]) => ({ article: articleById(db, articleId), qty }))
    .filter((r) => r.article && r.qty > 0)
    .sort((a, b) => b.qty - a.qty)

  const history = issuesOf(db, employee.id)
  const articles = db.articles.filter((a) => a.active)

  return (
    <>
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar id={employee.id} name={employee.name} big />
          <div>
            <h1>{employee.name}{!employee.active && <span className="badge" style={{ marginLeft: 10 }}>ehemalig</span>}</h1>
            <p className="page-sub">
              {equipment.reduce((s, r) => s + r.qty, 0)} Teile im Einsatz
            </p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={() => go({ name: 'mitarbeiter' })}>← Übersicht</button>
          <button className="btn-secondary" onClick={() => setShowBasis(true)}>🎒 Basisausstattung ausgeben</button>
          <button className="btn-primary" onClick={() => go({ name: 'ausgabe', employeeId: employee.id })}>
            🤝 Warenausgabe
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Konfektionsgrößen</h2>
          <p className="card-hint">Direkt änderbar – wird bei jeder Warenausgabe vorausgewählt.</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Artikel</th><th>Größe</th></tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <ArtThumb imageUrl={a.imageUrl} icon={a.icon} size={30} />
                        {a.name}
                      </span>
                    </td>
                    <td>
                      <select
                        value={employee.sizes[a.id] ?? ''}
                        onChange={(e) => {
                          const sizes = { ...employee.sizes }
                          if (e.target.value) sizes[a.id] = e.target.value
                          else delete sizes[a.id]
                          dispatch({ type: 'EMPLOYEE_SAVE', employee: { ...employee, sizes } })
                        }}
                      >
                        <option value="">–</option>
                        {a.sizes.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>Aktuelle Ausstattung</h2>
          <p className="card-hint">Summe aller Ausgaben minus Rückgaben.</p>
          {equipment.length > 0 ? (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Artikel</th><th className="num">Im Einsatz</th><th className="num">Basis-Soll</th></tr>
                </thead>
                <tbody>
                  {equipment.map((r) => (
                    <tr key={r.article!.id}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <ArtThumb imageUrl={r.article!.imageUrl} icon={r.article!.icon} size={30} />
                          {r.article!.name}
                        </span>
                      </td>
                      <td className="num"><b>{r.qty}</b></td>
                      <td className="num muted">{r.article!.basisQty > 0 ? r.article!.basisQty : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">Noch keine Kleidung ausgegeben.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Historie</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Datum</th><th>Artikel</th><th>Größe</th><th className="num">Menge</th><th>Vorgang</th>
              </tr>
            </thead>
            <tbody>
              {history.map((i) => {
                const art = articleById(db, i.articleId)
                return (
                  <tr key={i.id}>
                    <td>{fmtDate(i.date)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <ArtThumb imageUrl={art?.imageUrl} icon={art?.icon ?? '❔'} size={30} />
                        {art?.name ?? '?'}
                      </span>
                    </td>
                    <td>{i.size ? <span className="badge">{i.size}</span> : '–'}</td>
                    <td className="num">{i.qty}</td>
                    <td>
                      {i.type === 'ausgabe'
                        ? <span className="badge badge-ok">Ausgabe</span>
                        : <span className="badge badge-warn">Rückgabe</span>}
                    </td>
                  </tr>
                )
              })}
              {history.length === 0 && (
                <tr><td colSpan={5} className="empty">Keine Vorgänge vorhanden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Verwaltung</h2>
        <div className="page-actions">
          <button
            className="btn-ghost"
            onClick={() => {
              dispatch({ type: 'EMPLOYEE_SAVE', employee: { ...employee, active: !employee.active } })
              toast(employee.active ? 'Als ehemalig markiert.' : 'Wieder aktiviert.')
            }}
          >
            {employee.active ? 'Als ehemalig markieren' : 'Wieder aktivieren'}
          </button>
          {history.length === 0 && (
            <button
              className="btn-ghost"
              onClick={() => {
                if (window.confirm(`${employee.name} endgültig löschen?`)) {
                  dispatch({ type: 'EMPLOYEE_DELETE', id: employee.id })
                  go({ name: 'mitarbeiter' })
                }
              }}
            >
              🗑 Löschen
            </button>
          )}
        </div>
      </div>

      {showBasis && (
        <BasisModal
          employeeId={employee.id}
          onClose={() => setShowBasis(false)}
        />
      )}
    </>
  )
}

/** Basisausstattung in einem Rutsch ausgeben */
function BasisModal({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const employee = db.employees.find((e) => e.id === employeeId)!
  const items = db.articles
    .filter((a) => a.active && a.basisQty > 0)
    .map((a) => {
      const size = employee.sizes[a.id] && a.sizes.includes(employee.sizes[a.id]) ? employee.sizes[a.id] : ''
      return { article: a, size, qty: a.basisQty, stock: size ? stockOf(db, a.id, size) : 0 }
    })
  const [rows, setRows] = useState(items)

  const ready = rows.filter((r) => r.size && r.qty > 0)
  const shortages = ready.filter((r) => stockOf(db, r.article.id, r.size) < r.qty)

  function submit() {
    const date = today()
    for (const r of ready) {
      dispatch({
        type: 'ISSUE_ADD',
        issue: {
          employeeId,
          articleId: r.article.id,
          size: r.size,
          qty: r.qty,
          date,
          type: 'ausgabe',
          note: 'Basisausstattung',
        },
      })
    }
    toast(`Basisausstattung (${ready.reduce((s, r) => s + r.qty, 0)} Teile) an ${employee.name} ausgegeben.`)
    onClose()
  }

  return (
    <Modal title={`Basisausstattung für ${employee.name}`} onClose={onClose} wide>
      <p className="card-hint">
        Mengen aus der Basisausstattung, Größen aus dem Profil. Zeilen ohne Größe werden übersprungen.
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr><th>Artikel</th><th>Größe</th><th className="num">Menge</th><th className="num">Auf Lager</th></tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const stock = r.size ? stockOf(db, r.article.id, r.size) : null
              return (
                <tr key={r.article.id}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <ArtThumb imageUrl={r.article.imageUrl} icon={r.article.icon} size={30} />
                      {r.article.name}
                    </span>
                  </td>
                  <td>
                    <select
                      value={r.size}
                      onChange={(e) =>
                        setRows(rows.map((x, i) => (i === idx ? { ...x, size: e.target.value } : x)))
                      }
                    >
                      <option value="">– überspringen –</option>
                      {r.article.sizes.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      min={0}
                      value={r.qty}
                      style={{ width: 64 }}
                      onChange={(e) =>
                        setRows(rows.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))
                      }
                    />
                  </td>
                  <td className="num">
                    {stock == null ? '–' : stock < r.qty ? <b style={{ color: 'var(--red)' }}>{stock}</b> : stock}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {shortages.length > 0 && (
        <p className="small" style={{ color: 'var(--warn)', marginTop: 10 }}>
          ⚠️ Bei {shortages.length} Artikel(n) reicht der Bestand nicht – die Ausgabe ist trotzdem möglich,
          der Bestand geht dann auf 0 und die Fehlmenge erscheint in der Bestellliste.
        </p>
      )}
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
        <button className="btn-primary" disabled={ready.length === 0} onClick={submit}>
          {ready.reduce((s, r) => s + r.qty, 0)} Teile ausgeben
        </button>
      </div>
    </Modal>
  )
}
