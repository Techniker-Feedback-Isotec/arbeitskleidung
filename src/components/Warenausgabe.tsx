import React, { useMemo, useState } from 'react'
import type { Page } from '../types'
import { useStore, today } from '../store'
import { articleById, employeeById, fmtDate, stockOf } from '../lib/selectors'
import { CONTACT_AUSGABE } from '../types'
import { ArtThumb, Avatar, ContactChip, useToast } from './ui'
import { IconTrash } from './icons'

/** Warenausgabe: Mitarbeiter wählen → Artikel mit passender Größe ausgeben */
export default function Warenausgabe({ go, employeeId }: { go: (p: Page) => void; employeeId?: string }) {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const activeEmployees = db.employees.filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const [empId, setEmpId] = useState(employeeId ?? '')
  const [date, setDate] = useState(today())
  const [type, setType] = useState<'ausgabe' | 'rueckgabe'>('ausgabe')
  const [search, setSearch] = useState('')
  const employee = employeeById(db, empId)

  const articles = db.articles.filter((a) => a.active)

  const history = useMemo(
    () =>
      db.issues
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .filter((i) => {
          if (empId && i.employeeId !== empId) return false
          if (search) {
            const art = articleById(db, i.articleId)
            const emp = employeeById(db, i.employeeId)
            const hay = `${art?.name ?? ''} ${emp?.name ?? ''}`.toLowerCase()
            if (!hay.includes(search.toLowerCase())) return false
          }
          return true
        })
        .slice(0, 40),
    [db, empId, search],
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Warenausgabe</h1>
          <p className="page-sub">Kleidung an Mitarbeiter ausgeben – Größen kommen aus dem Mitarbeiterprofil</p>
        </div>
        <ContactChip contact={CONTACT_AUSGABE} />
      </div>

      <div className="card">
        <div className="form-row">
          {employee && <Avatar id={employee.id} name={employee.name} />}
          <div className="field">
            <label>Mitarbeiter</label>
            <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
              <option value="">– wählen –</option>
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Datum</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Vorgang</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'ausgabe' | 'rueckgabe')}>
              <option value="ausgabe">Ausgabe</option>
              <option value="rueckgabe">Rückgabe</option>
            </select>
          </div>
          {employee && (
            <button className="btn-ghost btn-sm" onClick={() => go({ name: 'mitarbeiterDetail', id: employee.id })}>
              Profil ansehen →
            </button>
          )}
        </div>
      </div>

      {employee ? (
        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar id={employee.id} name={employee.name} />
            {type === 'ausgabe' ? 'Ausgabe an' : 'Rückgabe von'} {employee.name}
          </h2>
          <p className="card-hint">
            Größe ist vorausgewählt aus dem Profil (★). Menge eintragen und ausgeben – der Lagerbestand wird sofort verrechnet.
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Artikel</th>
                  <th>Größe</th>
                  <th className="num">Auf Lager</th>
                  <th className="num">Menge</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...new Set(articles.map((a) => a.category))].map((cat) => (
                  <React.Fragment key={cat}>
                    <tr className="cat-row">
                      <td colSpan={5}>{cat}</td>
                    </tr>
                    {articles
                      .filter((a) => a.category === cat)
                      .map((a) => (
                        <IssueRow
                          key={a.id + empId + type}
                          articleId={a.id}
                          employeeIdSel={empId}
                          date={date}
                          type={type}
                        />
                      ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="empty">Wähle oben einen Mitarbeiter, um Kleidung auszugeben.</p>
        </div>
      )}

      <div className="card">
        <h2>Historie {employee ? `– ${employee.name}` : ''}</h2>
        <div className="filter-row">
          <input
            className="searchbox"
            type="text"
            placeholder="Suchen (Artikel, Mitarbeiter) …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Mitarbeiter</th>
                <th>Artikel</th>
                <th>Größe</th>
                <th className="num">Menge</th>
                <th>Vorgang</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((i) => {
                const art = articleById(db, i.articleId)
                const emp = employeeById(db, i.employeeId)
                return (
                  <tr key={i.id}>
                    <td>{fmtDate(i.date)}</td>
                    <td>{emp?.name ?? '?'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <ArtThumb imageUrl={art?.imageUrl} category={art?.category} size={30} />
                        {art?.name ?? '?'}
                      </span>
                    </td>
                    <td>{i.size ? <span className="badge">{i.size}</span> : '–'}</td>
                    <td className="num">{i.qty}</td>
                    <td>
                      {i.type === 'ausgabe' ? (
                        <span className="badge badge-ok">Ausgabe</span>
                      ) : (
                        <span className="badge badge-warn">Rückgabe</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        title={i.seed ? 'Aus Excel übernommen – Löschen ändert den Bestand nicht' : 'Löschen (Bestand wird zurückgebucht)'}
                        onClick={() => {
                          if (window.confirm('Diesen Eintrag wirklich löschen?')) {
                            dispatch({ type: 'ISSUE_DELETE', id: i.id })
                            toast('Eintrag gelöscht.')
                          }
                        }}
                      >
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {history.length === 0 && (
                <tr><td colSpan={7} className="empty">Keine Einträge gefunden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function IssueRow({
  articleId,
  employeeIdSel,
  date,
  type,
}: {
  articleId: string
  employeeIdSel: string
  date: string
  type: 'ausgabe' | 'rueckgabe'
}) {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const article = articleById(db, articleId)!
  const employee = employeeById(db, employeeIdSel)
  const profileSize = employee?.sizes[articleId]
  const [size, setSize] = useState(profileSize && article.sizes.includes(profileSize) ? profileSize : '')
  const [qty, setQty] = useState(1)
  const ist = size ? stockOf(db, articleId, size) : 0
  const notEnough = type === 'ausgabe' && size !== '' && qty > ist

  function submit() {
    if (!employee || !size || qty < 1) return
    dispatch({
      type: 'ISSUE_ADD',
      issue: { employeeId: employee.id, articleId, size, qty, date, type },
    })
    toast(
      type === 'ausgabe'
        ? `${qty}× ${article.name} (${size}) an ${employee.name} ausgegeben.`
        : `${qty}× ${article.name} (${size}) von ${employee.name} zurückgenommen.`,
    )
    setQty(1)
  }

  return (
    <tr>
      <td>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ArtThumb imageUrl={article.imageUrl} category={article.category} />
          {article.name}
        </span>
        {profileSize && !article.sizes.includes(profileSize) && (
          <span className="badge badge-warn" title="Profilgröße passt nicht zum Größenraster"> Profil: {profileSize}</span>
        )}
      </td>
      <td>
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">–</option>
          {article.sizes.map((s) => (
            <option key={s} value={s}>
              {s}{s === profileSize ? ' ★' : ''}
            </option>
          ))}
        </select>
      </td>
      <td className="num">
        {size === '' ? '–' : notEnough ? <b style={{ color: 'var(--red)' }}>{ist}</b> : ist}
      </td>
      <td className="num">
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 64 }} />
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button
          className={`btn-sm ${type === 'ausgabe' ? 'btn-primary' : 'btn-secondary'}`}
          disabled={!size || qty < 1}
          title={notEnough ? 'Achtung: Bestand reicht nicht – Ausgabe ist trotzdem möglich' : undefined}
          onClick={() => {
            if (notEnough && !window.confirm(`Nur ${ist} Stück auf Lager. Trotzdem ${qty} ausgeben?`)) return
            submit()
          }}
        >
          {type === 'ausgabe' ? 'Ausgeben' : 'Zurücknehmen'}
        </button>
      </td>
    </tr>
  )
}
