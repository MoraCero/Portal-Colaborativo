import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CollaboratorsList from '../components/CollaboratorsList'
import TasksList from '../components/TasksList'
import './Dashboard.css'

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('collaborators')
  const [collaborators, setCollaborators] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCollaborators()
    loadTasks()
  }, [])

  const loadCollaborators = async () => {
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setCollaborators(data || [])
    }
    setLoading(false)
  }

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assigned_to_user:collaborators(name), created_by_user:collaborators(name)')
      .order('created_at', { ascending: false })

    if (!error) {
      setTasks(data || [])
    }
  }

  const refreshData = () => {
    loadCollaborators()
    loadTasks()
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Portal de Colaboradores</h1>
          <p>Bienvenido, {user?.email}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">
          Salir
        </button>
      </header>

      <nav className="dashboard-nav">
        <button
          className={`nav-btn ${activeTab === 'collaborators' ? 'active' : ''}`}
          onClick={() => setActiveTab('collaborators')}
        >
          Colaboradores
        </button>
        <button
          className={`nav-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tareas
        </button>
      </nav>

      <main className="dashboard-content">
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <>
            {activeTab === 'collaborators' && (
              <CollaboratorsList collaborators={collaborators} onRefresh={refreshData} />
            )}
            {activeTab === 'tasks' && (
              <TasksList tasks={tasks} collaborators={collaborators} onRefresh={refreshData} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
