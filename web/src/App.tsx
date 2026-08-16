import './App.css'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ChessBoard2D } from './components/ChessBoard2D'
import { ChessBoard3D } from './components/ChessBoard3D'
import { GameLobby } from './components/GameLobby'
import { GameSidebar } from './components/GameSidebar'
import { MobileGameBar } from './components/MobileGameBar'
import { ThemePicker } from './components/ThemePicker'
import { GameStatusOverlays } from './components/GameStatusOverlays'
import { ProductTour, useShouldAutoStartTour } from './components/ProductTour'
import { useTheme } from './hooks/useTheme'
import { getLobbyUiColors, getRoomAtmosphere } from './lib/themes'
import type { TourAction } from './lib/tutorial'

import { canPlayerMove, useGame } from './hooks/useGame'
import { useAuth } from './hooks/useAuth'
import { useFriends } from './hooks/useSocial'
import { AuthPage } from './pages/AuthPage'
import { ProfilePage } from './pages/ProfilePage'
import { FriendsPage } from './pages/FriendsPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import type { GameState } from './types'

type ViewMode = '2d' | '3d'
type LobbyView = 'play' | 'auth' | 'profile' | 'friends' | 'leaderboard'

function seatForGame(g: GameState, fallback: string): string {
  if (g.yourColor === 'white' && g.whitePlayer) return g.whitePlayer
  if (g.yourColor === 'black' && g.blackPlayer) return g.blackPlayer
  return fallback
}

