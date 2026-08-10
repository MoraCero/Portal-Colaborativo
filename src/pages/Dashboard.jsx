import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CollaboratorsList from '../components/CollaboratorsList'
import TasksList from '../components/TasksList'
import TeamCalendar from '../components/TeamCalendar'
import ClientsList from '../components/ClientsList'
import logo from '../assets/logo.png'
import './Dashboard.css'

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('tasks')
  const [collaborators, setCollaborators] = useState([])
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    loadCollaborators()
    loadTasks()
    loadClients()
  }, [])

  const loadCollaborators = async () => {
    const { data } = await supabase
      .from('collaborators')
      .select('*')
      .order('created_at', { ascending: false })
    setCollaborators(data || [])
    setLoading(false)
  }

  const loadTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    setClients(data || [])
  }

  const refreshData = () => {
    loadCollaborators()
    loadTasks()
    loadClients()
  }

  const currentCollaborator = collaborators.find((c) => c.email === user?.email)
  const isAdmin = currentCollaborator ? currentCollaborator.is_admin : true
  const canSeeClients = isAdmin || currentCollaborator?.role === 'Ejecutivo Comercial - Online'

  const visibleClients = isAdmin
    ? clients
    : clients.filter((c) => c.created_by === currentCollaborator?.id)

  const visibleTasks = isAdmin
    ? tasks
    : tasks.filter(
        (t) => t.assigned_to === currentCollaborator?.id || t.created_by === currentCollaborator?.id
      )

  const taskStats = {
    pending: visibleTasks.filter(t => t.status === 'pending').length,
    in_progress: visibleTasks.filter(t => t.status === 'in_progress').length,
    completed: visibleTasks.filter(t => t.status === 'completed').length,
  }

  const reportStats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }

  return (
    <div className="dashboard">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img src={logo} alt="Mora Cero" className="logo-img" />
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <span className="icon">📋</span>
            <span className="label">Tareas</span>
            {taskStats.pending > 0 && <span className="badge">{taskStats.pending}</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'collaborators' ? 'active' : ''}`}
            onClick={() => setActiveTab('collaborators')}
          >
            <span className="icon">👥</span>
            <span className="label">Colaboradores</span>
            <span className="badge">{collaborators.length}</span>
          </button>

          {isAdmin && (
            <button
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <span className="icon">📊</span>
              <span className="label">Reportes</span>
            </button>
          )}

          {canSeeClients && (
            <button
              className={`nav-item ${activeTab === 'clients' ? 'active' : ''}`}
              onClick={() => setActiveTab('clients')}
            >
              <span className="icon">🗂️</span>
              <span className="label">Base de Clientes</span>
              <span className="badge">{visibleClients.length}</span>
            </button>
          )}

          <button
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <span className="icon">💬</span>
            <span className="label">Chat</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <span className="icon">📅</span>
            <span className="label">Calendario</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="icon">⚙️</span>
            <span className="label">Configuración</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">👤</div>
            <div className="user-details">
              <div className="user-name">{currentCollaborator?.name || user?.email?.split('@')[0]}</div>
              <div className="user-role">{isAdmin ? 'Administrador' : (currentCollaborator?.role || 'Colaborador')}</div>
            </div>
          </div>
          <button onClick={onLogout} className="btn-logout">
            Salir
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>
              {activeTab === 'tasks' && '📋 Tareas'}
              {activeTab === 'collaborators' && '👥 Colaboradores'}
              {activeTab === 'reports' && '📊 Reportes'}
              {activeTab === 'clients' && '🗂️ Base de Clientes'}
              {activeTab === 'chat' && '💬 Chat'}
              {activeTab === 'calendar' && '📅 Calendario'}
              {activeTab === 'settings' && '⚙️ Configuración'}
            </h1>
          </div>
          <div className="header-right">
            <div className="search-bar">
              <input type="text" placeholder="Buscar..." />
              🔍
            </div>
          </div>
        </header>

        <div className="content-area">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Cargando...</p>
            </div>
          ) : (
            <>
              {activeTab === 'tasks' && (
                <TasksList
                  tasks={visibleTasks}
                  collaborators={collaborators}
                  onRefresh={refreshData}
                  isAdmin={isAdmin}
                  currentCollaboratorId={currentCollaborator?.id}
                />
              )}

              {activeTab === 'collaborators' && (
                <CollaboratorsList collaborators={collaborators} onRefresh={refreshData} isAdmin={isAdmin} />
              )}

              {activeTab === 'clients' && canSeeClients && (
                <ClientsList
                  clients={visibleClients}
                  onRefresh={refreshData}
                  currentCollaboratorId={currentCollaborator?.id}
                />
              )}

              {activeTab === 'reports' && isAdmin && (
                <div className="page-content">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-number">{collaborators.length}</div>
                      <div className="stat-label">Colaboradores</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{tasks.length}</div>
                      <div className="stat-label">Tareas Totales</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{reportStats.completed}</div>
                      <div className="stat-label">Completadas</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{reportStats.in_progress}</div>
                      <div className="stat-label">En Progreso</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="page-content">
                  <div className="coming-soon">
                    <p>🚀 Chat en desarrollo</p>
                  </div>
                </div>
              )}

              {activeTab === 'calendar' && (
                <TeamCalendar
                  collaborators={collaborators}
                  isAdmin={isAdmin}
                  currentCollaboratorId={currentCollaborator?.id}
                />
              )}

              {activeTab === 'settings' && (
                <div className="page-content">
                  <div className="coming-soon">
                    <p>🚀 Configuración en desarrollo</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
