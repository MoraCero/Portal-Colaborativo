import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './ProspectsList.css'

const PAGE_SIZE = 50
const STATUSES = ['Nuevo', 'Contactado', 'Sin respuesta', 'Convertido', 'Descartado']

export default function ProspectsList({ currentCollaboratorId, onClientConverted }) {
  const [prospects, setProspects] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [checkingId, setCheckingId] = useState(null)
  const [checkingEmailId, setCheckingEmailId] = useState(null)
  const [detailProspect, setDetailProspect] = useState(null)

  useEffect(() => {
    loadProspects()
  }, [page, search, statusFilter])

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
        email_checked_at: new Date().toISOString(),
      }

      await supabase.from('prospects').update(changes).eq('id', prospect.id)
      patchProspect(prospect.id, changes)
    } catch (err) {
      setMessage('Error: ' + err.message)
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setCheckingEmailId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="prospects-list">
      <div className="list-header">
        <h2>Prospectos <span className="total-count">({totalCount.toLocaleString('es-CL')})</span></h2>
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
                    </td>
                    <td className="rubro-cell">{p.rubro}</td>
                    <td>{p.comuna}<br /><span className="region-text">{p.region}</span></td>
                    <td className="email-cell">
                      <div>{p.email}</div>
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
                              className={`email-badge ${p.email_safe_to_send ? 'email-ok' : 'email-bad'}`}
                              title={p.email_reason || ''}
                            >
                              {p.email_safe_to_send ? '✓ Válido' : '✕ ' + (p.email_result || 'inválido')}
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

      {detailProspect && (
        <div className="debt-modal-overlay" onClick={() => setDetailProspect(null)}>
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
    </div>
  )
}
