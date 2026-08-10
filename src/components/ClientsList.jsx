import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './ClientsList.css'

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  status: 'Contactado',
  debt_amount: '',
  notes: '',
}

const STATUSES = ['Contactado', 'En Proceso', 'Negociación', 'Cerrado', 'Perdido']

export default function ClientsList({ clients, onRefresh, currentCollaboratorId }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [error, setError] = useState('')

  const openAddForm = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
    setShowForm(true)
  }

  const openEditForm = (client) => {
    setEditingId(client.id)
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      status: client.status,
      debt_amount: client.debt_amount ?? '',
      notes: client.notes || '',
    })
    setError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const payload = {
      ...formData,
      debt_amount: formData.debt_amount === '' ? null : Number(formData.debt_amount),
    }

    const { error: err } = editingId
      ? await supabase.from('clients').update(payload).eq('id', editingId)
      : await supabase.from('clients').insert([{ ...payload, created_by: currentCollaboratorId || null }])

    if (err) {
      setError(err.message)
      return
    }

    closeForm()
    onRefresh()
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este cliente?')) {
      await supabase.from('clients').delete().eq('id', id)
      onRefresh()
    }
  }

  const formatMoney = (n) => (n || n === 0 ? `$${Number(n).toLocaleString('es-CL')}` : '—')

  return (
    <div className="clients-list">
      <div className="list-header">
        <h2>Base de Clientes</h2>
        <button onClick={showForm ? closeForm : openAddForm} className="add-btn">
          {showForm ? 'Cerrar' : '+ Nuevo Cliente'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="client-form">
          <input
            type="text"
            placeholder="Nombre del cliente"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <input
            type="text"
            placeholder="Teléfono"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <input
            type="text"
            placeholder="Empresa"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Monto de deuda (CLP)"
            value={formData.debt_amount}
            onChange={(e) => setFormData({ ...formData, debt_amount: e.target.value })}
          />
          <textarea
            placeholder="Notas / observaciones"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={closeForm}>Cancelar</button>
            <button type="submit">{editingId ? 'Guardar cambios' : 'Guardar Cliente'}</button>
          </div>
        </form>
      )}

      <div className="clients-grid">
        {clients.map((client) => (
          <div key={client.id} className="client-card">
            <div className="card-header">
              <h3>{client.name}</h3>
              <button onClick={() => handleDelete(client.id)} className="delete-btn">×</button>
            </div>
            {client.company && <p className="client-company">{client.company}</p>}
            {client.email && <p className="client-detail">✉ {client.email}</p>}
            {client.phone && <p className="client-detail">☎ {client.phone}</p>}
            <div className="client-footer">
              <span className={`status-badge status-${client.status.toLowerCase().replace(/\s|í/g, m => m === ' ' ? '-' : 'i')}`}>
                {client.status}
              </span>
              <span className="debt-amount">{formatMoney(client.debt_amount)}</span>
            </div>
            {client.notes && <p className="client-notes">{client.notes}</p>}
            <button className="edit-btn" onClick={() => openEditForm(client)}>Editar</button>
          </div>
        ))}
      </div>

      {clients.length === 0 && !showForm && (
        <p className="empty-state">No hay clientes registrados. ¡Agrega el primero!</p>
      )}
    </div>
  )
}
