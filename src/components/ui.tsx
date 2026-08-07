import React, { createContext, useCallback, useContext, useState } from 'react'

/* ---------- Toasts ---------- */

interface Toast {
  id: number
  text: string
  kind: 'success' | 'error' | 'info'
}

const ToastCtx = createContext<(text: string, kind?: Toast['kind']) => void>(() => {})

export function useToast() {
  return useContext(ToastCtx)
}

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    const id = ++toastId
    setToasts((t) => [...t, { id, text, kind }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------- Modal ---------- */

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" style={wide ? { maxWidth: 760 } : undefined} role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

/* ---------- Avatare (Foto aus src/assets/mitarbeiter, sonst Initialen) ---------- */

const photoModules = import.meta.glob('../assets/mitarbeiter/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** Mitarbeiter-ID (Slug) -> Foto-URL */
const PHOTOS = new Map<string, string>(
  Object.entries(photoModules).map(([path, url]) => {
    const base = path.split('/').pop()!.replace(/\.[^.]+$/, '')
    return [base, url]
  }),
)

export function Initials({ name, big }: { name: string; big?: boolean }) {
  const parts = name.trim().split(/\s+/)
  const text = (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')
  return <span className={`initials${big ? ' big' : ''}`}>{text.toUpperCase()}</span>
}

/** Mitarbeiter-Avatar: echtes Foto, wenn vorhanden, sonst Initialen */
export function Avatar({ id, name, big }: { id: string; name: string; big?: boolean }) {
  const url = PHOTOS.get(id)
  if (url) return <img className={`avatar${big ? ' big' : ''}`} src={url} alt={name} />
  return <Initials name={name} big={big} />
}

/** Artikelbild (Thumbnail), sonst Symbol */
export function ArtThumb({
  imageUrl,
  icon,
  size = 40,
}: {
  imageUrl?: string
  icon: string
  size?: number
}) {
  if (imageUrl) {
    return <img className="thumb" style={{ width: size, height: size }} src={imageUrl} alt="" />
  }
  return <span className="article-icon" style={{ fontSize: size * 0.55 }}>{icon}</span>
}
