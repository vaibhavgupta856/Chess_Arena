import { useEffect, useState } from 'react'
import type { BotLevel, CreateGameOptions, FriendChallenge, GameMode, UserProfile } from '../types'
import { BOT_LEVELS } from '../types'

type Props = {
  onCreate: (options: CreateGameOptions) => Promise<void>
  onJoin: (gameId: string) => Promise<void>
  error: string | null
  apiBase: string
  checkServerHealth: () => Promise<boolean>
  user: UserProfile | null
  tabLabel?: string
  challenges?: FriendChallenge[]
  requestCount?: number
  onAcceptChallenge?: (challengeId: string) => Promise<void>
  onDeclineChallenge?: (challengeId: string) => Promise<void>
  onOpenAuth: () => void
  onOpenProfile: () => void
  onOpenFriends: () => void
  onOpenLeaderboard: () => void
}

const MODE_META: Record<string, { icon: string; accent: string }> = {
  bot: { icon: '🤖', accent: 'lobby-card--violet' },
  'bot-black': { icon: '♟️', accent: 'lobby-card--amber' },
  online: { icon: '🌐', accent: 'lobby-card--cyan' },
  local: { icon: '👥', accent: 'lobby-card--green' },
}

const FEATURES = [
  'Check & mate',
  'Castling',
  'En passant',
  'Draw offers',
  'Move history',
  '2D / 3D',
  'Coach hints',
  'Friend matches',
]

