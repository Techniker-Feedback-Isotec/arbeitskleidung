import React, { useMemo, useState } from 'react'
import type { Page } from './types'
import { CONTACT_AUSGABE, CONTACT_EINKAUF, INTRANET_SHOP_URL } from './types'
import { useStore } from './store'
import { shortageRows } from './lib/selectors'
import { ContactChip, ToastProvider } from './components/ui'
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

/** Speicherzustand in der Seitenleiste: grün gesichert, gelb unterwegs, rot Fehler */
function SpeicherBadge() {
  const { status, fehler, hinweis, erneut } = useStore()
  const text =
    status === 'gespeichert' ? 'Gespeichert' : status === 'speichert' ? 'Speichert …' : status === 'wartet' ? 'Änderungen offen' : 'Speichern fehlgeschlagen'
  const farbe = status === 'gespeichert' ? 'var(--ok)' : status === 'fehler' ? 'var(--red)' : 'var(--warn)'
  return (
    <>
      <p className="sync-badge" title={fehler ?? undefined}>
        <span className="sync-dot" style={{ background: farbe }} />
        {text}
        {status === 'fehler' && (
          <button className="link-btn" style={{ marginLeft: 6 }} onClick={erneut}>erneut</button>
        )}
      </p>
      {hinweis && <p className="sync-hinweis">{hinweis}</p>}
    </>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'dashboard' })
  const { db, ich } = useStore()
  const fehlend = useMemo(() => shortageRows(db).filter((r) => r.fehlt > 0).length, [db])

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
                {n.page === 'bestellliste' && fehlend > 0 && <span className="nav-badge">{fehlend}</span>}
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
            <SpeicherBadge />
            {ich.name && <p className="sync-badge" title={ich.email ?? undefined}>Angemeldet: {ich.name}</p>}
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
    </ToastProvider>
  )
}
