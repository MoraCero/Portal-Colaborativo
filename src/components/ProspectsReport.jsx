import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './ProspectsReport.css'

export default function ProspectsReport({ onClose }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [debtRows, setDebtRows] = useState([])

  useEffect(() => {
    loadReport()
  }, [])

  const count = async (build) => {
    let query = supabase.from('prospects').select('*', { count: 'exact', head: true })
    query = build(query)
    const { count: c } = await query
    return c || 0
  }

  const loadReport = async () => {
    setLoading(true)

    const [
      totalProspects,
      emailChecked,
      emailValid,
      emailInvalid,
      emailAcceptAll,
      emailUnknown,
      debtChecked,
      withDebt,
      withoutDebt,
      converted,
    ] = await Promise.all([
      count((q) => q),
      count((q) => q.not('email_checked_at', 'is', null)),
      count((q) => q.eq('email_result', 'valid').or('email_accept_all.is.null,email_accept_all.eq.false')),
      count((q) => q.eq('email_result', 'invalid')),
      count((q) => q.eq('email_accept_all', true)),
      count((q) => q.eq('email_result', 'unknown')),
      count((q) => q.not('debt_checked_at', 'is', null)),
      count((q) => q.eq('has_debt', true)),
      count((q) => q.eq('has_debt', false)),
      count((q) => q.eq('status', 'Convertido')),
    ])

    const { data: debtData } = await supabase
      .from('prospects')
      .select('id, business_name, rut, dv, comuna, region, debt_count, email, status')
      .eq('has_debt', true)
      .order('debt_count', { ascending: false })

    const totalMoras = (debtData || []).reduce((sum, r) => sum + (r.debt_count || 0), 0)

    setStats({
      totalProspects,
      emailChecked,
      emailValid,
      emailInvalid,
      emailAcceptAll,
      emailUnknown,
      debtChecked,
      withDebt,
      withoutDebt,
      converted,
      totalMoras,
    })
    setDebtRows(debtData || [])
    setLoading(false)
  }

  if (loading) return <p>Generando reporte...</p>

  return (
    <div className="prospects-report">
      <div className="report-header">
        <h2>📊 Reporte de Prospectos</h2>
        <button className="close-report-btn" onClick={onClose}>← Volver a la lista</button>
      </div>

      <div className="report-section">
        <h3>Resumen general</h3>
        <div className="report-grid">
          <div className="report-card">
            <div className="report-number">{stats.totalProspects.toLocaleString('es-CL')}</div>
            <div className="report-label">Prospectos totales</div>
          </div>
          <div className="report-card">
            <div className="report-number">{stats.converted.toLocaleString('es-CL')}</div>
            <div className="report-label">Convertidos a Cliente</div>
          </div>
          <div className="report-card highlight-red">
            <div className="report-number">{stats.totalMoras.toLocaleString('es-CL')}</div>
            <div className="report-label">Moras previsionales totales</div>
          </div>
          <div className="report-card">
            <div className="report-number">{stats.withDebt.toLocaleString('es-CL')}</div>
            <div className="report-label">Empresas con deuda</div>
          </div>
        </div>
      </div>

      <div className="report-section">
        <h3>Estado de correos validados ({stats.emailChecked.toLocaleString('es-CL')} de {stats.totalProspects.toLocaleString('es-CL')})</h3>
        <div className="report-grid">
          <div className="report-card card-ok">
            <div className="report-number">{stats.emailValid.toLocaleString('es-CL')}</div>
            <div className="report-label">✓ Válidos</div>
          </div>
          <div className="report-card card-bad">
            <div className="report-number">{stats.emailInvalid.toLocaleString('es-CL')}</div>
            <div className="report-label">✕ Inválidos</div>
          </div>
          <div className="report-card card-warning">
            <div className="report-number">{stats.emailAcceptAll.toLocaleString('es-CL')}</div>
            <div className="report-label">! Accept All</div>
          </div>
          <div className="report-card card-unknown">
            <div className="report-number">{stats.emailUnknown.toLocaleString('es-CL')}</div>
            <div className="report-label">? Desconocidos</div>
          </div>
        </div>
      </div>

      <div className="report-section">
        <h3>Estado de deuda validada ({stats.debtChecked.toLocaleString('es-CL')} de {stats.totalProspects.toLocaleString('es-CL')})</h3>
        <div className="report-grid">
          <div className="report-card card-bad">
            <div className="report-number">{stats.withDebt.toLocaleString('es-CL')}</div>
            <div className="report-label">⚠ Con deuda</div>
          </div>
          <div className="report-card card-ok">
            <div className="report-number">{stats.withoutDebt.toLocaleString('es-CL')}</div>
            <div className="report-label">✓ Sin deuda</div>
          </div>
        </div>
      </div>

      <div className="report-section">
        <h3>Detalle de empresas con deuda ({debtRows.length.toLocaleString('es-CL')})</h3>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>RUT</th>
                <th>Comuna / Región</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Moras</th>
              </tr>
            </thead>
            <tbody>
              {debtRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.business_name}</td>
                  <td>{r.rut}-{r.dv}</td>
                  <td>{r.comuna}<br /><span className="region-text">{r.region}</span></td>
                  <td>{r.email}</td>
                  <td>{r.status}</td>
                  <td className="moras-cell">{r.debt_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {debtRows.length === 0 && <p className="empty-report">Aún no hay empresas con deuda registrada.</p>}
        </div>
      </div>
    </div>
  )
}