export function GameLobby({
  onCreate,
  onJoin,
  error,
  apiBase,
  checkServerHealth,
  user,
  tabLabel,
  challenges = [],
  requestCount = 0,
  onAcceptChallenge,
  onDeclineChallenge,
  onOpenAuth,
  onOpenProfile,
  onOpenFriends,
  onOpenLeaderboard,
}: Props) {
  const [joinId, setJoinId] = useState('')
  const [busy, setBusy] = useState(false)
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const [botLevel, setBotLevel] = useState<BotLevel>('casual')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!apiBase) {
        setServerOk(false)
        return
      }
      const ok = await checkServerHealth()
      if (!cancelled) setServerOk(ok)
    })()
    return () => {
      cancelled = true
    }
  }, [apiBase, checkServerHealth])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  const canPlay = serverOk === true
  const inboxCount = challenges.length + requestCount

  const modeCard = (
    key: string,
    mode: GameMode,
    title: string,
    desc: string,
    playAs?: 'white' | 'black',
    delayClass?: string,
  ) => {
    const meta = MODE_META[key] ?? MODE_META.bot
    const isBot = mode === 'bot'
    return (
      <button
        key={key}
        type="button"
        className={`lobby-card ${meta.accent} lobby-anim ${delayClass ?? ''}`}
        disabled={busy || !canPlay}
        onClick={() =>
          run(() => onCreate({ mode, playAs, botLevel: isBot ? botLevel : undefined }))
        }
      >
        <span className="lobby-card-icon" aria-hidden>
          {meta.icon}
        </span>
        <strong>{title}</strong>
        <span>{desc}</span>
        {isBot && (
          <span className="lobby-card-level">
            {BOT_LEVELS.find((l) => l.id === botLevel)?.label} (~
            {BOT_LEVELS.find((l) => l.id === botLevel)?.elo} ELO)
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="lobby">
      {challenges.length > 0 && (
        <section className="lobby-challenge-banner lobby-anim lobby-anim--delay-1" role="status">
          {challenges.map((c) => {
            const name = c.challengerDisplayName || c.challengerUsername || 'A friend'
            return (
              <div key={c.id} className="lobby-challenge-card">
                <div>
                  <strong>{name}</strong> challenged you to a match
                </div>
                <div className="draw-offer-buttons">
                  <button
                    type="button"
                    className="lobby-join-btn"
                    disabled={busy || !onAcceptChallenge}
                    onClick={() => run(async () => onAcceptChallenge?.(c.id))}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="sidebar-btn muted"
                    disabled={busy || !onDeclineChallenge}
                    onClick={() => run(async () => onDeclineChallenge?.(c.id))}
                  >
                    Decline
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      <nav className="lobby-nav lobby-panel lobby-anim lobby-anim--delay-1">
        {user ? (
          <>
            <span className="lobby-user-pill">
              {user.displayName} · {user.eloRating} ELO
              {tabLabel ? <span className="lobby-tab-label"> · tab {tabLabel}</span> : null}
            </span>
            <div className="lobby-nav-actions">
              <button type="button" className="sidebar-btn" onClick={onOpenProfile}>
                Profile
              </button>
              <button type="button" className="sidebar-btn lobby-nav-btn--badge" onClick={onOpenFriends}>
                Friends
                {inboxCount > 0 && <span className="lobby-inbox-badge">{inboxCount}</span>}
              </button>
              <button type="button" className="sidebar-btn" onClick={onOpenLeaderboard}>
                Leaderboard
              </button>
            </div>
          </>
        ) : (
          <div className="lobby-nav-actions">
            <button type="button" className="lobby-join-btn" onClick={onOpenAuth}>
              Sign in / Register
            </button>
            <button type="button" className="sidebar-btn" onClick={onOpenLeaderboard}>
              Leaderboard
            </button>
          </div>
        )}
      </nav>

      <section className="lobby-hero lobby-panel lobby-anim lobby-anim--delay-2">
        <div className="lobby-hero-badges">
          <span className="lobby-badge">2D &amp; 3D</span>
          <span className="lobby-badge">Online rooms</span>
          <span className="lobby-badge">Vs bot</span>
          <span className="lobby-badge">Coach</span>
        </div>
        <h2>Choose your battlefield</h2>
        <p>
          Instant procedural 3D pieces, adjustable bot strength, live multiplayer, and a built-in
          coach — pick a mode and play in seconds.
        </p>
      </section>

      <div
        className={`server-status lobby-panel lobby-anim lobby-anim--delay-3${serverOk === true ? ' server-status--ok' : serverOk === false ? ' server-status--bad' : ''}`}
      >
        <span className="server-status-dot" aria-hidden />
        {serverOk === null && <p>Checking chess server…</p>}
        {serverOk === true && <p>Server online — ready to play</p>}
        {serverOk === false && (
          <p>
            Server offline.
            {!apiBase
              ? ' Deploy the Go API and set VITE_API_BASE on Vercel.'
              : ' Free tier may need ~30s to wake — refresh shortly.'}
          </p>
        )}
      </div>

      <section className="lobby-section lobby-panel lobby-anim lobby-anim--delay-4">
        <h3 className="lobby-section-title">Bot strength</h3>
        <div className="bot-level-picker">
          {BOT_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              className={botLevel === level.id ? 'active' : ''}
              onClick={() => setBotLevel(level.id)}
            >
              <strong>{level.label}</strong>
              <span>~{level.elo} ELO</span>
            </button>
          ))}
        </div>
      </section>

      <section className="lobby-section lobby-anim lobby-anim--delay-5">
        <h3 className="lobby-section-title">Play now</h3>
        <div className="lobby-grid">
          {modeCard('bot', 'bot', 'Play vs Bot', 'Practice against the built-in engine.', 'white', 'lobby-anim--delay-5')}
          {modeCard('bot-black', 'bot', 'Bot as White', 'You play Black; the bot moves first.', 'black', 'lobby-anim--delay-6')}
          {modeCard('online', 'online', 'Online Room', 'Create a room and share the invite link.', undefined, 'lobby-anim--delay-7')}
          {modeCard('local', 'local', 'Hot Seat', 'Two players, one device — both colors.', undefined, 'lobby-anim--delay-8')}
        </div>
      </section>

      <section className="lobby-join lobby-panel lobby-anim lobby-anim--delay-8">
        <h3>Join a room</h3>
        <div className="lobby-join-row">
          <input
            type="text"
            placeholder="Paste room code…"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value.trim())}
            disabled={!canPlay}
          />
          <button
            type="button"
            className="lobby-join-btn"
            disabled={busy || !joinId || !canPlay}
            onClick={() => run(() => onJoin(joinId))}
          >
            Join
          </button>
        </div>
        <p className="lobby-hint">
          Same computer? Open a <strong>new tab</strong> to join as Black while the creator stays
          White.
        </p>
      </section>

      {error && <p className="error lobby-error lobby-panel lobby-anim">{error}</p>}
      {actionError && <p className="error lobby-error lobby-panel lobby-anim">{actionError}</p>}

      <section className="lobby-features lobby-panel lobby-anim lobby-anim--delay-9">
        <h3>What&apos;s included</h3>
        <ul className="lobby-feature-chips">
          {FEATURES.map((feature, i) => (
            <li key={feature} className={`lobby-chip-anim lobby-anim--delay-${Math.min(9 + i, 12)}`}>
              {feature}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
