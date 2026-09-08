import React, { useRef } from 'react'
import type { DB } from '../types'
import { useStore } from '../store'
import { useToast } from './ui'

/** Anmeldung, Datensicherung und Statistik */
export default function Einstellungen() {
  const { db, dispatch, ich } = useStore()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  function exportJson() {
    const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arbeitskleidung-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup heruntergeladen.')
  }

  function importJson(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as DB
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.articles)) throw new Error('Format nicht erkannt')
        if (!window.confirm('Der gemeinsame Datenstand wird für alle durch das Backup ersetzt. Fortfahren?')) return
        dispatch({ type: 'IMPORT_DB', db: parsed })
        toast('Backup eingespielt – wird gespeichert.')
      } catch {
        toast('Datei konnte nicht gelesen werden – ist das ein Backup dieses Tools?', 'error')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Einstellungen</h1>
          <p className="page-sub">Anmeldung, Datensicherung und Werkzeuge</p>
        </div>
      </div>

      <div className="card">
        <h2>Anmeldung</h2>
        {ich.email ? (
          <p className="small">
            Angemeldet als <b>{ich.name ?? ich.email}</b> ({ich.email}).
          </p>
        ) : (
          <p className="small">Entwicklungsbetrieb ohne Anmeldung.</p>
        )}
        <div className="page-actions" style={{ marginTop: 12 }}>
          <a className="btn-ghost" style={{ textDecoration: 'none' }} href="/.auth/logout?post_logout_redirect_uri=/">
            Abmelden
          </a>
        </div>
      </div>

      <div className="card">
        <h2>Wo liegen die Daten?</h2>
        <p className="small">
          Der Datenstand liegt zentral in Azure und wird nach jeder Änderung automatisch gespeichert. Alle
          Angemeldeten sehen denselben Stand; der Speicherzustand steht unten links in der Seitenleiste. Das
          Backup ist eine zusätzliche Sicherung, zum Beispiel vor größeren Umbauten.
        </p>
        <div className="page-actions" style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={exportJson}>Backup herunterladen (JSON)</button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>Backup einspielen</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importJson(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="card">
        <h2>Statistik</h2>
        <p className="small">
          {db.employees.length} Mitarbeiter · {db.articles.length} Artikel · {db.issues.length} Warenausgaben ·{' '}
          {db.orders.length} Bestellpositionen
        </p>
      </div>
    </>
  )
}
