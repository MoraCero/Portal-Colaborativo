import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './CollaboratorsList.css'

export default function CollaboratorsList({ collaborators, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('collaborators')
      .insert([formData])

    if (!error) {
      setFormData({ name: '', email: '', role: '' })
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

  return (
    <div className="collaborators-list">
      <div className="list-header">
        <h2>Colaboradores</h2>
        <button onClick={() => setShowForm(!showForm)} className="add-btn">
          + Agregar
        </button>
      </div>

      {showForm && (
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
          <input
            type="text"
            placeholder="Rol"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            required
          />
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
              <button onClick={() => handleDelete(collab.id)} className="delete-btn">
                ×
              </button>
            </div>
            <p className="email">{collab.email}</p>
            <p className="role">{collab.role}</p>
          </div>
        ))}
      </div>

      {collaborators.length === 0 && !showForm && (
        <p className="empty-state">No hay colaboradores. ¡Agrega el primero!</p>
      )}
    </div>
  )
}
