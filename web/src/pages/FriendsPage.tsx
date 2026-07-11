import { useEffect, useState } from 'react'
import { useFriends } from '../hooks/useSocial'
import type { GameState } from '../types'

type Props = {
  onBack: () => void
  onJoinGame: (game: GameState, asHost?: boolean) => void
}

export function FriendsPage({ onBack, onJoinGame }: Props) {
  const {
    friends,
    requests,
    challenges,
    searchResults,
    loading,
    loadFriends,
    searchUsers,
    sendRequest,
    respondRequest,
    challengeFriend,
    acceptChallenge,
    declineChallenge,
  } = useFriends()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    void loadFriends()
    const id = window.setInterval(() => {
      void loadFriends()
    }, 4000)
    return () => window.clearInterval(id)
  }, [loadFriends])

  const run = async (action: () => Promise<void>) => {
    setError(null)
    setStatus(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <div className="friends-page">
      <div className="lobby-panel">
        <h2>Friends</h2>
        <div className="lobby-join-row">
          <input
            placeholder="Search username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="lobby-join-btn" onClick={() => run(() => searchUsers(query))}>
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <section className="friends-section">
            <h3>Search results</h3>
            <ul className="friends-list">
              {searchResults.map((u) => (
                <li key={u.id}>
                  <span>
                    @{u.username} · {u.eloRating} ELO
                  </span>
                  <button type="button" className="sidebar-btn" onClick={() => run(() => sendRequest(u.id))}>
                    Add friend
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {requests.length > 0 && (
          <section className="friends-section">
            <h3>Friend requests</h3>
            <ul className="friends-list">
              {requests.map((r) => (
                <li key={r.id}>
                  <span>@{r.fromUsername}</span>
                  <div className="draw-offer-buttons">
                    <button type="button" className="sidebar-btn" onClick={() => run(() => respondRequest(r.id, true))}>
                      Accept
                    </button>
                    <button type="button" className="sidebar-btn muted" onClick={() => run(() => respondRequest(r.id, false))}>
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {challenges.length > 0 && (
          <section className="friends-section friends-section--alert">
            <h3>Incoming challenges</h3>
            <ul className="friends-list">
              {challenges.map((c) => {
                const name = c.challengerDisplayName || c.challengerUsername || 'A friend'
                return (
                  <li key={c.id}>
                    <span>
                      <strong>{name}</strong> challenged you
                    </span>
                    <div className="draw-offer-buttons">
                      <button
                        type="button"
                        className="sidebar-btn"
                        onClick={() =>
                          run(async () => {
                            const game = await acceptChallenge(c.id)
                            onJoinGame(game, false)
                          })
                        }
                      >
                        Accept &amp; play
                      </button>
                      <button
                        type="button"
                        className="sidebar-btn muted"
                        onClick={() => run(() => declineChallenge(c.id))}
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section className="friends-section">
          <h3>Your friends {loading ? '…' : `(${friends.length})`}</h3>
          {friends.length === 0 ? (
            <p className="lobby-hint">No friends yet — search for players above.</p>
          ) : (
            <ul className="friends-list">
              {friends.map((f) => (
                <li key={f.id}>
                  <span>
                    {f.displayName} (@{f.username}) · {f.eloRating} ELO
                  </span>
                  <button
                    type="button"
                    className="sidebar-btn"
                    onClick={() =>
                      run(async () => {
                        setStatus(`Challenging ${f.displayName}…`)
                        const { game } = await challengeFriend(f.id)
                        onJoinGame(game, true)
                      })
                    }
                  >
                    Challenge
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {status && <p className="lobby-hint">{status}</p>}
        {error && <p className="error">{error}</p>}
        <button type="button" className="sidebar-btn muted" onClick={onBack}>
          Back to lobby
        </button>
      </div>
    </div>
  )
}
