import React, { useState } from 'react'
import { useStore } from '../store'
import { stockOf, totalStockOf } from '../lib/selectors'
import { useToast } from './ui'

/** Lagerbestand als Matrix je Artikel × Größe, mit Inventur-Modus zum Direktkorrigieren */
export default function Bestand() {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const [editMode, setEditMode] = useState(false)

  const articles = db.articles.filter((a) => a.active)
  const categories = [...new Set(articles.map((a) => a.category))]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Lagerbestand</h1>
          <p className="page-sub">
            Ist-Bestand je Größe. Rot = unter Soll, grün = Soll erreicht (kleine Zahl = Soll).
          </p>
        </div>
        <div className="page-actions">
          <button
            className={editMode ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              if (editMode) toast('Inventur abgeschlossen – Bestände gespeichert.')
              setEditMode(!editMode)
            }}
          >
            {editMode ? '✓ Inventur beenden' : '✏️ Inventur / Korrektur'}
          </button>
        </div>
      </div>

      {categories.map((cat) => (
        <div className="card" key={cat}>
          <h2>{cat}</h2>
          {articles
            .filter((a) => a.category === cat)
            .map((a) => (
              <div key={a.id} style={{ marginBottom: 18 }}>
                <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
                  <span className="article-icon">{a.icon}</span> {a.name}{' '}
                  <span className="muted small">— gesamt {totalStockOf(db, a.id)} Stück</span>
                </p>
                <div className="table-wrap">
                  <table className="matrix">
                    <thead>
                      <tr>
                        {a.sizes.map((s) => (
                          <th key={s}>{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {a.sizes.map((s) => {
                          const ist = stockOf(db, a.id, s)
                          const soll = a.soll[s] ?? 0
                          const cls =
                            soll > 0 && ist < soll
                              ? 'cell-low'
                              : soll > 0 && ist >= soll
                                ? 'cell-ok'
                                : ist === 0
                                  ? 'cell-zero'
                                  : ''
                          return (
                            <td key={s} className={cls}>
                              {editMode ? (
                                <input
                                  className="stock-input"
                                  type="number"
                                  min={0}
                                  value={ist}
                                  onChange={(e) =>
                                    dispatch({
                                      type: 'STOCK_SET',
                                      articleId: a.id,
                                      size: s,
                                      qty: Number(e.target.value),
                                    })
                                  }
                                />
                              ) : (
                                <>
                                  {ist}
                                  {soll > 0 && <span className="soll-mini">Soll {soll}</span>}
                                </>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      ))}
    </>
  )
}
