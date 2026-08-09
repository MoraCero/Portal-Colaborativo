import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Login.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async (e, signUp = false) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: err } = signUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

      if (err) throw err

      if (signUp) {
        setError('✓ Revisa tu email para confirmar tu cuenta')
        setEmail('')
        setPassword('')
      } else {
        onLogin(data.user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-gradient"></div>

      <div className="login-content">
        <div className="login-left">
          <div className="login-hero">
            <h1>MORA CERO</h1>
            <p>Gestiona tu equipo de forma inteligente y profesional</p>
            <div className="features">
              <div className="feature">✓ Gestión de tareas</div>
              <div className="feature">✓ Análisis en tiempo real</div>
              <div className="feature">✓ Comunicación integrada</div>
              <div className="feature">✓ Reportes avanzados</div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-card">
            <div className="login-header">
              <h2>{isSignUp ? 'Crear Cuenta' : 'Bienvenido'}</h2>
              <p>{isSignUp ? 'Únete a tu equipo' : 'Accede a tu plataforma'}</p>
            </div>

            <form onSubmit={(e) => handleAuth(e, isSignUp)}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <div className={`alert ${error.includes('✓') ? 'success' : 'error'}`}>{error}</div>}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Procesando...' : isSignUp ? 'Crear Cuenta' : 'Ingresar'}
              </button>
            </form>

            <div className="login-divider">
              <span>{isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}</span>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
              }}
              disabled={loading}
            >
              {isSignUp ? 'Ingresar' : 'Crear Cuenta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
