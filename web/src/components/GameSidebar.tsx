import { CoachPanel } from './CoachPanel'
import type { GameState } from '../types'
import { canPlayerMove } from '../hooks/useGame'

type Props = {
  game: GameState
  inviteLink: string | null
  viewPly: number
  atLivePosition: boolean
  onUndo: () => void
  onRedo: () => void
  onResign: (color?: 'white' | 'black') => void
  onOfferDraw: (color?: 'white' | 'black') => void
  onRespondDraw: (accept: boolean, color?: 'white' | 'black') => void
  onClaimDraw: (type: 'threefold_repetition' | 'fifty_move_rule') => void
  onLeave: () => void
  open?: boolean
  onClose?: () => void
}

function formatOutcome(game: GameState) {
  if (!game.over) {
    if (game.botThinking) return 'Bot is thinking…'
    if (game.waitingFor === 'black' && game.yourColor === 'white') {
      return 'You are White — share the invite link for Black to join'
    }
    if (game.waitingFor) return `Waiting for ${game.waitingFor}…`
    if (game.inCheck) return `${game.turn} to move — check!`
    return `${game.turn} to move`
  }
  if (game.termination && game.termination !== 'none') {
    return `${game.outcome} (${game.termination.replaceAll('_', ' ')})`
  }
  return game.outcome
}

function opponentColor(color: string) {
  return color === 'white' ? 'black' : 'white'
}

function formatDelta(n?: number) {
  if (!n) return '±0'
  return n > 0 ? `+${n}` : `${n}`
}

export function GameSidebar({
  game,
  inviteLink,
  viewPly,
  atLivePosition,
  onUndo,
  onRedo,
  onResign,
  onOfferDraw,
  onRespondDraw,
  onClaimDraw,
  onLeave,
  open = true,
  onClose,
}: Props) {
  const yourColor = game.yourColor || (game.mode === 'local' ? 'both' : '—')
  const canAct = canPlayerMove(game, atLivePosition)
  const maxPly = game.ply ?? (game.positionFens?.length ?? 1) - 1
  const drawPending = !!game.drawOfferBy
  const drawOfferedByOpponent =
    drawPending &&
    (game.mode === 'local' || (game.drawOfferBy !== game.yourColor && game.yourColor !== 'both'))

  const copyInvite = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
  }

  const movePairs: { num: number; white?: string; black?: string }[] = []
  const history = game.history ?? []
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: history[i]?.san,
      black: history[i + 1]?.san,
    })
  }

  const lastMove = history[history.length - 1]
  const respondColor =
    game.drawOfferBy && game.mode === 'local'
      ? (opponentColor(game.drawOfferBy) as 'white' | 'black')
      : undefined

  return (
    <aside className={`game-sidebar${open ? ' is-open' : ''}`}>
      <div className="sidebar-drawer-head">
        <h3>Game panel</h3>
        {onClose && (
          <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        )}
      </div>
      <div className="sidebar-section">
        <h3>Game</h3>
        <p className="sidebar-status">{formatOutcome(game)}</p>
        {game.over && game.mode === 'online' && (game.whiteEloDelta || game.blackEloDelta) ? (
          <p className="lobby-hint">
            Rating: White {formatDelta(game.whiteEloDelta)} · Black {formatDelta(game.blackEloDelta)}
          </p>
        ) : null}
        <dl className="sidebar-meta">
          <div>
            <dt>Room</dt>
            <dd>{game.id}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{game.mode ?? 'local'}</dd>
          </div>
          {game.mode === 'bot' && game.botElo && (
            <div>
              <dt>Bot ELO</dt>
              <dd>~{game.botElo}</dd>
            </div>
          )}
          <div>
            <dt>You</dt>
            <dd>{yourColor}</dd>
          </div>
        </dl>
      </div>

      <div className="sidebar-section history-nav">
        <h3>Time travel</h3>
        <div className="history-nav-row">
          <button
            type="button"
            className="icon-btn"
            title="Step back"
            onClick={onUndo}
            disabled={viewPly <= 0}
            aria-label="Undo view"
          >
            ←
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Step forward"
            onClick={onRedo}
            disabled={viewPly >= maxPly}
            aria-label="Redo view"
          >
            →
          </button>
          {!atLivePosition && <span className="live-hint">Viewing past position</span>}
        </div>
      </div>

      {inviteLink && (
        <div className="sidebar-section">
          <h3>Invite friend</h3>
          <p className="lobby-hint">Send this link — they join as black on their device.</p>
          <button type="button" className="sidebar-btn" onClick={copyInvite}>
            Copy invite link
          </button>
        </div>
      )}

      <CoachPanel game={game} />

      {!game.over && (
        <div className="sidebar-section sidebar-actions">
          <h3>Actions</h3>
          {drawOfferedByOpponent ? (
            <div className="draw-offer-banner">
              <p>
                {game.mode === 'local'
                  ? `${game.drawOfferBy} offers a draw`
                  : 'Opponent offers a draw'}
              </p>
              <div className="draw-offer-buttons">
                <button
                  type="button"
                  className="sidebar-btn"
                  onClick={() => onRespondDraw(true, respondColor)}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="sidebar-btn muted"
                  onClick={() => onRespondDraw(false, respondColor)}
                >
                  Decline
                </button>
              </div>
            </div>
          ) : (
            <>
              {game.mode === 'local' ? (
                <>
                  <button type="button" className="sidebar-btn" onClick={() => onOfferDraw('white')}>
                    White offers draw
                  </button>
                  <button type="button" className="sidebar-btn" onClick={() => onOfferDraw('black')}>
                    Black offers draw
                  </button>
                  <button type="button" className="sidebar-btn danger" onClick={() => onResign('white')}>
                    White resigns
                  </button>
                  <button type="button" className="sidebar-btn danger" onClick={() => onResign('black')}>
                    Black resigns
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="sidebar-btn" disabled={!canAct} onClick={() => onOfferDraw()}>
                    Offer draw
                  </button>
                  <button type="button" className="sidebar-btn danger" disabled={!canAct} onClick={() => onResign()}>
                    Resign
                  </button>
                </>
              )}
            </>
          )}
          {game.drawOfferBy && game.drawOfferBy === game.yourColor && (
            <p className="lobby-hint">Draw offer sent — waiting for response…</p>
          )}
          {game.claimableDraws?.includes('threefold_repetition') && (
            <button
              type="button"
              className="sidebar-btn"
              onClick={() => onClaimDraw('threefold_repetition')}
            >
              Claim threefold repetition
            </button>
          )}
          {game.claimableDraws?.includes('fifty_move_rule') && (
            <button
              type="button"
              className="sidebar-btn"
              onClick={() => onClaimDraw('fifty_move_rule')}
            >
              Claim fifty-move rule
            </button>
          )}
        </div>
      )}

      <div className="sidebar-section sidebar-moves">
        <h3>Moves</h3>
        {lastMove && (
          <p className="last-move">
            Last move: <strong>{lastMove.san}</strong>
          </p>
        )}
        {movePairs.length === 0 ? (
          <p className="lobby-hint">No moves yet.</p>
        ) : (
          <ol className="move-list">
            {movePairs.map((row) => (
              <li key={row.num}>
                <span className="move-num">{row.num}.</span>
                <span>{row.white}</span>
                <span>{row.black ?? '…'}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <button type="button" className="sidebar-btn muted leave-btn" onClick={onLeave}>
        Back to lobby
      </button>
    </aside>
  )
}
