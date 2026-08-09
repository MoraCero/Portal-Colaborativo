import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './CollaboratorsList.css'

export default function CollaboratorsList({ collaborators, onRefresh, isAdmin }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    is_admin: false,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('collaborators')
      .insert([formData])

    if (!error) {
      setFormData({ name: '', email: '', role: '', is_admin: false })
      setShowForm(false)
      onRefresh()
    }
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
          <button onClick={() => setShowForm(!showForm)} className="add-btn">
            + Agregar
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
          <button type="submit">Guardar</button>
          <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
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
              <button className="toggle-admin-btn" onClick={() => toggleAdmin(collab)}>
                {collab.is_admin ? 'Quitar admin' : 'Hacer admin'}
              </button>
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
