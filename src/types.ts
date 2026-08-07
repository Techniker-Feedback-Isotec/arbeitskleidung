export type Category = 'Oberteile' | 'Hosen' | 'Schuhe' | 'Kopfbedeckung' | 'Zubehör'

export const CATEGORIES: Category[] = ['Oberteile', 'Hosen', 'Schuhe', 'Kopfbedeckung', 'Zubehör']

/** Bestellwege für Arbeitskleidung */
export const SUPPLIERS = ['Intranet (Strauss)', 'Engelbert Strauss', 'Mascot', 'Amazon', 'Sonstige'] as const
export type Supplier = (typeof SUPPLIERS)[number]

/** ISOTEC-Intranet: Strauss-Lieferantenbereich (Login erforderlich) */
export const INTRANET_SHOP_URL = 'https://de-shop.isotec.info/Lieferanten/STRAUSS/'

/** Vordefinierte Größenraster für neue Artikel */
export const SIZE_PRESETS: Record<string, string[]> = {
  'Konfektion (XS–3XL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  'Hosen (42–64)': ['42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64'],
  'Schuhe (38–50)': ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50'],
  'Mützen (S/M, L/XL)': ['S/M', 'L/XL'],
  'Einheitsgröße': ['Einheitsgröße'],
}

export interface Article {
  id: string
  name: string
  category: Category
  icon: string
  sizes: string[]
  /** Soll-Bestand je Größe (nur Größen mit Soll > 0) */
  soll: Record<string, number>
  /** Mindestbestellmenge des Lieferanten */
  minOrder: number
  price: number | null
  /** Menge in der Basisausstattung für neue Mitarbeiter */
  basisQty: number
  active: boolean
  /** Bestellweg (Intranet, Strauss direkt, Mascot …) */
  supplier?: Supplier
  /** Link zur Produktseite im Shop */
  shopUrl?: string
  /** Link zum Produktfoto */
  imageUrl?: string
}

export interface Employee {
  id: string
  name: string
  active: boolean
  /** Konfektionsgröße je Artikel-ID */
  sizes: Record<string, string>
  note?: string
}

export type IssueType = 'ausgabe' | 'rueckgabe'

export interface Issue {
  id: string
  employeeId: string
  articleId: string
  size: string | null
  qty: number
  date: string // ISO yyyy-mm-dd
  type: IssueType
  note?: string
  /** true = aus Excel übernommen; Bestand wurde beim Import nicht erneut verrechnet */
  seed?: boolean
}

export type OrderStatus = 'Bestellt' | 'Geliefert' | 'Storniert'

export interface Order {
  id: string
  articleId: string
  size: string
  qty: number
  status: OrderStatus
  orderDate: string
  deliveryDate?: string
  note?: string
  seed?: boolean
}

export interface DB {
  version: 1
  articles: Article[]
  employees: Employee[]
  /** Ist-Bestand: articleId -> Größe -> Menge */
  stock: Record<string, Record<string, number>>
  issues: Issue[]
  orders: Order[]
  /** Bereits eingespielte Daten-Nachträge (Migrationsschlüssel) */
  migrations?: string[]
}

export type Page =
  | { name: 'dashboard' }
  | { name: 'bestand' }
  | { name: 'bestellliste' }
  | { name: 'bestellungen' }
  | { name: 'ausgabe'; employeeId?: string }
  | { name: 'mitarbeiter' }
  | { name: 'mitarbeiterDetail'; id: string }
  | { name: 'artikel' }
  | { name: 'einstellungen' }
