import React, { useState } from 'react'
import type { Employee, Page } from '../types'
import { useStore } from '../store'
import { equipmentOf } from '../lib/selectors'
import { Avatar, Modal, useToast } from './ui'

function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Mitarbeiterliste mit Konfektionsgrößen-Kurzinfo */
export default function Mitarbeiter({ go }: { go: (p: Page) => void }) {
  const { db } = useStore()
  const [showNew, setShowNew] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')

  const employees = db.employees
    .filter((e) => (showInactive ? true : e.active))
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mitarbeiter</h1>
          <p className="page-sub">{db.employees.filter((e) => e.active).length} aktive Techniker – Klick öffnet das Profil mit Größen und Ausstattung</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ Neuer Mitarbeiter</button>
        </div>
      </div>

      <div className="filter-row">
        <input
          className="searchbox"
          type="text"
          placeholder="Name suchen …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Ehemalige anzeigen
        </label>
      </div>

      <div className="person-grid">
        {employees.map((e) => {
          const pieces = [...equipmentOf(db, e.id).values()].reduce((s, v) => s + Math.max(0, v), 0)
          return (
            <div
              key={e.id}
              className={`person-card${e.active ? '' : ' inactive'}`}
              onClick={() => go({ name: 'mitarbeiterDetail', id: e.id })}
            >
              <Avatar id={e.id} name={e.name} photo={e.photo} />
              <div style={{ minWidth: 0 }}>
                <p className="person-name">{e.name}</p>
                <p className="person-sub">
                  {pieces} Teile im Einsatz{!e.active && ' · ehemalig'}
                </p>
              </div>
            </div>
          )
        })}
        {employees.length === 0 && <p className="empty">Keine Mitarbeiter gefunden.</p>}
      </div>

      {showNew && (
        <NewEmployeeModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false)
            go({ name: 'mitarbeiterDetail', id })
          }}
        />
      )}
    </>
  )
}

function NewEmployeeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const [name, setName] = useState('')

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    let id = slugify(trimmed)
    if (!id || db.employees.some((e) => e.id === id)) id = `${id}-${Date.now().toString(36)}`
    const employee: Employee = { id, name: trimmed, active: true, sizes: {} }
    dispatch({ type: 'EMPLOYEE_SAVE', employee })
    toast(`${trimmed} angelegt – jetzt Konfektionsgrößen erfassen.`)
    onCreated(id)
  }

  return (
    <Modal title="Neuen Mitarbeiter anlegen" onClose={onClose}>
      <div className="field">
        <label>Name</label>
        <input
          type="text"
          value={name}
          autoFocus
          style={{ width: '100%' }}
          placeholder="Vorname Nachname"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <p className="field-hint">Die Konfektionsgrößen trägst du direkt danach im Profil ein.</p>
      </div>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
        <button className="btn-primary" disabled={!name.trim()} onClick={save}>Anlegen</button>
      </div>
    </Modal>
  )
}
