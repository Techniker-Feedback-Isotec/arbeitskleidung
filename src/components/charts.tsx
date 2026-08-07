import React, { useState } from 'react'

/* Leichte, eigene SVG-Charts im ISOTEC-Look (eine Serie, Direktbeschriftung, Hover-Tooltip) */

interface TooltipState {
  x: number
  y: number
  text: string
}

function useTooltip() {
  const [tip, setTip] = useState<TooltipState | null>(null)
  const show = (e: React.MouseEvent, text: string) => setTip({ x: e.clientX + 12, y: e.clientY + 12, text })
  const hide = () => setTip(null)
  const node = tip ? (
    <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>
  ) : null
  return { show, hide, node }
}

/** Säulendiagramm (eine Serie) mit Monatslabels */
export function ColumnChart({
  data,
  height = 180,
  unit = 'Stück',
}: {
  data: { label: string; value: number; hint?: string }[]
  height?: number
  unit?: string
}) {
  const { show, hide, node } = useTooltip()
  const max = Math.max(1, ...data.map((d) => d.value))
  const W = 640
  const w = W / data.length
  const plotH = height - 26
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" style={{ display: 'block' }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (plotH - 20)
          const barW = Math.min(44, w * 0.55)
          const x = i * w + (w - barW) / 2
          const y = plotH - h
          return (
            <g key={i}>
              {/* unsichtbare größere Hover-Fläche */}
              <rect
                x={i * w} y={0} width={w} height={plotH} fill="transparent"
                onMouseMove={(e) => show(e, `${d.hint ?? d.label}: ${d.value} ${unit}`)}
                onMouseLeave={hide}
              />
              <rect
                x={x} y={y} width={barW} height={Math.max(h, d.value > 0 ? 3 : 0)}
                rx={4}
                fill="var(--red)"
                style={{ pointerEvents: 'none' }}
              />
              {d.value > 0 && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="13" fill="var(--ink-muted)">
                  {d.value}
                </text>
              )}
              <text x={i * w + w / 2} y={height - 6} textAnchor="middle" fontSize="13" fill="var(--ink-muted)">
                {d.label}
              </text>
            </g>
          )
        })}
        <line x1="0" y1={plotH} x2={W} y2={plotH} stroke="var(--grey)" strokeWidth="1" />
      </svg>
      {node}
    </div>
  )
}

/** Horizontale Balken (eine Serie), z. B. Top-Artikel */
export function HBarChart({
  data,
  unit = 'Stück',
}: {
  data: { label: string; value: number }[]
  unit?: string
}) {
  const { show, hide, node } = useTooltip()
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div>
      {data.map((d, i) => (
        <div
          key={i}
          className="bullet-row"
          onMouseMove={(e) => show(e, `${d.label}: ${d.value} ${unit}`)}
          onMouseLeave={hide}
        >
          <span className="bullet-label" title={d.label}>{d.label}</span>
          <span className="bullet-track">
            <span className="bullet-fill" style={{ width: `${(d.value / max) * 100}%`, background: 'var(--red)' }} />
          </span>
          <span className="bullet-nums">{d.value}</span>
        </div>
      ))}
      {data.length === 0 && <p className="empty">Keine Daten</p>}
      {node}
    </div>
  )
}

/** Bullet-Diagramm: Ist-Balken gegen Soll-Marke */
export function BulletChart({
  data,
  large,
}: {
  data: { label: string; ist: number; soll: number }[]
  large?: boolean
}) {
  const { show, hide, node } = useTooltip()
  const max = Math.max(1, ...data.map((d) => Math.max(d.ist, d.soll)))
  return (
    <div>
      {data.map((d, i) => {
        const under = d.ist < d.soll
        return (
          <div
            key={i}
            className={`bullet-row${large ? ' bullet-row-lg' : ''}`}
            onMouseMove={(e) => show(e, `${d.label} – Ist ${d.ist} / Soll ${d.soll}`)}
            onMouseLeave={hide}
          >
            <span className="bullet-label" title={d.label}>{d.label}</span>
            <span className="bullet-track">
              <span className={`bullet-fill${under ? ' under' : ''}`} style={{ width: `${(d.ist / max) * 100}%` }} />
              {d.soll > 0 && <span className="bullet-target" style={{ left: `${(d.soll / max) * 100}%` }} />}
            </span>
            <span className="bullet-nums">{d.ist} / {d.soll}</span>
          </div>
        )
      })}
      <p className="chart-caption">Balken = Ist-Bestand · Strich = Soll · Rot = unter Soll</p>
      {node}
    </div>
  )
}
