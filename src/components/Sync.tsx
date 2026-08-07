import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { useToast } from './ui'
import {
  fileMtime,
  fileSyncSupported,
  loadStoredHandle,
  pickExistingFile,
  pickNewFile,
  readDb,
  storeHandle,
  writeDb,
  type FsFileHandle,
} from '../lib/filesync'

export type SyncStatus = 'aus' | 'verbunden' | 'reconnect' | 'fehler'

interface SyncApi {
  status: SyncStatus
  fileName: string | null
  lastSaved: Date | null
  supported: boolean
  connectExisting(): Promise<void>
  createNew(): Promise<void>
  reconnect(): Promise<void>
  disconnect(): Promise<void>
}

const SyncCtx = createContext<SyncApi | null>(null)

export function useSync(): SyncApi {
  const ctx = useContext(SyncCtx)
  if (!ctx) throw new Error('useSync außerhalb des SyncProvider')
  return ctx
}

/** Hält die Browser-Daten mit der Datendatei im synchronisierten SharePoint-Ordner abgeglichen. */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const [status, setStatus] = useState<SyncStatus>('aus')
  const [fileName, setFileName] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const handleRef = useRef<FsFileHandle | null>(null)
  const lastMtimeRef = useRef<number>(0)
  const skipSaveRef = useRef(true) // erster Render + Importe aus Datei lösen kein Speichern aus
  const saveTimerRef = useRef<number | null>(null)

  const adoptFile = useCallback(
    async (handle: FsFileHandle, announce: boolean) => {
      const { db: fileDb, mtime } = await readDb(handle)
      lastMtimeRef.current = mtime
      skipSaveRef.current = true
      dispatch({ type: 'IMPORT_DB', db: fileDb })
      handleRef.current = handle
      setFileName(handle.name)
      setStatus('verbunden')
      if (announce) toast(`Mit „${handle.name}" verbunden – Datenstand aus der Datei geladen.`)
    },
    [dispatch, toast],
  )

  // Beim Start: gemerkte Verbindung wiederherstellen
  useEffect(() => {
    if (!fileSyncSupported()) return
    let cancelled = false
    ;(async () => {
      const handle = await loadStoredHandle()
      if (!handle || cancelled) return
      setFileName(handle.name)
      const perm = await handle.queryPermission({ mode: 'readwrite' })
      if (cancelled) return
      if (perm === 'granted') {
        try {
          await adoptFile(handle, false)
        } catch (err) {
          console.error(err)
          setStatus('fehler')
        }
      } else {
        handleRef.current = handle
        setStatus('reconnect')
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Nach jeder Änderung: verzögert in die Datei schreiben
  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return
    }
    if (status !== 'verbunden' || !handleRef.current) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(async () => {
      const handle = handleRef.current
      if (!handle) return
      try {
        const external = await fileMtime(handle)
        if (external > lastMtimeRef.current) {
          toast('Achtung: Die Datei wurde zwischenzeitlich extern geändert – deine Änderung überschreibt sie.', 'error')
        }
        lastMtimeRef.current = await writeDb(handle, db)
        setLastSaved(new Date())
      } catch (err) {
        console.error('Speichern in Datei fehlgeschlagen:', err)
        setStatus('fehler')
        toast('Speichern in die SharePoint-Datei fehlgeschlagen.', 'error')
      }
    }, 800)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db])

  // Beim Zurückkehren ins Fenster: externe Änderungen übernehmen
  useEffect(() => {
    async function onFocus() {
      const handle = handleRef.current
      if (status !== 'verbunden' || !handle) return
      try {
        const mtime = await fileMtime(handle)
        if (mtime > lastMtimeRef.current) {
          await adoptFile(handle, false)
          toast('Datenstand aus der SharePoint-Datei aktualisiert.')
        }
      } catch {
        /* Datei evtl. gerade gesperrt – nächster Fokus versucht es erneut */
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [status, adoptFile, toast])

  const api = useMemo<SyncApi>(
    () => ({
      status,
      fileName,
      lastSaved,
      supported: fileSyncSupported(),
      async connectExisting() {
        const handle = await pickExistingFile()
        if (!handle) return
        try {
          await adoptFile(handle, true)
          await storeHandle(handle)
        } catch (err) {
          console.error(err)
          toast('Datei konnte nicht gelesen werden – ist das eine Datendatei dieses Tools?', 'error')
        }
      },
      async createNew() {
        const handle = await pickNewFile()
        if (!handle) return
        try {
          lastMtimeRef.current = await writeDb(handle, db)
          handleRef.current = handle
          setFileName(handle.name)
          setStatus('verbunden')
          setLastSaved(new Date())
          await storeHandle(handle)
          toast(`„${handle.name}" angelegt – aktueller Datenstand gespeichert.`)
        } catch (err) {
          console.error(err)
          toast('Datei konnte nicht angelegt werden.', 'error')
        }
      },
      async reconnect() {
        const handle = handleRef.current
        if (!handle) return
        const perm = await handle.requestPermission({ mode: 'readwrite' })
        if (perm === 'granted') {
          try {
            await adoptFile(handle, true)
          } catch (err) {
            console.error(err)
            setStatus('fehler')
          }
        }
      },
      async disconnect() {
        handleRef.current = null
        await storeHandle(null)
        setStatus('aus')
        setFileName(null)
        toast('Dateiverbindung getrennt – Änderungen bleiben nur noch in diesem Browser.')
      },
    }),
    [status, fileName, lastSaved, db, adoptFile, toast],
  )

  return (
    <SyncCtx.Provider value={api}>
      {status === 'reconnect' && (
        <div className="sync-banner">
          <span>
            Die Verbindung zur Datendatei {fileName ? <b>„{fileName}"</b> : null} muss nach dem
            Browserstart einmal bestätigt werden.
          </span>
          <button className="btn-primary btn-sm" onClick={() => api.reconnect()}>
            Jetzt verbinden
          </button>
        </div>
      )}
      {children}
    </SyncCtx.Provider>
  )
}

/** Kleine Statusanzeige für die Sidebar */
export function SyncBadge() {
  const { status, fileName, lastSaved } = useSync()
  if (status === 'aus') return null
  const dot =
    status === 'verbunden' ? 'var(--ok)' : status === 'reconnect' ? 'var(--warn)' : 'var(--red)'
  return (
    <p
      className="sync-badge"
      title={
        status === 'verbunden'
          ? `${fileName}${lastSaved ? ` · zuletzt gespeichert ${lastSaved.toLocaleTimeString('de-DE')}` : ''}`
          : 'Verbindung muss bestätigt werden'
      }
    >
      <span className="sync-dot" style={{ background: dot }} />
      SharePoint-Datei{status === 'verbunden' ? '' : status === 'reconnect' ? ' (bestätigen)' : ' (Fehler)'}
    </p>
  )
}
