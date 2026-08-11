import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import ProspectsReport from './ProspectsReport'
import './ProspectsList.css'

const PAGE_SIZE = 50
const STATUSES = ['Nuevo', 'Contactado', 'Sin respuesta', 'Convertido', 'Descartado']

export default function ProspectsList({ currentCollaboratorId, onClientConverted }) {
  const [prospects, setProspects] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [debtFilter, setDebtFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [checkingId, setCheckingId] = useState(null)
  const [checkingEmailId, setCheckingEmailId] = useState(null)
  const [searchingOnlineId, setSearchingOnlineId] = useState(null)
  const [onlineResults, setOnlineResults] = useState({})
  const [expandedOnlineId, setExpandedOnlineId] = useState(null)
  const [detailProspect, setDetailProspect] = useState(null)
  const [emailCredits, setEmailCredits] = useState(null)
  const [emailCreditsUpdatedAt, setEmailCreditsUpdatedAt] = useState(null)
  const [searchCredits, setSearchCredits] = useState(null)
  const [editProspect, setEditProspect] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const overlayMouseDownOnSelf = useRef(false)

  const handleOverlayMouseDown = (e) => {
    overlayMouseDownOnSelf.current = e.target === e.currentTarget
  }

  const handleOverlayMouseUp = (e, closeFn) => {
    if (overlayMouseDownOnSelf.current && e.target === e.currentTarget) {
      closeFn()
    }
    overlayMouseDownOnSelf.current = false
  }

  useEffect(() => {
    loadProspects()
  }, [page, search, statusFilter, emailFilter, debtFilter])

  useEffect(() => {
    loadEmailCredits()
    loadSearchCredits()
  }, [])

  const loadEmailCredits = async () => {
    const { data } = await supabase
      .from('email_credits_status')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setEmailCredits(data.remaining)
      setEmailCreditsUpdatedAt(data.updated_at)
    }
  }

  const loadSearchCredits = async () => {
    try {
      const res = await fetch('/api/search-credits')
      const data = await res.json()
      if (res.ok && data.limit !== null) {
        setSearchCredits({ used: data.used, limit: data.limit })
      }
    } catch {
      // credit badge is informational only; ignore failures silently
    }
  }

  const loadProspects = async () => {
    setLoading(true)
    let query = supabase
      .from('prospects')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (search.trim()) {
      query = query.or(
        `business_name.ilike.%${search}%,email.ilike.%${search}%,comuna.ilike.%${search}%,region.ilike.%${search}%,rubro.ilike.%${search}%`
      )
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    if (emailFilter === 'unchecked') {
      query = query.is('email_checked_at', null)
    } else if (emailFilter === 'valid') {
      query = query.eq('email_result', 'valid').or('email_accept_all.is.null,email_accept_all.eq.false')
    } else if (emailFilter === 'invalid') {
      query = query.eq('email_result', 'invalid')
    } else if (emailFilter === 'accept_all') {
      query = query.eq('email_accept_all', true)
    } else if (emailFilter === 'unknown') {
      query = query.eq('email_result', 'unknown')
    }

    if (debtFilter === 'unchecked') {
      query = query.is('debt_checked_at', null)
    } else if (debtFilter === 'has_debt') {
      query = query.eq('has_debt', true)
    } else if (debtFilter === 'no_debt') {
      query = query.eq('has_debt', false)
    }

    const { data, count } = await query
    setProspects(data || [])
    setTotalCount(count || 0)
    setLoading(false)
  }

  const patchProspect = (id, changes) => {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)))
  }

  const updateStatus = async (id, status) => {
    patchProspect(id, { status })
    await supabase.from('prospects').update({ status }).eq('id', id)
  }

  const convertToClient = async (prospect) => {
    const { error } = await supabase.from('clients').insert([{
      name: prospect.business_name,
      email: prospect.email,
      company: prospect.business_name,
      status: 'Contactado',
      notes: `RUT: ${prospect.rut}-${prospect.dv} · ${prospect.address || ''} · ${prospect.comuna || ''}`,
      created_by: currentCollaboratorId || null,
    }])

    if (!error) {
      const assigned_to = currentCollaboratorId || null
      await supabase
        .from('prospects')
        .update({ status: 'Convertido', assigned_to })
        .eq('id', prospect.id)
      patchProspect(prospect.id, { status: 'Convertido', assigned_to })
      setMessage(`✓ ${prospect.business_name} agregado a Base de Clientes`)
      setTimeout(() => setMessage(''), 3000)
      onClientConverted?.()
    }
  }

  const checkDebt = async (prospect) => {
    setCheckingId(prospect.id)
    try {
      const rut = `${prospect.rut}-${prospect.dv}`
      const res = await fetch(`/api/check-mora?rut=${encodeURIComponent(rut)}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al validar')

      const changes = {
        has_debt: data.hasDebt,
        debt_count: data.count,
        debt_records: data.records || [],
        debt_checked_at: new Date().toISOString(),
      }

      await supabase.from('prospects').update(changes).eq('id', prospect.id)
      patchProspect(prospect.id, changes)
    } catch (err) {
      setMessage('Error: ' + err.message)
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setCheckingId(null)
    }
  }

  const searchOnline = async (prospect) => {
    setSearchingOnlineId(prospect.id)
    try {
      const params = new URLSearchParams({
        businessName: prospect.business_name || '',
        comuna: prospect.comuna || '',
      })
      const res = await fetch(`/api/find-contact?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al buscar en internet')

      setOnlineResults((prev) => ({
        ...prev,
        [prospect.id]: {
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          searchUrl: data.searchUrl,
          resultsChecked: data.resultsChecked || 0,
          results: data.results || [],
        },
      }))
      loadSearchCredits()
    } catch (err) {
      setMessage('Error al buscar en internet: ' + err.message)
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setSearchingOnlineId(null)
    }
  }

  const applyOnlineEmail = async (prospect, email) => {
    const changes = {
      email,
      email_result: null,
      email_safe_to_send: null,
      email_reason: null,
      email_accept_all: null,
      email_checked_at: null,
    }

    const { error } = await supabase.from('prospects').update(changes).eq('id', prospect.id)
    if (error) {
      setMessage('Error al guardar: ' + error.message)
      setTimeout(() => setMessage(''), 4000)
      return
    }

    patchProspect(prospect.id, changes)
    setOnlineResults((prev) => {
      const next = { ...prev }
      delete next[prospect.id]
      return next
    })
    setMessage(`✓ Correo actualizado para ${prospect.business_name}`)
    setTimeout(() => setMessage(''), 3000)
  }

  const checkEmail = async (prospect) => {
    if (!prospect.email) {
      setMessage('Este prospecto no tiene email registrado')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setCheckingEmailId(prospect.id)
    try {
      const res = await fetch(`/api/check-email?email=${encodeURIComponent(prospect.email)}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al validar el correo')

      const changes = {
        email_result: data.result,
        email_safe_to_send: data.safeToSend,
        email_reason: data.reason,
        email_accept_all: data.acceptAll,
        email_checked_at: new Date().toISOString(),
      }

      await supabase.from('prospects').update(changes).eq('id', prospect.id)
      patchProspect(prospect.id, changes)

      if (data.remainingCredits !== null && data.remainingCredits !== undefined) {
        const now = new Date().toISOString()
        await supabase.from('email_credits_status').insert([{ remaining: data.remainingCredits, updated_at: now }])
        setEmailCredits(data.remainingCredits)
        setEmailCreditsUpdatedAt(now)
      }
    } catch (err) {
      setMessage('Error: ' + err.message)
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setCheckingEmailId(null)
    }
  }

  const openEditProspect = (prospect) => {
    setEditProspect(prospect)
    setEditForm({
      business_name: prospect.business_name || '',
      email: prospect.email || '',
      comuna: prospect.comuna || '',
      region: prospect.region || '',
      address: prospect.address || '',
    })
    setEditError('')
  }

  const closeEditProspect = () => {
    setEditProspect(null)
    setEditForm(null)
    setEditError('')
  }

  const saveEditProspect = async (e) => {
    e.preventDefault()
    setSavingEdit(true)
    setEditError('')

    const emailChanged = editForm.email.trim() !== (editProspect.email || '')

    const changes = {
      business_name: editForm.business_name.trim(),
      email: editForm.email.trim(),
      comuna: editForm.comuna.trim(),
      region: editForm.region.trim(),
      address: editForm.address.trim(),
    }

    if (emailChanged) {
      changes.email_result = null
      changes.email_safe_to_send = null
      changes.email_reason = null
      changes.email_accept_all = null
      changes.email_checked_at = null
    }

    const { error } = await supabase.from('prospects').update(changes).eq('id', editProspect.id)

    if (error) {
      setEditError(error.message)
      setSavingEdit(false)
      return
    }

    patchProspect(editProspect.id, changes)
    setSavingEdit(false)
    closeEditProspect()
    setMessage('✓ Cambios guardados')
    setTimeout(() => setMessage(''), 3000)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  if (showReport) {
    return (
      <div className="prospects-list">
        <ProspectsReport onClose={() => setShowReport(false)} />
      </div>
    )
  }

  return (
    <div className="prospects-list">
      <div className="list-header">
        <h2>Prospectos <span className="total-count">({totalCount.toLocaleString('es-CL')})</span></h2>
        <div className="header-right-controls">
          {emailCredits !== null && (
            <div className={`email-credits-badge ${emailCredits <= 10 ? 'credits-low' : ''}`}>
              📧 {emailCredits} créditos de correo restantes
              {emailCreditsUpdatedAt && (
                <span className="credits-updated"> · actualizado {new Date(emailCreditsUpdatedAt).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
              )}
            </div>
          )}
          {searchCredits !== null && (
            <div
              className={`email-credits-badge ${searchCredits.limit - searchCredits.used <= 50 ? 'credits-low' : ''}`}
              title="Búsquedas automáticas en internet (Tavily) usadas este mes"
            >
              🌐 {searchCredits.limit - searchCredits.used} búsquedas restantes este mes
            </div>
          )}
          <button className="report-toggle-btn" onClick={() => setShowReport(true)}>📊 Ver Reporte</button>
        </div>
      </div>

      <div className="prospects-toolbar">
        <input
          type="text"
          placeholder="Buscar por nombre, email, comuna, región o rubro..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={emailFilter}
          onChange={(e) => { setEmailFilter(e.target.value); setPage(0) }}
        >
          <option value="">Correo: todos</option>
          <option value="unchecked">Correo: sin validar</option>
          <option value="valid">Correo: válido</option>
          <option value="invalid">Correo: inválido</option>
          <option value="accept_all">Correo: accept all</option>
          <option value="unknown">Correo: desconocido</option>
        </select>
        <select
          value={debtFilter}
          onChange={(e) => { setDebtFilter(e.target.value); setPage(0) }}
        >
          <option value="">Deuda: todos</option>
          <option value="unchecked">Deuda: sin validar</option>
          <option value="has_debt">Deuda: con deuda</option>
          <option value="no_debt">Deuda: sin deuda</option>
        </select>
      </div>

      {message && <div className="prospects-message">{message}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <div className="prospects-table-wrap">
            <table className="prospects-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Rubro</th>
                  <th>Comuna / Región</th>
                  <th>Email</th>
                  <th>Deuda</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="business-name">{p.business_name}</div>
                      <div className="rut">RUT {p.rut}-{p.dv}</div>
                      <button className="edit-prospect-btn" onClick={() => openEditProspect(p)}>✎ Editar</button>
                    </td>
                    <td className="rubro-cell">{p.rubro}</td>
                    <td>{p.comuna}<br /><span className="region-text">{p.region}</span></td>
                    <td className="email-cell">
                      <div>{p.email || <span className="no-email">Sin correo</span>}</div>
                      {(!p.email || (p.email_checked_at && p.email_result !== 'valid')) && (
                        <div className="online-search-block">
                          <button
                            className="search-online-btn"
                            disabled={searchingOnlineId === p.id}
                            onClick={() => searchOnline(p)}
                            title="Buscar correo actualizado automáticamente en internet"
                          >
                            {searchingOnlineId === p.id ? 'Buscando...' : '🔍 Buscar en Internet'}
                          </button>
                          {onlineResults[p.id] && (
                            <div className="online-summary">
                              {onlineResults[p.id].email ? (
                                <div className="online-result-found">
                                  <span className="online-found-email">{onlineResults[p.id].email}</span>
                                  <button
                                    className="apply-online-email-btn"
                                    onClick={() => applyOnlineEmail(p, onlineResults[p.id].email)}
                                  >
                                    ✓ Usar este correo
                                  </button>
                                </div>
                              ) : (
                                <div className="online-result-empty">
                                  Sin correo con coincidencia clara.{' '}
                                  <a href={onlineResults[p.id].searchUrl} target="_blank" rel="noopener noreferrer">
                                    Buscar manualmente
                                  </a>
                                </div>
                              )}

                              {onlineResults[p.id].phone && (
                                <div className="online-extra-info">
                                  📞 <span>{onlineResults[p.id].phone}</span>
                                </div>
                              )}

                              {onlineResults[p.id].website && (
                                <div className="online-extra-info">
                                  🌐{' '}
                                  <a href={onlineResults[p.id].website} target="_blank" rel="noopener noreferrer">
                                    {onlineResults[p.id].website}
                                  </a>
                                </div>
                              )}

                              <button
                                className="toggle-online-details-btn"
                                onClick={() => setExpandedOnlineId(p.id)}
                              >
                                {`▤ Ver resumen completo (${onlineResults[p.id].resultsChecked} resultados)`}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {p.email && (
                        !p.email_checked_at ? (
                          <button
                            className="check-email-btn"
                            disabled={checkingEmailId === p.id}
                            onClick={() => checkEmail(p)}
                          >
                            {checkingEmailId === p.id ? 'Validando...' : 'Validar Correo'}
                          </button>
                        ) : (
                          <div className="email-result">
                            <span
                              className={`email-badge ${
                                p.email_accept_all
                                  ? 'email-warning'
                                  : p.email_result === 'valid'
                                  ? 'email-ok'
                                  : p.email_result === 'unknown'
                                  ? 'email-unknown'
                                  : 'email-bad'
                              }`}
                              title={
                                (p.email_reason ? `Motivo: ${p.email_reason}. ` : '') +
                                (p.email_accept_all ? 'El dominio acepta cualquier correo, no se puede confirmar si existe realmente. ' : '') +
                                (p.email_safe_to_send ? 'Seguro para enviar.' : 'No recomendado para envío masivo.')
                              }
                            >
                              {p.email_accept_all
                                ? '! Accept All'
                                : p.email_result === 'valid'
                                ? '✓ Válido'
                                : p.email_result === 'unknown'
                                ? '? Desconocido'
                                : '✕ Inválido'}
                            </span>
                            <button
                              className="recheck-btn"
                              disabled={checkingEmailId === p.id}
                              onClick={() => checkEmail(p)}
                              title="Volver a validar"
                            >
                              {checkingEmailId === p.id ? '...' : '↻'}
                            </button>
                          </div>
                        )
                      )}
                    </td>
                    <td>
                      {!p.debt_checked_at ? (
                        <button
                          className="check-debt-btn"
                          disabled={checkingId === p.id}
                          onClick={() => checkDebt(p)}
                        >
                          {checkingId === p.id ? 'Validando...' : 'Validar Deuda'}
                        </button>
                      ) : (
                        <div className="debt-result">
                          {p.has_debt ? (
                            <button className="debt-badge debt-yes" onClick={() => setDetailProspect(p)}>
                              ⚠ {p.debt_count} moras
                            </button>
                          ) : (
                            <span className="debt-badge debt-no">✓ Sin deuda</span>
                          )}
                          <button
                            className="recheck-btn"
                            disabled={checkingId === p.id}
                            onClick={() => checkDebt(p)}
                            title="Volver a validar"
                          >
                            {checkingId === p.id ? '...' : '↻'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <select
                        className={`status-select status-${p.status.toLowerCase().replace(/\s/g, '-')}`}
                        value={p.status}
                        onChange={(e) => updateStatus(p.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {p.status !== 'Convertido' && (
                        <button className="convert-btn" onClick={() => convertToClient(p)}>
                          + Cliente
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
            <span>Página {page + 1} de {totalPages.toLocaleString('es-CL')}</span>
            <button disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
          </div>
        </>
      )}

      {editProspect && editForm && (
        <div
          className="debt-modal-overlay"
          onMouseDown={handleOverlayMouseDown}
          onMouseUp={(e) => handleOverlayMouseUp(e, closeEditProspect)}
        >
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="debt-modal-header">
              <h3>Editar Prospecto</h3>
              <button onClick={closeEditProspect}>×</button>
            </div>
            <form onSubmit={saveEditProspect} className="edit-prospect-form">
              <label>
                Nombre / Razón social
                <input
                  type="text"
                  value={editForm.business_name}
                  onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </label>
              <label>
                Comuna
                <input
                  type="text"
                  value={editForm.comuna}
                  onChange={(e) => setEditForm({ ...editForm, comuna: e.target.value })}
                />
              </label>
              <label>
                Región
                <input
                  type="text"
                  value={editForm.region}
                  onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                />
              </label>
              <label>
                Dirección
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </label>
              {editForm.email.trim() !== (editProspect.email || '') && (
                <div className="edit-hint">El correo cambió — se borrará el resultado de validación anterior.</div>
              )}
              {editError && <div className="form-error">{editError}</div>}
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeEditProspect}>Cancelar</button>
                <button type="submit" disabled={savingEdit}>{savingEdit ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailProspect && (
        <div
          className="debt-modal-overlay"
          onMouseDown={handleOverlayMouseDown}
          onMouseUp={(e) => handleOverlayMouseUp(e, () => setDetailProspect(null))}
        >
          <div className="debt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="debt-modal-header">
              <h3>{detailProspect.business_name}</h3>
              <button onClick={() => setDetailProspect(null)}>×</button>
            </div>
            <p className="debt-modal-subtitle">
              {detailProspect.debt_count} posibles moras previsionales encontradas
            </p>
            <div className="debt-modal-table-wrap">
              <table className="debt-detail-table">
                <thead>
                  <tr>
                    <th>Afiliado</th>
                    <th>Producto</th>
                    <th>AFP/AFC</th>
                    <th>Período</th>
                    <th>Contacto Previred</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailProspect.debt_records || []).map((r, i) => (
                    <tr key={i}>
                      <td>{r.nombreAfiliado}</td>
                      <td>{r.tipoProducto}</td>
                      <td>{r.afpAfc}</td>
                      <td>{r.periodo}</td>
                      <td>
                        {r.contacto}<br />
                        <span className="contact-detail">{r.telefonoContacto} · {r.correoContacto}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {expandedOnlineId && onlineResults[expandedOnlineId] && (
        <div
          className="debt-modal-overlay"
          onMouseDown={handleOverlayMouseDown}
          onMouseUp={(e) => handleOverlayMouseUp(e, () => setExpandedOnlineId(null))}
        >
          <div className="debt-modal online-summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="debt-modal-header">
              <h3>
                {(prospects.find((pr) => pr.id === expandedOnlineId) || {}).business_name || 'Resumen de búsqueda'}
              </h3>
              <button onClick={() => setExpandedOnlineId(null)}>×</button>
            </div>
            <p className="debt-modal-subtitle">
              {onlineResults[expandedOnlineId].resultsChecked} resultados encontrados en internet
            </p>

            <div className="online-summary-highlights">
              <div className="online-summary-field">
                <span className="online-summary-label">Correo</span>
                {onlineResults[expandedOnlineId].email ? (
                  <div className="online-summary-value-row">
                    <span>{onlineResults[expandedOnlineId].email}</span>
                    <button
                      className="apply-online-email-btn"
                      onClick={() => {
                        const prospect = prospects.find((pr) => pr.id === expandedOnlineId)
                        if (prospect) applyOnlineEmail(prospect, onlineResults[expandedOnlineId].email)
                        setExpandedOnlineId(null)
                      }}
                    >
                      ✓ Usar este correo
                    </button>
                  </div>
                ) : (
                  <span className="online-summary-empty">Sin coincidencia clara</span>
                )}
              </div>

              <div className="online-summary-field">
                <span className="online-summary-label">Teléfono</span>
                {onlineResults[expandedOnlineId].phone ? (
                  <span>{onlineResults[expandedOnlineId].phone}</span>
                ) : (
                  <span className="online-summary-empty">No encontrado</span>
                )}
              </div>

              <div className="online-summary-field">
                <span className="online-summary-label">Sitio web</span>
                {onlineResults[expandedOnlineId].website ? (
                  <a href={onlineResults[expandedOnlineId].website} target="_blank" rel="noopener noreferrer">
                    {onlineResults[expandedOnlineId].website}
                  </a>
                ) : (
                  <span className="online-summary-empty">No encontrado</span>
                )}
              </div>
            </div>

            <div className="online-summary-divider" />

            <div className="online-modal-results-wrap">
              {onlineResults[expandedOnlineId].results.length === 0 && (
                <p className="online-result-item-empty">Sin resultados.</p>
              )}
              {onlineResults[expandedOnlineId].results.map((item, idx) => (
                <div key={idx} className="online-result-card">
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    {item.title || item.link}
                  </a>
                  {item.snippet && <p>{item.snippet}</p>}
                  <span className="online-result-link">{item.link}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
