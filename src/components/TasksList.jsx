import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './TasksList.css'

export default function TasksList({ tasks, collaborators, onRefresh, isAdmin, currentCollaboratorId }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    status: 'pending',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('tasks')
      .insert([
        {
          ...formData,
          assigned_to: formData.assigned_to || null,
          created_by: currentCollaboratorId || null,
        },
      ])

    if (!error) {
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        status: 'pending',
      })
      setShowForm(false)
      onRefresh()
    }
  }

  const updateStatus = async (id, newStatus) => {
    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', id)
    onRefresh()
  }

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro?')) {
      await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
      onRefresh()
    }
  }

  const getCollaboratorName = (id) => {
    const collab = collaborators.find((c) => c.id === id)
    return collab ? collab.name : 'Sin asignar'
  }

  const tasksByStatus = {
    pending: tasks.filter((t) => t.status === 'pending'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  }

  return (
    <div className="tasks-list">
      <div className="list-header">
        <h2>Tareas</h2>
        <button onClick={() => setShowForm(!showForm)} className="add-btn">
          + Nueva Tarea
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="task-form">
          <input
            type="text"
            placeholder="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows="3"
          />
          <select
            value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
          >
            <option value="">Asignar a...</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit">Crear Tarea</button>
          <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
            Cancelar
          </button>
        </form>
      )}

      <div className="kanban-board">
        {['pending', 'in_progress', 'completed'].map((status) => (
          <div key={status} className="kanban-column">
            <h3 className={`column-title status-${status}`}>
              {status === 'pending' && 'Pendiente'}
              {status === 'in_progress' && 'En Progreso'}
              {status === 'completed' && 'Completado'}
            </h3>
            <div className="tasks-column">
              {tasksByStatus[status].map((task) => (
                <div key={task.id} className={`task-card status-${status}`}>
                  <div className="task-header">
                    <h4>{task.title}</h4>
                    {(isAdmin || task.created_by === currentCollaboratorId) && (
                      <button onClick={() => handleDelete(task.id)} className="delete-btn">
                        ×
                      </button>
                    )}
                  </div>
                  {task.description && <p className="task-desc">{task.description}</p>}
                  <p className="task-assigned">
                    Asignado a: <strong>{getCollaboratorName(task.assigned_to)}</strong>
                  </p>
                  <div className="task-actions">
                    {status !== 'pending' && (
                      <button onClick={() => updateStatus(task.id, 'pending')} className="action-btn">
                        ← Pendiente
                      </button>
                    )}
                    {status !== 'in_progress' && (
                      <button onClick={() => updateStatus(task.id, 'in_progress')} className="action-btn">
                        → En Progreso
                      </button>
                    )}
                    {status !== 'completed' && (
                      <button onClick={() => updateStatus(task.id, 'completed')} className="action-btn">
                        ✓ Completado
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {tasksByStatus[status].length === 0 && (
                <p className="empty-column">Sin tareas</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
