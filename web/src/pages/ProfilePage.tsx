import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

type Props = {
  onBack: () => void
}

export function ProfilePage({ onBack }: Props) {
  const { user, updateProfile, logout } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [msg, setMsg] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="lobby-panel">
        <p>Not signed in.</p>
        <button type="button" className="sidebar-btn" onClick={onBack}>
          Back
        </button>
      </div>
    )
  }

  const save = async () => {
    try {
      await updateProfile(displayName, avatarUrl)
      setMsg('Profile saved.')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <div className="profile-page">
      <div className="lobby-panel">
        <h2>Your profile</h2>
        <dl className="sidebar-meta profile-meta">
          <div>
            <dt>Username</dt>
            <dd>@{user.username}</dd>
          </div>
          <div>
            <dt>ELO</dt>
            <dd>{user.eloRating}</dd>
          </div>
        </dl>
        <label className="profile-field">
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="profile-field">
          Avatar URL
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
        </label>
        <button type="button" className="lobby-join-btn" onClick={save}>
          Save profile
        </button>
        {msg && <p className="lobby-hint">{msg}</p>}
        <button type="button" className="sidebar-btn danger" onClick={() => { logout(); onBack() }}>
          Sign out
        </button>
        <button type="button" className="sidebar-btn muted" onClick={onBack}>
          Back to lobby
        </button>
      </div>
    </div>
  )
}
