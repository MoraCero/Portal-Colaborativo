import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './TeamCalendar.css'

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateKey(date) {
  return date.toISOString().split('T')[0]
}

export default function TeamCalendar({ collaborators }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: formatDateKey(new Date()),
    start_time: '09:00',
    end_time: '10:00',
    collaborator_id: '',
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => {
    loadEvents()
  }, [weekStart])

  const loadEvents = async () => {
    setLoading(true)
    const start = formatDateKey(weekStart)
    const end = formatDateKey(weekDays[6])
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('event_date', start)
      .lte('event_date', end)
      .order('start_time', { ascending: true })
    setEvents(data || [])
    setLoading(false)
  }

  const getAccessToken = async () => {
    const res = await fetch('/api/calendar-token')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo conectar con Google Calendar')
    return data.access_token
  }

  const syncToGoogle = async (event) => {
    const accessToken = await getAccessToken()
    const collaborator = collaborators.find((c) => c.id === Number(event.collaborator_id))

    const body = {
      summary: collaborator ? `${event.title} — ${collaborator.name}` : event.title,
      description: event.description || '',
      start: { dateTime: `${event.event_date}T${event.start_time || '09:00'}:00`, timeZone: 'America/Santiago' },
      end: { dateTime: `${event.event_date}T${event.end_time || '10:00'}:00`, timeZone: 'America/Santiago' },
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'Error al crear evento en Google Calendar')
    return data.id
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSyncing(true)
    setSyncError('')

    try {
      const { data: inserted, error } = await supabase
        .from('calendar_events')
        .insert([{ ...formData, collaborator_id: formData.collaborator_id || null }])
        .select()
        .single()

      if (error) throw error

      try {
        const googleEventId = await syncToGoogle(inserted)
        await supabase
          .from('calendar_events')
          .update({ google_event_id: googleEventId })
          .eq('id', inserted.id)
      } catch (googleErr) {
        setSyncError('El evento se guardó, pero no se pudo sincronizar con Google Calendar: ' + googleErr.message)
      }

      setFormData({
        title: '',
        description: '',
        event_date: formatDateKey(new Date()),
        start_time: '09:00',
        end_time: '10:00',
        collaborator_id: '',
      })
      setShowForm(false)
      loadEvents()
    } catch (err) {
      setSyncError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return
    await supabase.from('calendar_events').delete().eq('id', id)
    loadEvents()
  }

  const getCollaboratorName = (id) => {
    const c = collaborators.find((c) => c.id === id)
    return c ? c.name : null
  }

  const eventsForDay = (date) => events.filter((e) => e.event_date === formatDateKey(date))

  const weekdayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  return (
    <div className="team-calendar">
      <div className="calendar-toolbar">
        <div className="week-nav">
          <button onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}>
            ← Semana anterior
          </button>
          <span className="week-label">
            {weekDays[0].toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} — {weekDays[6].toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
          </span>
          <button onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}>
            Semana siguiente →
          </button>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>+ Nuevo Evento</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="event-form">
          <input
            type="text"
            placeholder="Título del evento"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <select
            value={formData.collaborator_id}
            onChange={(e) => setFormData({ ...formData, collaborator_id: e.target.value })}
          >
            <option value="">Asignar a...</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={formData.event_date}
            onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
            required
          />
          <input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
          <input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          {syncError && <div className="sync-error">{syncError}</div>}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" disabled={syncing}>{syncing ? 'Guardando...' : 'Guardar y sincronizar'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Cargando calendario...</p>
      ) : (
        <div className="week-grid">
          {weekDays.map((day, i) => {
            const dayEvents = eventsForDay(day)
            const isToday = formatDateKey(day) === formatDateKey(new Date())
            return (
              <div key={i} className={`day-column ${isToday ? 'today' : ''}`}>
                <div className="day-header">
                  <span className="day-name">{weekdayNames[i]}</span>
                  <span className="day-number">{day.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <span className="day-count">{dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}</span>
                  )}
                </div>
                <div className="day-events">
                  {dayEvents.map((event) => (
                    <div key={event.id} className="event-card">
                      <div className="event-time">{event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}</div>
                      <div className="event-title">{event.title}</div>
                      {getCollaboratorName(event.collaborator_id) && (
                        <div className="event-collaborator">👤 {getCollaboratorName(event.collaborator_id)}</div>
                      )}
                      {event.google_event_id && <div className="event-synced">✓ Google Calendar</div>}
                      <button className="event-delete" onClick={() => handleDelete(event.id)}>×</button>
                    </div>
                  ))}
                  {dayEvents.length === 0 && <div className="day-empty">Sin eventos</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
