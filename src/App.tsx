import React, { useState } from 'react'
import type { Page } from './types'
import { INTRANET_SHOP_URL } from './types'
import { useStore } from './store'
import { shortageRows } from './lib/selectors'
import { CONTACT_AUSGABE, CONTACT_EINKAUF } from './types'
import { ContactChip, ToastProvider } from './components/ui'
import { SyncBadge, SyncProvider } from './components/Sync'
import {
  IconArtikel,
  IconAusgabe,
  IconBestellliste,
  IconBestellungen,
  IconDashboard,
  IconEinstellungen,
  IconLager,
  IconMitarbeiter,
  IconShop,
} from './components/icons'
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

const NAV: { page: Page['name']; label: string; icon: React.ReactNode }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <IconDashboard /> },
  { page: 'ausgabe', label: 'Warenausgabe', icon: <IconAusgabe /> },
  { page: 'bestand', label: 'Lagerbestand', icon: <IconLager /> },
  { page: 'bestellliste', label: 'Bestellliste', icon: <IconBestellliste /> },
  { page: 'bestellungen', label: 'Bestellungen', icon: <IconBestellungen /> },
  { page: 'mitarbeiter', label: 'Mitarbeiter', icon: <IconMitarbeiter /> },
  { page: 'artikel', label: 'Artikel', icon: <IconArtikel /> },
  { page: 'einstellungen', label: 'Einstellungen', icon: <IconEinstellungen /> },
]

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'dashboard' })
  const { db } = useStore()
  const missing = shortageRows(db).filter((r) => r.fehlt > 0).length

  return (
    <ToastProvider>
      <SyncProvider>
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
            <hr className="nav-sep" />
            <a
              className="nav-item nav-extern"
              href={INTRANET_SHOP_URL}
              target="_blank"
              rel="noreferrer"
              title="ISOTEC-Intranet, Lieferantenbereich Strauss (Login erforderlich)"
            >
              <span className="nav-icon"><IconShop /></span>
              Intranet-Shop
              <span className="nav-extern-arrow">↗</span>
            </a>
          </nav>
          <div className="sidebar-contacts">
            <p className="sidebar-contacts-title">Ansprechpartnerinnen</p>
            <ContactChip contact={CONTACT_AUSGABE} />
            <ContactChip contact={CONTACT_EINKAUF} />
          </div>
          <div className="sidebar-foot">
            <SyncBadge />
            IMMER BESSER.
          </div>
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
      </SyncProvider>
    </ToastProvider>
  )
}
