import React, { useState } from 'react'
import type { Article } from '../types'
import { CONTACT_AUSGABE } from '../types'
import { useStore } from '../store'
import { stockOf, totalSollOf, totalStockOf } from '../lib/selectors'
import { ArtThumb, ContactChip, useToast } from './ui'

/** Lagerbestand: Artikelkarten mit Foto und Größenkacheln, Inventur-Modus zum Direktkorrigieren */
export default function Bestand() {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const [editMode, setEditMode] = useState(false)
  const [compact, setCompact] = useState(true)

  const articles = db.articles.filter((a) => a.active)
  const categories = [...new Set(articles.map((a) => a.category))]
  // Altbestand: nicht mehr genutzte Artikel, die noch im Lager liegen
  const dead = db.articles.filter((a) => !a.active && totalStockOf(db, a.id) > 0)

  function ArticleCard({ a, isDead }: { a: Article; isDead?: boolean }) {
    const total = totalStockOf(db, a.id)
    const soll = totalSollOf(a)
    const pct = soll > 0 ? Math.min(100, (total / soll) * 100) : null
    const sizes = a.sizes.filter((s) => {
      if (!compact || editMode) return true
      return stockOf(db, a.id, s) > 0 || (a.soll[s] ?? 0) > 0
    })
    return (
      <div className={`card bestand-card${isDead ? ' bestand-dead' : ''}`}>
        <div className="bestand-head">
          <ArtThumb imageUrl={a.imageUrl} category={a.category} size={54} />
          <div className="bestand-title">
            <p className="bestand-name">
              {a.name}
              {isDead && <span className="badge" style={{ marginLeft: 8 }}>Altbestand</span>}
              {a.supplier && <span className="badge" style={{ marginLeft: 8 }}>{a.supplier}</span>}
              {a.shopUrl && (
                <>
                  {' '}
                  <a className="shop-link" href={a.shopUrl} target="_blank" rel="noreferrer">Shop ↗</a>
                </>
              )}
            </p>
            <p className="bestand-sub">
              <b>{total}</b> Stück auf Lager{!isDead && soll > 0 && <> · Soll gesamt {soll}</>}
            </p>
          </div>
          {!isDead && pct != null && (
            <div className="bestand-progress" title={`${total} von ${soll}`}>
              <span
                className="bestand-progress-fill"
                style={{ width: `${pct}%`, background: total < soll ? 'var(--red)' : 'var(--ok)' }}
              />
            </div>
          )}
        </div>
        <div className="size-tiles">
          {sizes.map((s) => {
            const ist = stockOf(db, a.id, s)
            const sizeSoll = isDead ? 0 : (a.soll[s] ?? 0)
            const state =
              sizeSoll > 0 && ist < sizeSoll ? 'low' : sizeSoll > 0 ? 'ok' : ist === 0 ? 'zero' : ''
            return (
              <div key={s} className={`size-tile ${state ? `tile-${state}` : ''}`}>
                <span className="tile-size">{s}</span>
                {editMode ? (
                  <input
                    className="stock-input"
                    type="number"
                    min={0}
                    value={ist}
                    onChange={(e) =>
                      dispatch({ type: 'STOCK_SET', articleId: a.id, size: s, qty: Number(e.target.value) })
                    }
                  />
                ) : (
                  <span className="tile-count">{ist}</span>
                )}
                <span className="tile-soll">{sizeSoll > 0 ? `Soll ${sizeSoll}` : ' '}</span>
              </div>
            )
          })}
          {sizes.length === 0 && (
            <p className="empty small" style={{ padding: 6 }}>Kein Bestand und kein Soll hinterlegt.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Lagerbestand</h1>
          <p className="page-sub">
            Ist-Bestand je Größe – rot heißt unter Soll, grün heißt Soll erreicht.
          </p>
        </div>
        <div className="page-actions">
          <ContactChip contact={CONTACT_AUSGABE} />
          <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
            Leere Größen ausblenden
          </label>
          <button
            className={editMode ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              if (editMode) toast('Inventur abgeschlossen – Bestände gespeichert.')
              setEditMode(!editMode)
            }}
          >
            {editMode ? '✓ Inventur beenden' : 'Inventur / Korrektur'}
          </button>
        </div>
      </div>

      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="bestand-cat">{cat}</h2>
          {articles
            .filter((a) => a.category === cat)
            .map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
        </section>
      ))}

      {dead.length > 0 && (
        <section>
          <h2 className="bestand-cat">Altbestand – nicht mehr genutzte Artikel</h2>
          <p className="card-hint">
            Diese Artikel gehören nicht mehr zur aktuellen Ausstattung, liegen aber noch im Lager.
            Sie tauchen in Bestellliste und Warenausgabe nicht mehr auf.
          </p>
          {dead.map((a) => (
            <ArticleCard key={a.id} a={a} isDead />
          ))}
        </section>
      )}
    </>
  )
}
