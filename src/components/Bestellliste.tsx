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
  const [qtyOverride, setQtyOverride] = useState<Record<string, number>>({})

  const rows = shortageRows(db).filter((r) => (onlyMissing ? r.fehlt > 0 : true))
  const key = (r: { article: { id: string }; size: string }) => `${r.article.id}|${r.size}`
  /** Bestellmenge: standardmäßig die Fehlmenge, manuell anpassbar */
  const orderQty = (r: (typeof rows)[number]) => qtyOverride[key(r)] ?? r.fehlt
  const missingRows = rows.filter((r) => r.fehlt > 0)
  const allSelected = missingRows.length > 0 && missingRows.every((r) => selected.has(key(r)))
  const selectedRows = rows.filter((r) => selected.has(key(r)) && orderQty(r) > 0)

  /** Mindestbestellmenge gilt je Artikel über alle Größen zusammen */
  const minOrderInfo = [...new Map(rows.filter((r) => r.article.minOrder > 0).map((r) => [r.article.id, r.article])).values()]
    .map((a) => {
      const articleRows = rows.filter((r) => r.article.id === a.id)
      const fehltSum = articleRows.reduce((s, r) => s + r.fehlt, 0)
      const selSum = articleRows
        .filter((r) => selected.has(key(r)))
        .reduce((s, r) => s + orderQty(r), 0)
      return { article: a, fehltSum, selSum }
    })
    .filter((x) => x.fehltSum > 0 || x.selSum > 0)
  const belowMin = minOrderInfo.filter((x) => x.selSum > 0 && x.selSum < x.article.minOrder)

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(missingRows.map(key)))
  }

  function setQty(k: string, qty: number) {
    setQtyOverride({ ...qtyOverride, [k]: Math.max(0, qty) })
    // Wer eine Menge einträgt, will die Position bestellen
    const next = new Set(selected)
    if (qty > 0) next.add(k)
    else next.delete(k)
    setSelected(next)
  }

  function orderSelected() {
    if (belowMin.length > 0) {
      const liste = belowMin
        .map((x) => `${x.article.name}: ${x.selSum} von mind. ${x.article.minOrder}`)
        .join('\n')
      if (!window.confirm(`Mindestbestellmenge (alle Größen zusammen) noch nicht erreicht:\n\n${liste}\n\nTrotzdem bestellen?`)) {
        return
      }
    }
    for (const r of selectedRows) {
      dispatch({
        type: 'ORDER_ADD',
        order: {
          articleId: r.article.id,
          size: r.size,
          qty: orderQty(r),
          status: 'Bestellt',
          orderDate: today(),
        },
      })
    }
    setSelected(new Set())
    setQtyOverride({})
    toast(`${selectedRows.length} Positionen als Bestellung ausgelöst.`)
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
          <button className="btn-primary" disabled={selectedRows.length === 0} onClick={orderSelected}>
            {selectedRows.length > 0
              ? `${selectedRows.length} Positionen (${selectedRows.reduce((s, r) => s + orderQty(r), 0)} Teile) bestellen`
              : 'Auswahl bestellen'}
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
        {minOrderInfo.length > 0 && (
          <div className="minorder-hints">
            <span className="small muted">Mindestbestellmenge (je Artikel, alle Größen zusammen):</span>
            {minOrderInfo.map(({ article, fehltSum, selSum }) => {
              const cls =
                selSum >= article.minOrder
                  ? 'badge-ok'
                  : selSum > 0
                    ? 'badge-warn'
                    : ''
              return (
                <span key={article.id} className={`badge ${cls}`}>
                  {article.name}: {selSum > 0 ? `${selSum} von mind. ${article.minOrder} ausgewählt` : `mind. ${article.minOrder} · Fehlmenge gesamt ${fehltSum}`}
                  {selSum >= article.minOrder && ' ✓'}
                </span>
              )
            })}
          </div>
        )}
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
                <th className="num hide-sm" title="Gilt je Artikel über alle Größen zusammen">Mindestbestellmenge*</th>
                <th className="num">Bestellmenge</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const k = key(r)
                return (
                  <tr key={k} className={r.fehlt > 0 ? 'row-alert' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(k)}
                        onChange={(e) => {
                          const next = new Set(selected)
                          e.target.checked ? next.add(k) : next.delete(k)
                          setSelected(next)
                        }}
                      />
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
                    <td className="num">
                      <input
                        type="number"
                        min={0}
                        value={orderQty(r)}
                        style={{ width: 60 }}
                        onChange={(e) => setQty(k, Number(e.target.value))}
                      />
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    Alles im Soll – aktuell keine Fehlmengen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="chart-caption">
          Soll-Bestände pflegst du unter „Artikel". *Die Mindestbestellmenge gilt je Artikel über
          alle Größen zusammen (z. B. 2× M + 3× L = 5 Stück) – die Anzeige oben rechnet deine
          Auswahl entsprechend zusammen.
        </p>
      </div>
    </>
  )
}
