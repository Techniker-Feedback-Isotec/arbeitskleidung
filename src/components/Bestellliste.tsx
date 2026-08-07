import React, { useState } from 'react'
import type { Page } from '../types'
import { CONTACT_EINKAUF, INTRANET_SHOP_URL } from '../types'
import { useStore, today } from '../store'
import { shortageRows } from '../lib/selectors'
import { ArtThumb, ContactChip, useToast } from './ui'

/** Berechnete Bestellliste: Soll − Ist − Unterwegs, mit Übernahme in Bestellungen */
export default function Bestellliste({ go }: { go: (p: Page) => void }) {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const [onlyMissing, setOnlyMissing] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const rows = shortageRows(db).filter((r) => (onlyMissing ? r.fehlt > 0 : true))
  const key = (r: { article: { id: string }; size: string }) => `${r.article.id}|${r.size}`
  const missingRows = rows.filter((r) => r.fehlt > 0)
  const allSelected = missingRows.length > 0 && missingRows.every((r) => selected.has(key(r)))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(missingRows.map(key)))
  }

  function orderSelected() {
    const toOrder = missingRows.filter((r) => selected.has(key(r)))
    for (const r of toOrder) {
      dispatch({
        type: 'ORDER_ADD',
        order: {
          articleId: r.article.id,
          size: r.size,
          qty: r.fehlt,
          status: 'Bestellt',
          orderDate: today(),
        },
      })
    }
    setSelected(new Set())
    toast(`${toOrder.length} Positionen als Bestellung angelegt.`)
    go({ name: 'bestellungen' })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bestellliste</h1>
          <p className="page-sub">
            Automatisch berechnet: Fehlmenge = Soll − Ist − bereits bestellt
          </p>
        </div>
        <div className="page-actions">
          <ContactChip contact={CONTACT_EINKAUF} />
          <a className="btn-secondary" style={{ textDecoration: 'none' }} href={INTRANET_SHOP_URL} target="_blank" rel="noreferrer">
            Intranet-Shop öffnen ↗
          </a>
          <button className="btn-primary" disabled={selected.size === 0} onClick={orderSelected}>
            {selected.size > 0 ? `${selected.size} Positionen bestellen` : 'Auswahl bestellen'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filter-row">
          <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
            />
            Nur Positionen mit Fehlmenge
          </label>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Alle auswählen" />
                </th>
                <th>Artikel</th>
                <th>Größe</th>
                <th className="num">Ist</th>
                <th className="num hide-sm">Unterwegs</th>
                <th className="num">Soll</th>
                <th className="num">Fehlt</th>
                <th className="num hide-sm">Mindestbestellmenge</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const k = key(r)
                return (
                  <tr key={k} className={r.fehlt > 0 ? 'row-alert' : ''}>
                    <td>
                      {r.fehlt > 0 && (
                        <input
                          type="checkbox"
                          checked={selected.has(k)}
                          onChange={(e) => {
                            const next = new Set(selected)
                            e.target.checked ? next.add(k) : next.delete(k)
                            setSelected(next)
                          }}
                        />
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ArtThumb imageUrl={r.article.imageUrl} category={r.article.category} />
                        <span>
                          {r.article.name}
                          {r.article.shopUrl && (
                            <>
                              {' '}
                              <a className="shop-link" href={r.article.shopUrl} target="_blank" rel="noreferrer">
                                Shop ↗
                              </a>
                            </>
                          )}
                          {r.article.supplier && <span className="badge" style={{ marginLeft: 6 }}>{r.article.supplier}</span>}
                        </span>
                      </span>
                    </td>
                    <td><span className="badge">{r.size}</span></td>
                    <td className="num">{r.ist}</td>
                    <td className="num hide-sm">{r.unterwegs > 0 ? r.unterwegs : '–'}</td>
                    <td className="num">{r.soll}</td>
                    <td className="num">
                      {r.fehlt > 0 ? <b style={{ color: 'var(--red)' }}>{r.fehlt}</b> : '–'}
                    </td>
                    <td className="num muted hide-sm">{r.article.minOrder > 0 ? r.article.minOrder : '–'}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    Alles im Soll – aktuell keine Fehlmengen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="chart-caption">
          Soll-Bestände pflegst du unter „Artikel". Die Mindestbestellmenge ist ein Hinweis des
          Lieferanten – prüfe beim Bestellen, ob es sich lohnt, auf sie aufzurunden.
        </p>
      </div>
    </>
  )
}
