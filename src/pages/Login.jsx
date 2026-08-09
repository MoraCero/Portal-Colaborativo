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

  const handleGoogleLogin = async () => {
    setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (err) setError(err.message)
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
              <span>o continúa con</span>
            </div>

            <button
              type="button"
              className="btn-google"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
              </svg>
              Continuar con Google
            </button>

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
