import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import type { UserProfile } from '../types'

type Entry = {
  rank: number
  id: string
  username: string
  displayName: string
  eloRating: number
}

type Props = {
  onBack: () => void
  user: UserProfile | null
}

export function LeaderboardPage({ onBack, user }: Props) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const res = await apiFetch('/leaderboard')
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as { leaderboard: Entry[] }
        if (!cancelled) setEntries(data.leaderboard ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="leaderboard-page">
      <div className="lobby-panel">
        <h2>Leaderboard</h2>
        <p className="lobby-hint">Ratings from online matches between registered players.</p>
        {user && (
          <p className="lobby-user-pill">
            You: {user.displayName} · {user.eloRating} ELO
          </p>
        )}
        {loading && <p className="lobby-hint">Loading…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && entries.length === 0 && (
          <p className="lobby-hint">No rated players yet — create an account and play online.</p>
        )}
        {entries.length > 0 && (
          <ol className="leaderboard-list">
            {entries.map((e) => (
              <li key={e.id} className={user?.id === e.id ? 'is-you' : ''}>
                <span className="lb-rank">#{e.rank}</span>
                <span className="lb-name">
                  {e.displayName}
                  <small>@{e.username}</small>
                </span>
                <span className="lb-elo">{e.eloRating}</span>
              </li>
            ))}
          </ol>
        )}
        <button type="button" className="sidebar-btn muted" onClick={onBack}>
          Back to lobby
        </button>
      </div>
    </div>
  )
}
