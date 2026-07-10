import './App.css'

import { useState } from 'react'

import { ChessBoard2D } from './components/ChessBoard2D'

import { ChessBoard3D } from './components/ChessBoard3D'

import { GameLobby } from './components/GameLobby'

import { GameSidebar } from './components/GameSidebar'
import { MobileGameBar } from './components/MobileGameBar'
import { ThemePicker } from './components/ThemePicker'
import { useTheme } from './hooks/useTheme'
import { getLobbyUiColors } from './lib/themes'

import { canPlayerMove, useGame } from './hooks/useGame'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/AuthPage'
import { ProfilePage } from './pages/ProfilePage'
import { FriendsPage } from './pages/FriendsPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import type { GameState } from './types'

type ViewMode = '2d' | '3d'
type LobbyView = 'play' | 'auth' | 'profile' | 'friends' | 'leaderboard'



function App() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const lobbyUi = getLobbyUiColors(theme.background)

  const {
    game,
    screen,
    error,
    inviteLink,
    createGame,
    joinGame,
    enterGame,
    submitMove,
    resign,
    offerDraw,
    respondDraw,
    claimDraw,
    leaveToLobby,
    viewPly,
    undoView,
    redoView,
    displayFen,
    atLivePosition,
    apiBase,
    checkServerHealth,
    clientId,
  } = useGame()

  const [view, setView] = useState<ViewMode>('3d')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lobbyView, setLobbyView] = useState<LobbyView>('play')

  const is3d = view === '3d' && screen === 'game'

  const canMove = game ? canPlayerMove(game, atLivePosition) : false



  if (screen === 'lobby') {
    return (
      <div
        className="app app--lobby"
        style={{
          background: theme.background,
          color: lobbyUi.text,
          ['--lobby-text' as string]: lobbyUi.text,
          ['--lobby-text-muted' as string]: lobbyUi.textMuted,
          ['--lobby-surface' as string]: lobbyUi.surface,
          ['--lobby-surface-hover' as string]: lobbyUi.surfaceHover,
          ['--lobby-border' as string]: lobbyUi.border,
          ['--lobby-input-bg' as string]: lobbyUi.inputBg,
          ['--lobby-input-border' as string]: lobbyUi.inputBorder,
          ['--lobby-glow' as string]: `${theme.tileDark}66`,
          ['--lobby-glow-2' as string]: `${theme.tileLight}55`,
          ['--lobby-accent' as string]: theme.highlightSelect,
        }}
      >
        <div className="lobby-bg-decor" aria-hidden />
        <header className="app-header lobby-header">
          <div className="lobby-brand">
            <span className="lobby-logo" aria-hidden>
              ♔
            </span>
            <div>
              <h1>ChessArena</h1>
              <p>Play chess online, vs bot, or locally — in 2D or 3D.</p>
            </div>
          </div>
          <ThemePicker />
        </header>

        <main className="lobby-container">
          {lobbyView === 'auth' && <AuthPage onDone={() => setLobbyView('play')} />}
          {lobbyView === 'profile' && <ProfilePage onBack={() => setLobbyView('play')} />}
          {lobbyView === 'friends' && (
            <FriendsPage
              onBack={() => setLobbyView('play')}
              onJoinGame={(g: GameState) => {
                enterGame(g, clientId)
                setLobbyView('play')
              }}
            />
          )}
          {lobbyView === 'leaderboard' && (
            <LeaderboardPage onBack={() => setLobbyView('play')} user={user} />
          )}
          {lobbyView === 'play' && (
            <GameLobby
              onCreate={createGame}
              onJoin={joinGame}
              error={error}
              apiBase={apiBase}
              checkServerHealth={checkServerHealth}
              user={user}
              onOpenAuth={() => setLobbyView('auth')}
              onOpenProfile={() => setLobbyView('profile')}
              onOpenFriends={() => setLobbyView('friends')}
              onOpenLeaderboard={() => setLobbyView('leaderboard')}
            />
          )}
        </main>

      </div>

    )

  }



  return (

    <div className={`app app--game${is3d ? ' app--fullscreen' : ''}`}>

      <header className="app-header">

        <h1>ChessArena</h1>

        <p>

          {game

            ? game.over

              ? `Game over — ${game.outcome}`

              : !atLivePosition

                ? `Reviewing move ${viewPly}`

                : game.botThinking
                  ? 'Bot is thinking…'
                  : game.waitingFor === 'black' && game.yourColor === 'white'
                  ? 'You are White — share invite link for opponent'
                  : game.waitingFor
                    ? `Waiting for opponent (${game.waitingFor})…`

                  : `${game.turn} to move${game.inCheck ? ' — check!' : ''}`

            : 'Loading…'}

        </p>

        <div className="view-toggle">
          <ThemePicker />
          <button

            type="button"

            className={view === '2d' ? 'active' : ''}

            onClick={() => setView('2d')}

          >

            2D

          </button>

          <button

            type="button"

            className={view === '3d' ? 'active' : ''}

            onClick={() => setView('3d')}

          >

            3D

          </button>

        </div>

        {error && <p className="error">{error}</p>}

      </header>

      <main className={`game-layout${is3d ? ' game-layout--fullscreen' : ''}`}>

        {game && (

          <>

            <div className={`board-container${is3d ? ' board-container--fullscreen' : ''}`}>

              {view === '2d' && (
                <div className="board-view board-view--2d">
                  <ChessBoard2D
                    game={game}
                    displayFen={displayFen}
                    canMove={canMove}
                    onMove={submitMove}
                  />
                </div>
              )}

              <div className={`board-view${view === '3d' ? ' board-view--fullscreen' : ' board-view--hidden'}`}>
                <ChessBoard3D
                  game={game}
                  displayFen={displayFen}
                  atLivePosition={atLivePosition}
                  canMove={canMove}
                  onMove={submitMove}
                />
              </div>

            </div>

            <button
              type="button"
              className={`sidebar-backdrop${sidebarOpen ? ' is-open' : ''}`}
              aria-label="Close menu"
              onClick={() => setSidebarOpen(false)}
            />

            <GameSidebar

              game={game}

              inviteLink={inviteLink}

              viewPly={viewPly}

              atLivePosition={atLivePosition}

              onUndo={undoView}

              onRedo={redoView}

              onResign={resign}

              onOfferDraw={offerDraw}

              onRespondDraw={respondDraw}

              onClaimDraw={claimDraw}

              onLeave={leaveToLobby}

              open={sidebarOpen}

              onClose={() => setSidebarOpen(false)}

            />

            <MobileGameBar
              game={game}
              atLivePosition={atLivePosition}
              viewPly={viewPly}
              onUndo={undoView}
              onRedo={redoView}
              onOpenMenu={() => setSidebarOpen(true)}
            />

          </>

        )}

      </main>

    </div>

  )

}



export default App

