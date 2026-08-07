import React from 'react'

/* Schlichte Linien-Icons (stroke: currentColor) im ISOTEC-Look –
   erben die Textfarbe, wirken damit ruhig und CD-konform. */

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconDashboard = () => (
  <Svg>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </Svg>
)

export const IconAusgabe = () => (
  <Svg>
    <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
    <path d="M12 20v-7.5" />
    <path d="M4 8.5l8 4 8-4" />
    <path d="M16.5 5.9 8 10.3" />
  </Svg>
)

export const IconLager = () => (
  <Svg>
    <path d="M3 9.5 12 4l9 5.5" />
    <path d="M5 8.3V20h14V8.3" />
    <rect x="9" y="13.5" width="6" height="6.5" />
    <path d="M9 17h6" />
  </Svg>
)

export const IconBestellliste = () => (
  <Svg>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4.5V3h6v1.5" />
    <path d="M8.5 9.5h7" />
    <path d="M8.5 13h7" />
    <path d="M8.5 16.5h4.5" />
  </Svg>
)

export const IconBestellungen = () => (
  <Svg>
    <path d="M2.5 6h11v11h-11z" />
    <path d="M13.5 10h4l3 3v4h-7" />
    <circle cx="6.5" cy="18.5" r="1.8" />
    <circle cx="17" cy="18.5" r="1.8" />
  </Svg>
)

export const IconMitarbeiter = () => (
  <Svg>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <circle cx="16.8" cy="9" r="2.5" />
    <path d="M16.5 14.4c2.4.3 4 2 4 4.4" />
  </Svg>
)

export const IconArtikel = () => (
  <Svg>
    <path d="M3.5 12.5v-8h8L21 14l-8 8-9.5-9.5Z" />
    <circle cx="8" cy="9" r="1.4" />
  </Svg>
)

export const IconEinstellungen = () => (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4M6 6l1.7 1.7M16.3 16.3 18 18M18 6l-1.7 1.7M7.7 16.3 6 18" />
  </Svg>
)

export const IconTrash = () => (
  <Svg>
    <path d="M4.5 6.5h15" />
    <path d="M9 6.5V4.5h6v2" />
    <path d="M6.5 6.5 7.5 20h9l1-13.5" />
    <path d="M10 10.5v6M14 10.5v6" />
  </Svg>
)

/* Kategorie-Icons für Artikel ohne Foto (gleicher Linienstil wie das Menü) */

export const IconCatOberteil = () => (
  <Svg>
    <path d="M9 4.5 4 8l2 3 2-1.2V20h8v-10L18 11l2-3-5-3.5a3 3 0 0 1-6 0Z" />
  </Svg>
)

export const IconCatHose = () => (
  <Svg>
    <path d="M7 4h10l1.5 16h-5L12 11.5 10.5 20h-5L7 4Z" />
    <path d="M7 8h10" />
  </Svg>
)

export const IconCatSchuh = () => (
  <Svg>
    <path d="M4 15V8.5c2 1.5 4 2 6 1.5l1.5 2c3.5.5 7 2 8.5 4v2H4v-3Z" />
    <path d="M4 15.5c5 0 12 .5 16 2.5" />
  </Svg>
)

export const IconCatKopf = () => (
  <Svg>
    <path d="M5 13a7 7 0 0 1 14 0v1.5H5V13Z" />
    <path d="M3.5 17c5.5 1.8 11.5 1.8 17 0" />
  </Svg>
)

export const IconCatZubehoer = () => (
  <Svg>
    <rect x="6" y="4" width="12" height="7" rx="2.5" />
    <rect x="7.5" y="13" width="9" height="7" rx="2.5" />
  </Svg>
)

export const IconShop = () => (
  <Svg>
    <path d="M4 9.5 5.5 4h13L20 9.5" />
    <path d="M4 9.5c0 1.4 1.1 2.5 2.5 2.5S9 10.9 9 9.5c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0 1.4 1.1 2.5 2.5 2.5S19 10.9 19 9.5" />
    <path d="M5.5 12v8h13v-8" />
    <path d="M9.5 20v-5h5v5" />
  </Svg>
)
