import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './CollaboratorsList.css'

const emptyForm = { name: '', email: '', role: '', is_admin: false }

export default function CollaboratorsList({ collaborators, onRefresh, isAdmin }) {
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

  const openEditForm = (collab) => {
    setEditingId(collab.id)
    setFormData({
      name: collab.name,
      email: collab.email,
      role: collab.role,
      is_admin: collab.is_admin,
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

    const { error: err } = editingId
      ? await supabase.from('collaborators').update(formData).eq('id', editingId)
      : await supabase.from('collaborators').insert([formData])

    if (err) {
      setError(
        err.code === '23505'
          ? 'Ya existe un colaborador con ese email.'
          : err.message
      )
      return
    }

    closeForm()
    onRefresh()
  }

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro?')) {
      await supabase
        .from('collaborators')
        .delete()
        .eq('id', id)
      onRefresh()
    }
  }

  const toggleAdmin = async (collab) => {
    await supabase
      .from('collaborators')
      .update({ is_admin: !collab.is_admin })
      .eq('id', collab.id)
    onRefresh()
  }

  return (
    <div className="collaborators-list">
      <div className="list-header">
        <h2>Colaboradores</h2>
        {isAdmin && (
          <button onClick={showForm ? closeForm : openAddForm} className="add-btn">
            {showForm ? 'Cerrar' : '+ Agregar'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="collaborator-form">
          <input
            type="text"
            placeholder="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            required
          >
            <option value="">Selecciona un rol...</option>
            <option value="Ejecutivo Comercial - Terreno">Ejecutivo Comercial - Terreno</option>
            <option value="Ejecutivo Comercial - Online">Ejecutivo Comercial - Online</option>
            <option value="Consultor">Consultor</option>
          </select>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={formData.is_admin}
              onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
            />
            Es administrador
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit">{editingId ? 'Guardar cambios' : 'Guardar'}</button>
          <button type="button" onClick={closeForm} className="cancel-btn">
            Cancelar
          </button>
        </form>
      )}

      <div className="collaborators-grid">
        {collaborators.map((collab) => (
          <div key={collab.id} className="collaborator-card">
            <div className="card-header">
              <h3>{collab.name}</h3>
              {isAdmin && (
                <button onClick={() => handleDelete(collab.id)} className="delete-btn">
                  ×
                </button>
              )}
            </div>
            <p className="email">{collab.email}</p>
            <div className="role-row">
              <p className="role">{collab.role}</p>
              {collab.is_admin && <span className="admin-badge">Admin</span>}
            </div>
            {isAdmin && (
              <div className="card-actions">
                <button className="toggle-admin-btn" onClick={() => openEditForm(collab)}>
                  Editar
                </button>
                <button className="toggle-admin-btn" onClick={() => toggleAdmin(collab)}>
                  {collab.is_admin ? 'Quitar admin' : 'Hacer admin'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {collaborators.length === 0 && !showForm && (
        <p className="empty-state">No hay colaboradores. ¡Agrega el primero!</p>
      )}
    </div>
  )
}