function App() {
  const { theme } = useTheme()
  const { user, tabLabel } = useAuth()
  const lobbyUi = getLobbyUiColors(theme.background)
  const roomAtmosphere = getRoomAtmosphere(theme)
  const {
    challenges,
    requests,
    loadFriends,
    acceptChallenge,
    declineChallenge,
  } = useFriends()

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
  const [tourAutoStart, setTourAutoStart] = useShouldAutoStartTour()
  const [tourOpen, setTourOpen] = useState(true)
  const [tourIndex, setTourIndex] = useState(0)
  const [tourAutoRotate, setTourAutoRotate] = useState(false)
  const [tourShowCamera, setTourShowCamera] = useState(false)
  const screenRef = useRef(screen)
  const gameRef = useRef(game)
  const demoCreateLock = useRef<Promise<void> | null>(null)
  screenRef.current = screen
  gameRef.current = game

  const is3d = view === '3d' && screen === 'game'
  const canMove = game ? canPlayerMove(game, atLivePosition) : false
  const tourActive = tourOpen || tourAutoStart

  useEffect(() => {
    if (!user || screen !== 'lobby') return
    void loadFriends()
    const id = window.setInterval(() => {
      void loadFriends()
    }, 4000)
    return () => window.clearInterval(id)
  }, [user, screen, loadFriends])

  useEffect(() => {
    if (tourAutoStart) setTourOpen(true)
  }, [tourAutoStart])

  const joinFromSocial = useCallback(
    (g: GameState, asHost = false) => {
      enterGame(g, seatForGame(g, clientId), true, asHost)
      setLobbyView('play')
    },
    [clientId, enterGame],
  )

  const handleTourAction = useCallback(
    async (action: TourAction) => {
      switch (action) {
        case 'ensureLobbyPlay':
          setLobbyView('play')
          setSidebarOpen(false)
          setTourAutoRotate(false)
          setTourShowCamera(false)
          if (screenRef.current === 'game') leaveToLobby()
          break
        case 'startDemoGame': {
          setLobbyView('play')
          setView('3d')
          setSidebarOpen(false)
          setTourShowCamera(false)
          if (screenRef.current === 'game' && gameRef.current) break
          if (demoCreateLock.current) {
            await demoCreateLock.current
            break
          }
          const run = (async () => {
            if (screenRef.current === 'game' && gameRef.current) return
            const ok = await createGame({ mode: 'bot', playAs: 'white', botLevel: 'beginner' })
            if (!ok) {
              throw new Error(
                'Could not open the 3D practice room. Wait a moment for the chess server to wake, then tap Retry.',
              )
            }
          })()
          demoCreateLock.current = run.finally(() => {
            demoCreateLock.current = null
          })
          await demoCreateLock.current
          break
        }
        case 'ensure3d':
          setView('3d')
          break
        case 'openCamera':
          setView('3d')
          setTourShowCamera(true)
          setSidebarOpen(false)
          break
        case 'autoRotateOn':
          setView('3d')
          setTourAutoRotate(true)
          setTourShowCamera(false)
          setSidebarOpen(false)
          break
        case 'autoRotateOff':
          setTourAutoRotate(false)
          break
        case 'openSidebar':
          setTourAutoRotate(false)
          setTourShowCamera(false)
          setSidebarOpen(true)
          break
        case 'closeSidebar':
          setSidebarOpen(false)
          break
        default:
          break
      }
    },
    [createGame, leaveToLobby],
  )

  const closeTour = useCallback(() => {
    setTourOpen(false)
    setTourAutoStart(false)
    setTourAutoRotate(false)
    setTourShowCamera(false)
    setTourIndex(0)
  }, [setTourAutoStart])

  const startTour = useCallback(() => {
    setLobbyView('play')
    setTourIndex(0)
    setTourOpen(true)
  }, [])

  const tour = (
    <ProductTour
      active={tourActive}
      screen={screen}
      index={tourIndex}
      onIndexChange={setTourIndex}
      onClose={closeTour}
      onAction={handleTourAction}
    />
  )

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
          <div className="lobby-brand" data-tour="brand">
            <span className="lobby-logo" aria-hidden>
              ♔
            </span>
            <div>
              <p className="lobby-kicker">Live 3D chess</p>
              <h1>ChessArena</h1>
              <p className="lobby-tagline">Online rooms, bots, and hot seat — in a room you can orbit.</p>
            </div>
          </div>
          <ThemePicker />
        </header>

        <main className="lobby-container">
          {lobbyView === 'auth' && <AuthPage onDone={() => setLobbyView('play')} />}
          {lobbyView === 'profile' && <ProfilePage onBack={() => setLobbyView('play')} />}
          {lobbyView === 'friends' && (
            <FriendsPage onBack={() => setLobbyView('play')} onJoinGame={joinFromSocial} />
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
              tabLabel={tabLabel}
              challenges={challenges}
              requestCount={requests.length}
              onAcceptChallenge={async (id) => {
                const g = await acceptChallenge(id)
                joinFromSocial(g, false)
              }}
              onDeclineChallenge={async (id) => {
                await declineChallenge(id)
                await loadFriends()
              }}
              onOpenAuth={() => setLobbyView('auth')}
              onOpenProfile={() => setLobbyView('profile')}
              onOpenFriends={() => setLobbyView('friends')}
              onOpenLeaderboard={() => setLobbyView('leaderboard')}
              onStartTutorial={startTour}
            />
          )}
        </main>
        {tour}
      </div>
    )
  }

  return (
    <div
      className={`app app--game${is3d ? ' app--fullscreen' : ''}`}
      style={{
        background: roomAtmosphere.cssBackground,
        ['--room-glow' as string]: roomAtmosphere.glow,
        ['--room-vignette' as string]: roomAtmosphere.vignette,
        ['--room-horizon' as string]: roomAtmosphere.skyHorizon,
      }}
    >
      <div className="room-bg-decor" aria-hidden />

      <header className="app-header game-hud">
        <div className="game-hud-brand">
          <span className="game-hud-mark" aria-hidden>
            ♔
          </span>
          <div className="game-hud-copy">
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
                        ? 'You are White — share the invite'
                        : game.waitingFor
                          ? `Waiting for ${game.waitingFor}…`
                          : `${game.turn} to move${game.inCheck ? ' — check!' : ''}`
                : 'Opening the room…'}
            </p>
          </div>
        </div>

        <div className="view-toggle" data-tour="view-toggle">
          <ThemePicker />
          <button type="button" className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}>
            2D
          </button>
          <button type="button" className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>
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
                <div className="board-view board-view--2d" data-tour="board">
                  <ChessBoard2D
                    game={game}
                    displayFen={displayFen}
                    canMove={canMove}
                    onMove={submitMove}
                  />
                </div>
              )}

              {view === '3d' && (
                <div className="board-view board-view--fullscreen" data-tour="board">
                  <ChessBoard3D
                    game={game}
                    displayFen={displayFen}
                    atLivePosition={atLivePosition}
                    canMove={canMove && !tourActive}
                    onMove={submitMove}
                    hideCameraUi={sidebarOpen && !tourShowCamera}
                    tourAutoRotate={tourAutoRotate}
                    tourShowCamera={tourShowCamera}
                  />
                </div>
              )}

              {!tourActive && <GameStatusOverlays game={game} />}
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
      {tour}
    </div>
  )
}

export default App
