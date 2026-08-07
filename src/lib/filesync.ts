import type { DB } from '../types'

/* Datei-Synchronisation über die File System Access API.
   Die Datendatei liegt in einem per OneDrive synchronisierten
   SharePoint-Ordner – OneDrive übernimmt den Abgleich mit der Cloud. */

// --- Typen der File System Access API (nicht in allen TS-Libs enthalten) ---
export interface FsFileHandle {
  readonly name: string
  getFile(): Promise<File>
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>
  queryPermission(opts: { mode: 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>
  requestPermission(opts: { mode: 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>
}

declare global {
  interface Window {
    showOpenFilePicker?(opts?: unknown): Promise<FsFileHandle[]>
    showSaveFilePicker?(opts?: unknown): Promise<FsFileHandle>
  }
}

export function fileSyncSupported(): boolean {
  return typeof window.showOpenFilePicker === 'function'
}

const PICKER_TYPES = [
  { description: 'Arbeitskleidung-Daten', accept: { 'application/json': ['.json'] } },
]

export async function pickExistingFile(): Promise<FsFileHandle | null> {
  try {
    const [handle] = await window.showOpenFilePicker!({ types: PICKER_TYPES, multiple: false })
    return handle ?? null
  } catch {
    return null // abgebrochen
  }
}

export async function pickNewFile(): Promise<FsFileHandle | null> {
  try {
    return await window.showSaveFilePicker!({
      suggestedName: 'arbeitskleidung-daten.json',
      types: PICKER_TYPES,
    })
  } catch {
    return null
  }
}

export async function readDb(handle: FsFileHandle): Promise<{ db: DB; mtime: number }> {
  const file = await handle.getFile()
  const text = await file.text()
  const db = JSON.parse(text) as DB
  if (!db || db.version !== 1 || !Array.isArray(db.articles)) {
    throw new Error('Dateiformat nicht erkannt')
  }
  return { db, mtime: file.lastModified }
}

export async function writeDb(handle: FsFileHandle, db: DB): Promise<number> {
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(db, null, 1))
  await writable.close()
  const file = await handle.getFile()
  return file.lastModified
}

export async function fileMtime(handle: FsFileHandle): Promise<number> {
  return (await handle.getFile()).lastModified
}

/* --- Handle in IndexedDB merken, damit die Verbindung Neustarts überlebt --- */

const IDB_NAME = 'arbeitskleidung-sync'
const IDB_STORE = 'handles'
const IDB_KEY = 'datafile'

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function storeHandle(handle: FsFileHandle | null): Promise<void> {
  try {
    const idb = await openIdb()
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      if (handle) store.put(handle, IDB_KEY)
      else store.delete(IDB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    idb.close()
  } catch (err) {
    // Verbindung funktioniert dann nur bis zum nächsten Neustart
    console.error('Datei-Handle konnte nicht gemerkt werden:', err)
  }
}

export async function loadStoredHandle(): Promise<FsFileHandle | null> {
  try {
    const idb = await openIdb()
    const handle = await new Promise<FsFileHandle | null>((resolve, reject) => {
      const req = idb.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => resolve((req.result as FsFileHandle) ?? null)
      req.onerror = () => reject(req.error)
    })
    idb.close()
    return handle
  } catch {
    return null
  }
}
