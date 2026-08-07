import React, { useRef } from 'react'
import type { DB } from '../types'
import { useStore } from '../store'
import { useToast } from './ui'

/** Datensicherung: Export/Import als JSON, Zurücksetzen auf den Excel-Stand */
export default function Einstellungen() {
  const { db, dispatch } = useStore()
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
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.articles)) {
          throw new Error('Format nicht erkannt')
        }
        dispatch({ type: 'IMPORT_DB', db: parsed })
        toast('Backup eingespielt.')
      } catch (err) {
        toast('Datei konnte nicht gelesen werden – ist das ein Backup dieser App?', 'error')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Einstellungen</h1>
          <p className="page-sub">Datensicherung und Werkzeuge</p>
        </div>
      </div>

      <div className="card">
        <h2>Wo liegen meine Daten?</h2>
        <p className="small">
          Alle Daten liegen lokal in diesem Browser (localStorage) – nichts verlässt deinen Rechner.
          Mach regelmäßig ein Backup, besonders bevor du den Browser-Cache leerst oder den Rechner wechselst.
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

      <div className="card" style={{ borderColor: '#f0c2c3' }}>
        <h2 style={{ color: 'var(--red)' }}>Zurücksetzen</h2>
        <p className="small">
          Setzt alles auf den Stand der ursprünglichen Excel-Datei zurück („Arbeitsausstattung neu.xlsm",
          eingelesen am 06.08.2026). Alle danach erfassten Vorgänge gehen verloren!
        </p>
        <button
          className="btn-secondary"
          onClick={() => {
            if (window.confirm('Wirklich ALLE Daten auf den Excel-Stand zurücksetzen?')) {
              dispatch({ type: 'RESET_DB' })
              toast('Daten auf Excel-Stand zurückgesetzt.')
            }
          }}
        >
          Auf Excel-Stand zurücksetzen
        </button>
      </div>
    </>
  )
}
