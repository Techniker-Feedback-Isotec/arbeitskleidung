import React, { useState } from 'react'
import type { OrderStatus } from '../types'
import { INTRANET_SHOP_URL } from '../types'
import { useStore, today } from '../store'
import { articleById, fmtDate } from '../lib/selectors'
import { ArtThumb, Modal, useToast } from './ui'

/** Einkauf: offene und gelieferte Bestellungen, Wareneingang buchen */
export default function Bestellungen() {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const [filter, setFilter] = useState<OrderStatus | 'alle'>('Bestellt')
  const [showNew, setShowNew] = useState(false)

  const orders = db.orders
    .filter((o) => (filter === 'alle' ? true : o.status === filter))
    .slice()
    .sort((a, b) => (a.orderDate < b.orderDate ? 1 : -1))

  const openCount = db.orders.filter((o) => o.status === 'Bestellt').length

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bestellungen</h1>
          <p className="page-sub">
            {openCount > 0 ? `${openCount} Positionen offen – beim Eintreffen „Geliefert" buchen, dann wandert die Ware in den Bestand.` : 'Keine offenen Bestellungen.'}
          </p>
        </div>
        <div className="page-actions">
          <a className="btn-secondary" style={{ textDecoration: 'none' }} href={INTRANET_SHOP_URL} target="_blank" rel="noreferrer">
            🛍️ Intranet-Shop öffnen ↗
          </a>
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ Bestellung erfassen</button>
        </div>
      </div>

      <div className="card">
        <div className="filter-row">
          {(['Bestellt', 'Geliefert', 'Storniert', 'alle'] as const).map((f) => (
            <button
              key={f}
              className={`btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'alle' ? 'Alle' : f}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Bestellt am</th>
                <th>Artikel</th>
                <th>Größe</th>
                <th className="num">Menge</th>
                <th>Status</th>
                <th>Geliefert am</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const art = articleById(db, o.articleId)
                return (
                  <tr key={o.id}>
                    <td>{fmtDate(o.orderDate)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <ArtThumb imageUrl={art?.imageUrl} icon={art?.icon ?? '❔'} size={30} />
                        <span>
                          {art?.name ?? o.articleId}
                          {o.note && <span className="small muted" style={{ display: 'block' }}>{o.note}</span>}
                        </span>
                      </span>
                    </td>
                    <td><span className="badge">{o.size}</span></td>
                    <td className="num">{o.qty}</td>
                    <td>
                      {o.status === 'Bestellt' && <span className="badge badge-warn">Bestellt</span>}
                      {o.status === 'Geliefert' && <span className="badge badge-ok">Geliefert</span>}
                      {o.status === 'Storniert' && <span className="badge">Storniert</span>}
                    </td>
                    <td>{fmtDate(o.deliveryDate)}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {o.status === 'Bestellt' && (
                        <>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => {
                              dispatch({ type: 'ORDER_DELIVER', id: o.id, deliveryDate: today() })
                              toast('Wareneingang gebucht – Bestand aktualisiert.')
                            }}
                          >
                            ✓ Geliefert
                          </button>{' '}
                          <button
                            className="btn-icon"
                            title="Stornieren"
                            onClick={() => dispatch({ type: 'ORDER_CANCEL', id: o.id })}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="empty">Keine Bestellungen in dieser Ansicht.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && <NewOrderModal onClose={() => setShowNew(false)} />}
    </>
  )
}

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const articles = db.articles.filter((a) => a.active)
  const [articleId, setArticleId] = useState(articles[0]?.id ?? '')
  const article = articles.find((a) => a.id === articleId)
  const [size, setSize] = useState(article?.sizes[0] ?? '')
  const [qty, setQty] = useState(1)
  const [date, setDate] = useState(today())
  const [delivered, setDelivered] = useState(false)

  function selectArticle(id: string) {
    setArticleId(id)
    const a = articles.find((x) => x.id === id)
    setSize(a?.sizes[0] ?? '')
  }

  function save() {
    if (!article || !size || qty < 1) return
    dispatch({
      type: 'ORDER_ADD',
      order: {
        articleId,
        size,
        qty,
        status: delivered ? 'Geliefert' : 'Bestellt',
        orderDate: date,
        deliveryDate: delivered ? date : undefined,
      },
    })
    toast(delivered ? 'Lieferung erfasst – Bestand aktualisiert.' : 'Bestellung erfasst.')
    onClose()
  }

  return (
    <Modal title="Bestellung erfassen" onClose={onClose}>
      <div className="form-row" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Artikel</label>
          <select value={articleId} onChange={(e) => selectArticle(e.target.value)}>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Größe</label>
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            {article?.sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Menge</label>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Bestelldatum</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={delivered} onChange={(e) => setDelivered(e.target.checked)} />
        Ware ist bereits geliefert (direkt in den Bestand buchen)
      </label>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
        <button className="btn-primary" onClick={save}>Speichern</button>
      </div>
    </Modal>
  )
}
