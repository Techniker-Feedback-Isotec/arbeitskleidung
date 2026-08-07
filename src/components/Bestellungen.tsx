import React, { useState } from 'react'
import type { Order, OrderStatus } from '../types'
import { CONTACT_EINKAUF } from '../types'
import { useStore, today } from '../store'
import { articleById, fmtDate } from '../lib/selectors'
import { ArtThumb, ContactChip, Modal, useToast } from './ui'

/** Bestellübersicht: Status verfolgen, Wareneingang buchen, Lieferungen prüfen.
    Bestellungen werden über die Bestellliste ausgelöst. */
export default function Bestellungen() {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const [filter, setFilter] = useState<OrderStatus | 'alle'>('Geliefert')
  const [correcting, setCorrecting] = useState<Order | null>(null)

  const orders = db.orders
    .filter((o) => (filter === 'alle' ? true : o.status === filter))
    .slice()
    .sort((a, b) => (a.orderDate < b.orderDate ? 1 : -1))

  const openCount = db.orders.filter((o) => o.status === 'Bestellt').length
  const unconfirmed = db.orders.filter((o) => o.status === 'Geliefert' && !o.confirmedAt).length

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bestellungen</h1>
          <p className="page-sub">
            Übersicht aller Bestellvorgänge – neue Bestellungen löst du über die Bestellliste aus.
            {openCount > 0 && <> {openCount} Positionen unterwegs.</>}
          </p>
        </div>
        <div className="page-actions">
          <ContactChip contact={CONTACT_EINKAUF} />
        </div>
      </div>

      <div className="card">
        <div className="filter-row">
          {(['Geliefert', 'Bestellt', 'Zurückgesendet', 'Storniert', 'alle'] as const).map((f) => (
            <button
              key={f}
              className={`btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'alle' ? 'Alle' : f}
              {f === 'Geliefert' && unconfirmed > 0 && ` (${unconfirmed} ungeprüft)`}
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
                <th className="hide-sm">Geliefert am</th>
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
                        <ArtThumb imageUrl={art?.imageUrl} category={art?.category} size={30} />
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
                      {o.status === 'Zurückgesendet' && <span className="badge badge-red">Zurückgesendet</span>}
                      {o.status === 'Storniert' && <span className="badge">Storniert</span>}
                    </td>
                    <td className="hide-sm">{fmtDate(o.deliveryDate)}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {o.status === 'Bestellt' && (
                        <>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => {
                              dispatch({ type: 'ORDER_DELIVER', id: o.id, deliveryDate: today() })
                              toast('Wareneingang gebucht – Bestand aktualisiert. Bitte Lieferung prüfen.')
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
                      {o.status === 'Geliefert' && !o.confirmedAt && (
                        <>
                          <button
                            className="btn-secondary btn-sm"
                            title="Bestätigt, dass die Lieferung mit der Bestellung übereinstimmt"
                            onClick={() => {
                              dispatch({ type: 'ORDER_CONFIRM', id: o.id, date: today() })
                              toast('Lieferung bestätigt.')
                            }}
                          >
                            ✓ Lieferung bestätigen
                          </button>{' '}
                          <button
                            className="btn-ghost btn-sm"
                            title="Gelieferte Menge weicht von der Bestellung ab"
                            onClick={() => setCorrecting(o)}
                          >
                            Abweichung
                          </button>
                        </>
                      )}
                      {o.status === 'Geliefert' && o.confirmedAt && (
                        <span className="badge badge-ok" title={`Geprüft am ${fmtDate(o.confirmedAt)}`}>
                          ✓ Geprüft
                        </span>
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
        {filter === 'Geliefert' && (
          <p className="chart-caption">
            Künftig setzt das Einkaufspostfach den Status automatisch über die Versand- und
            Lieferbestätigungen – die Prüfung „Lieferung bestätigen" bleibt der manuelle Abgleich
            mit der tatsächlich angekommenen Ware.
          </p>
        )}
      </div>

      {correcting && <DeviationModal order={correcting} onClose={() => setCorrecting(null)} />}
    </>
  )
}

/** Abweichung bei der Lieferprüfung erfassen */
function DeviationModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const art = articleById(db, order.articleId)
  const [actual, setActual] = useState(order.qty)
  const [note, setNote] = useState('')
  const [keepRestOpen, setKeepRestOpen] = useState(true)
  const missing = Math.max(0, order.qty - actual)

  function save() {
    dispatch({
      type: 'ORDER_CORRECT',
      id: order.id,
      actualQty: actual,
      note: note.trim(),
      keepRestOpen: keepRestOpen && missing > 0,
      date: today(),
    })
    toast(
      missing > 0 && keepRestOpen
        ? `Korrigiert – ${missing} Stück bleiben als offene Bestellung stehen.`
        : 'Lieferung korrigiert und bestätigt.',
    )
    onClose()
  }

  return (
    <Modal title="Abweichung bei der Lieferung" onClose={onClose}>
      <p className="small">
        {art?.name} · Größe {order.size} · bestellt: <b>{order.qty} Stück</b>
      </p>
      <div className="form-row" style={{ margin: '14px 0' }}>
        <div className="field">
          <label>Tatsächlich geliefert</label>
          <input
            type="number"
            min={0}
            value={actual}
            onChange={(e) => setActual(Number(e.target.value))}
            autoFocus
          />
        </div>
        <div className="field" style={{ flex: '1 1 220px' }}>
          <label>Anmerkung (optional)</label>
          <input
            type="text"
            value={note}
            style={{ width: '100%' }}
            placeholder="z. B. falsche Größe geliefert"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      {missing > 0 && (
        <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={keepRestOpen}
            onChange={(e) => setKeepRestOpen(e.target.checked)}
          />
          Fehlende {missing} Stück als offene Bestellung (Nachlieferung) stehen lassen
        </label>
      )}
      <p className="field-hint" style={{ marginTop: 10 }}>
        Der Lagerbestand wird auf die tatsächlich gelieferte Menge korrigiert
        {order.seed ? ' (bei Alt-Belegen aus der Excel bleibt der Bestand unverändert)' : ''}.
      </p>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
        <button className="btn-primary" onClick={save}>Korrigieren & bestätigen</button>
      </div>
    </Modal>
  )
}
