import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './DocumentsList.css'

const emptyForm = { title: '', category: 'Primer Correo', content: '', file_url: '' }
const CATEGORIES = ['Primer Correo', 'Segundo Correo', 'Seguimiento', 'Documento', 'Otro']

export default function DocumentsList({ documents, onRefresh, currentCollaboratorId }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const openAddForm = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
    setShowForm(true)
  }

  const openEditForm = (doc) => {
    setEditingId(doc.id)
    setFormData({
      title: doc.title,
      category: doc.category || 'Otro',
      content: doc.content || '',
      file_url: doc.file_url || '',
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
      ? await supabase.from('documents').update(formData).eq('id', editingId)
      : await supabase.from('documents').insert([{ ...formData, created_by: currentCollaboratorId || null }])

    if (err) {
      setError(err.message)
      return
    }

    closeForm()
    onRefresh()
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este documento?')) {
      await supabase.from('documents').delete().eq('id', id)
      onRefresh()
    }
  }

  const copyContent = async (doc) => {
    await navigator.clipboard.writeText(doc.content || '')
    setCopiedId(doc.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredDocs = categoryFilter
    ? documents.filter((d) => d.category === categoryFilter)
    : documents

  return (
    <div className="documents-list">
      <div className="list-header">
        <h2>Formatos y Documentos</h2>
        <button onClick={showForm ? closeForm : openAddForm} className="add-btn">
          {showForm ? 'Cerrar' : '+ Nuevo Documento'}
        </button>
      </div>

      <div className="documents-toolbar">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="document-form">
          <input
            type="text"
            placeholder="Título (ej: Primer correo - Presentación)"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <textarea
            placeholder="Contenido del formato / plantilla de correo..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows="8"
          />
          <input
            type="text"
            placeholder="Link a documento externo (opcional)"
            value={formData.file_url}
            onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
          />
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={closeForm}>Cancelar</button>
            <button type="submit">{editingId ? 'Guardar cambios' : 'Guardar Documento'}</button>
          </div>
        </form>
      )}

      <div className="documents-grid">
        {filteredDocs.map((doc) => (
          <div key={doc.id} className="document-card">
            <div className="card-header">
              <span className="category-badge">{doc.category}</span>
              <button onClick={() => handleDelete(doc.id)} className="delete-btn">×</button>
            </div>
            <h3>{doc.title}</h3>
            {doc.content && <p className="document-preview">{doc.content}</p>}
            {doc.file_url && (
              <a href={doc.file_url} target="_blank" rel="noreferrer" className="file-link">
                🔗 Ver documento adjunto
              </a>
            )}
            <div className="document-actions">
              {doc.content && (
                <button className="copy-btn" onClick={() => copyContent(doc)}>
                  {copiedId === doc.id ? '✓ Copiado' : '📋 Copiar'}
                </button>
              )}
              <button className="edit-btn" onClick={() => openEditForm(doc)}>Editar</button>
            </div>
          </div>
        ))}
      </div>

      {filteredDocs.length === 0 && !showForm && (
        <p className="empty-state">No hay documentos aún. ¡Agrega el primero!</p>
      )}
    </div>
  )
}
