import React, { useState } from 'react'
import type { Article, Category, Supplier } from '../types'
import { CATEGORIES, SIZE_PRESETS, SUPPLIERS } from '../types'
import { useStore } from '../store'
import { fmtEuroCent, totalSollOf, totalStockOf } from '../lib/selectors'
import { Modal, useToast } from './ui'

/** Artikelverwaltung: einfach neue Artikel anlegen, Soll-Bestände & Preise pflegen */
export default function Artikel() {
  const { db, dispatch } = useStore()
  const [editing, setEditing] = useState<Article | 'new' | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const articles = db.articles
    .filter((a) => (showInactive ? true : a.active))
    .sort((a, b) => a.category.localeCompare(b.category, 'de') || a.name.localeCompare(b.name, 'de'))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Artikel</h1>
          <p className="page-sub">Sortiment, Soll-Bestände, Preise und Basisausstattung</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => setEditing('new')}>+ Neuer Artikel</button>
        </div>
      </div>

      <div className="filter-row">
        <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Deaktivierte anzeigen
        </label>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th></th>
                <th>Artikel</th>
                <th>Kategorie</th>
                <th>Bestellweg</th>
                <th>Größen</th>
                <th className="num">Bestand</th>
                <th className="num">Soll gesamt</th>
                <th className="num">Preis</th>
                <th className="num">Basisausstattung</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="clickable" onClick={() => setEditing(a)}>
                  <td className="article-icon">
                    {a.imageUrl ? <img className="thumb" src={a.imageUrl} alt="" /> : a.icon}
                  </td>
                  <td>
                    <b>{a.name}</b>
                    {!a.active && <span className="badge" style={{ marginLeft: 8 }}>deaktiviert</span>}
                    {a.shopUrl && (
                      <>
                        {' '}
                        <a
                          className="shop-link"
                          href={a.shopUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Shop ↗
                        </a>
                      </>
                    )}
                  </td>
                  <td>{a.category}</td>
                  <td className="muted small">{a.supplier ?? '–'}</td>
                  <td className="muted small">
                    {a.sizes.length > 6 ? `${a.sizes[0]} – ${a.sizes[a.sizes.length - 1]}` : a.sizes.join(', ')}
                  </td>
                  <td className="num">{totalStockOf(db, a.id)}</td>
                  <td className="num">{totalSollOf(a) || '–'}</td>
                  <td className="num">{a.price != null ? fmtEuroCent(a.price) : '–'}</td>
                  <td className="num">{a.basisQty > 0 ? `${a.basisQty}×` : '–'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditing(a) }}>
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ArticleModal
          article={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const ICONS = ['👕', '🧥', '🦺', '👖', '🩳', '👟', '🥾', '🧢', '🧤', '🥽', '🦵', '🎽']

function ArticleModal({ article, onClose }: { article: Article | null; onClose: () => void }) {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const isNew = article === null
  const [name, setName] = useState(article?.name ?? '')
  const [category, setCategory] = useState<Category>(article?.category ?? 'Oberteile')
  const [icon, setIcon] = useState(article?.icon ?? '👕')
  const [preset, setPreset] = useState<string>('Konfektion (XS–3XL)')
  const [sizesText, setSizesText] = useState(article?.sizes.join(', ') ?? SIZE_PRESETS['Konfektion (XS–3XL)'].join(', '))
  const [price, setPrice] = useState(article?.price != null ? String(article.price).replace('.', ',') : '')
  const [basisQty, setBasisQty] = useState(article?.basisQty ?? 0)
  const [minOrder, setMinOrder] = useState(article?.minOrder ?? 0)
  const [soll, setSoll] = useState<Record<string, number>>(article?.soll ?? {})
  const [active, setActive] = useState(article?.active ?? true)
  const [supplier, setSupplier] = useState<Supplier | ''>(article?.supplier ?? '')
  const [shopUrl, setShopUrl] = useState(article?.shopUrl ?? '')
  const [imageUrl, setImageUrl] = useState(article?.imageUrl ?? '')

  const sizes = sizesText.split(',').map((s) => s.trim()).filter(Boolean)

  function save() {
    const trimmed = name.trim()
    if (!trimmed || sizes.length === 0) return
    let id = article?.id ?? slugify(trimmed)
    if (isNew && (!id || db.articles.some((a) => a.id === id))) id = `${id}-${Date.now().toString(36)}`
    const priceNum = price.trim() ? Number(price.replace(',', '.')) : null
    const cleanSoll: Record<string, number> = {}
    for (const s of sizes) if ((soll[s] ?? 0) > 0) cleanSoll[s] = soll[s]
    const next: Article = {
      id,
      name: trimmed,
      category,
      icon,
      sizes,
      soll: cleanSoll,
      minOrder,
      price: priceNum != null && !Number.isNaN(priceNum) ? priceNum : null,
      basisQty,
      active,
      supplier: supplier || undefined,
      shopUrl: shopUrl.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    }
    dispatch({ type: 'ARTICLE_SAVE', article: next })
    toast(isNew ? `Artikel „${trimmed}" angelegt.` : 'Artikel gespeichert.')
    onClose()
  }

  return (
    <Modal title={isNew ? 'Neuen Artikel anlegen' : `Artikel bearbeiten: ${article!.name}`} onClose={onClose} wide>
      <div className="form-row" style={{ marginBottom: 14 }}>
        <div className="field" style={{ flex: '1 1 240px' }}>
          <label>Name</label>
          <input type="text" value={name} style={{ width: '100%' }} autoFocus={isNew}
            placeholder="z. B. Regenjacke" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Kategorie</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Symbol</label>
          <select value={icon} onChange={(e) => setIcon(e.target.value)}>
            {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      {isNew && (
        <div className="field">
          <label>Größenraster</label>
          <select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value)
              setSizesText(SIZE_PRESETS[e.target.value].join(', '))
            }}
          >
            {Object.keys(SIZE_PRESETS).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}

      <div className="field">
        <label>Größen (kommagetrennt, anpassbar)</label>
        <input type="text" value={sizesText} style={{ width: '100%' }} onChange={(e) => setSizesText(e.target.value)} />
      </div>

      <div className="form-row" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Bestellweg</label>
          <select value={supplier} onChange={(e) => setSupplier(e.target.value as Supplier | '')}>
            <option value="">–</option>
            {SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: '1 1 260px' }}>
          <label>Shop-Link (Produktseite)</label>
          <input type="text" value={shopUrl} style={{ width: '100%' }} placeholder="https://…"
            onChange={(e) => setShopUrl(e.target.value)} />
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 14, alignItems: 'center' }}>
        <div className="field" style={{ flex: '1 1 260px' }}>
          <label>Foto-Link (Bild-URL)</label>
          <input type="text" value={imageUrl} style={{ width: '100%' }} placeholder="https://…"
            onChange={(e) => setImageUrl(e.target.value)} />
        </div>
        {imageUrl.trim() && <img className="thumb-lg" src={imageUrl.trim()} alt="Vorschau" />}
      </div>

      <div className="form-row" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Einzelpreis (€)</label>
          <input type="text" value={price} placeholder="z. B. 59,90" style={{ width: 110 }}
            onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="field">
          <label>Basisausstattung (Stück)</label>
          <input type="number" min={0} value={basisQty} onChange={(e) => setBasisQty(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Mindestbestellmenge</label>
          <input type="number" min={0} value={minOrder} onChange={(e) => setMinOrder(Number(e.target.value))} />
        </div>
        {!isNew && (
          <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8 }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Aktiv
          </label>
        )}
      </div>

      <div className="field">
        <label>Soll-Bestand je Größe (0 = keine Vorgabe)</label>
        <div className="table-wrap">
          <table className="matrix">
            <thead>
              <tr>{sizes.map((s) => <th key={s}>{s}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                {sizes.map((s) => (
                  <td key={s}>
                    <input
                      className="stock-input"
                      type="number"
                      min={0}
                      value={soll[s] ?? 0}
                      onChange={(e) => setSoll({ ...soll, [s]: Number(e.target.value) })}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal-actions">
        {!isNew && (
          <button
            className="btn-ghost"
            style={{ marginRight: 'auto' }}
            onClick={() => {
              if (window.confirm(`„${article!.name}" löschen? Mit Historie wird der Artikel nur deaktiviert.`)) {
                dispatch({ type: 'ARTICLE_DELETE', id: article!.id })
                onClose()
              }
            }}
          >
            🗑 Löschen
          </button>
        )}
        <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
        <button className="btn-primary" disabled={!name.trim() || sizes.length === 0} onClick={save}>
          Speichern
        </button>
      </div>
    </Modal>
  )
}
