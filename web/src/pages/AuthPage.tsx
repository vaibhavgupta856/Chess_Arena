import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

type Props = {
  onDone: () => void
}

export function AuthPage({ onDone }: Props) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') await login(username, password)
      else await register(username, password, displayName || username)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page lobby-panel">
      <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
      <p className="lobby-hint">
        Pick any username and password. Usernames must be unique — duplicates are rejected.
        Each browser tab keeps its own sign-in — open a new tab (don&apos;t use Duplicate) for a
        second account.
      </p>
      <div className="auth-form">
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        {mode === 'register' && (
          <input
            placeholder="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="button" className="lobby-join-btn" disabled={busy} onClick={submit}>
          {mode === 'login' ? 'Sign in' : 'Register'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <button type="button" className="sidebar-btn muted" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
      </button>
      <button type="button" className="sidebar-btn muted" onClick={onDone}>
        Back to lobby
      </button>
    </div>
  )
}
