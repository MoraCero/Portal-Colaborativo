import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './DocumentsList.css'

const emptyForm = { title: '', category: 'Primer Correo', content: '', file_url: '' }
const CATEGORIES = ['Primer Correo', 'Segundo Correo', 'Seguimiento', 'Documento', 'Otro']
const CATEGORY_ICONS = {
  'Primer Correo': '✉️',
  'Segundo Correo': '📧',
  Seguimiento: '🔁',
  Documento: '📄',
  Otro: '🗂️',
}

function fileNameFromUrl(url) {
  try {
    const clean = decodeURIComponent(url.split('/').pop() || '')
    return clean.replace(/^\d+-/, '')
  } catch {
    return url
  }
}

function isSectionLabel(line) {
  const trimmed = line.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= 40 &&
    /[A-ZÁÉÍÓÚÑ]/.test(trimmed) &&
    trimmed === trimmed.toUpperCase() &&
    !/^https?:\/\//i.test(trimmed)
  )
}

function renderFormattedContent(content) {
  if (!content) return null
  return content.split('\n').map((line, i) => {
    const trimmed = line.trim()
    if (trimmed === '') return <div key={i} className="doc-line-break" />
    if (isSectionLabel(line)) return <div key={i} className="doc-section-label">{trimmed}</div>
    return <div key={i} className="doc-line">{line}</div>
  })
}

export default function DocumentsList({ documents, onRefresh, currentCollaboratorId }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')

  const openAddForm = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
    setPreviewMode(false)
    setUploadedFileName('')
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
    setPreviewMode(false)
    setUploadedFileName(doc.file_url ? decodeURIComponent(doc.file_url.split('/').pop()) : '')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
    setPreviewMode(false)
    setUploadedFileName('')
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('documents').getPublicUrl(path)
      setFormData((prev) => ({ ...prev, file_url: data.publicUrl }))
      setUploadedFileName(file.name)
    } catch (err) {
      setError('Error al subir el archivo: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeFile = () => {
    setFormData((prev) => ({ ...prev, file_url: '' }))
    setUploadedFileName('')
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
          <div className="content-editor">
            <div className="content-editor-tabs">
              <button
                type="button"
                className={`content-tab ${!previewMode ? 'active' : ''}`}
                onClick={() => setPreviewMode(false)}
              >
                ✏️ Editar
              </button>
              <button
                type="button"
                className={`content-tab ${previewMode ? 'active' : ''}`}
                onClick={() => setPreviewMode(true)}
              >
                👁️ Vista previa
              </button>
            </div>
            {previewMode ? (
              <div className="document-preview-live">
                {formData.content ? (
                  renderFormattedContent(formData.content)
                ) : (
                  <span className="document-preview-empty">Nada que previsualizar todavía.</span>
                )}
              </div>
            ) : (
              <textarea
                placeholder="Contenido del formato / plantilla de correo... (usa líneas en MAYÚSCULAS como encabezados, ej: ASUNTO SUGERIDO)"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows="10"
              />
            )}
          </div>
          <div className="file-attach-row">
            <label className={`file-upload-btn ${uploading ? 'disabled' : ''}`}>
              {uploading ? 'Subiendo...' : '📎 Subir archivo'}
              <input type="file" onChange={handleFileUpload} disabled={uploading} hidden />
            </label>
            <span className="file-attach-or">o pega un link:</span>
            <input
              type="text"
              placeholder="Link a documento externo (opcional)"
              value={uploadedFileName ? '' : formData.file_url}
              onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
              disabled={!!uploadedFileName}
            />
          </div>
          {uploadedFileName && (
            <div className="file-attached-preview">
              ✓ {uploadedFileName}
              <button type="button" onClick={removeFile}>Quitar</button>
            </div>
          )}
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={closeForm}>Cancelar</button>
            <button type="submit">{editingId ? 'Guardar cambios' : 'Guardar Documento'}</button>
          </div>
        </form>
      )}

      <div className="documents-grid">
        {filteredDocs.map((doc) => (
          <div key={doc.id} className={`document-card category-${(doc.category || 'Otro').replace(/\s+/g, '-')}`}>
            <div className="card-header">
              <span className="category-icon">{CATEGORY_ICONS[doc.category] || '🗂️'}</span>
              <span className="category-badge">{doc.category}</span>
              <button onClick={() => handleDelete(doc.id)} className="delete-btn" title="Eliminar">×</button>
            </div>
            <h3>{doc.title}</h3>
            {doc.content && (
              <div className="document-preview">{renderFormattedContent(doc.content)}</div>
            )}
            {doc.file_url && (
              <a href={doc.file_url} target="_blank" rel="noreferrer" className="file-chip">
                <span className="file-chip-icon">📎</span>
                <span className="file-chip-name">{fileNameFromUrl(doc.file_url)}</span>
                <span className="file-chip-arrow">↗</span>
              </a>
            )}
            <div className="document-actions">
              {doc.content && (
                <button className="copy-btn" onClick={() => copyContent(doc)}>
                  {copiedId === doc.id ? '✓ Copiado' : '📋 Copiar'}
                </button>
              )}
              <button className="edit-btn" onClick={() => openEditForm(doc)}>✎ Editar</button>
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
