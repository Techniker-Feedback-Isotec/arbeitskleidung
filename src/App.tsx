import React, { useState } from 'react'
import type { Page } from './types'
import { useStore } from './store'
import { shortageRows } from './lib/selectors'
import { ToastProvider } from './components/ui'
import logo from './isotec-logo.png'
import Dashboard from './components/Dashboard'
import Bestand from './components/Bestand'
import Bestellliste from './components/Bestellliste'
import Bestellungen from './components/Bestellungen'
import Warenausgabe from './components/Warenausgabe'
import Mitarbeiter from './components/Mitarbeiter'
import MitarbeiterDetail from './components/MitarbeiterDetail'
import Artikel from './components/Artikel'
import Einstellungen from './components/Einstellungen'

const NAV: { page: Page['name']; label: string; icon: string }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: '📊' },
  { page: 'ausgabe', label: 'Warenausgabe', icon: '🤝' },
  { page: 'bestand', label: 'Lagerbestand', icon: '📦' },
  { page: 'bestellliste', label: 'Bestellliste', icon: '🛒' },
  { page: 'bestellungen', label: 'Bestellungen', icon: '🚚' },
  { page: 'mitarbeiter', label: 'Mitarbeiter', icon: '👥' },
  { page: 'artikel', label: 'Artikel', icon: '🏷️' },
  { page: 'einstellungen', label: 'Einstellungen', icon: '⚙️' },
]

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'dashboard' })
  const { db } = useStore()
  const missing = shortageRows(db).filter((r) => r.fehlt > 0).length

  return (
    <ToastProvider>
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img src={logo} alt="ISOTEC" />
            <p className="app-title">Arbeitskleidung</p>
            <p className="app-claim">Abdichtungstechnik Morscheck</p>
          </div>
          <nav className="nav" aria-label="Hauptnavigation">
            {NAV.map((n) => (
              <button
                key={n.page}
                className={`nav-item${page.name === n.page || (n.page === 'mitarbeiter' && page.name === 'mitarbeiterDetail') ? ' active' : ''}`}
                onClick={() => setPage({ name: n.page } as Page)}
              >
                <span className="nav-icon">{n.icon}</span>
                {n.label}
                {n.page === 'bestellliste' && missing > 0 && <span className="nav-badge">{missing}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">IMMER BESSER.</div>
        </aside>
        <main className="content">
          {page.name === 'dashboard' && <Dashboard go={setPage} />}
          {page.name === 'bestand' && <Bestand />}
          {page.name === 'bestellliste' && <Bestellliste go={setPage} />}
          {page.name === 'bestellungen' && <Bestellungen />}
          {page.name === 'ausgabe' && <Warenausgabe go={setPage} employeeId={page.employeeId} />}
          {page.name === 'mitarbeiter' && <Mitarbeiter go={setPage} />}
          {page.name === 'mitarbeiterDetail' && <MitarbeiterDetail id={page.id} go={setPage} />}
          {page.name === 'artikel' && <Artikel />}
          {page.name === 'einstellungen' && <Einstellungen />}
        </main>
      </div>
    </ToastProvider>
  )
}
