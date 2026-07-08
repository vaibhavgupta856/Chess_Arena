import './App.css'

import { useState } from 'react'

import { ChessBoard2D } from './components/ChessBoard2D'

import { ChessBoard3D } from './components/ChessBoard3D'

import { GameLobby } from './components/GameLobby'

import { GameSidebar } from './components/GameSidebar'

import { canPlayerMove, useGame } from './hooks/useGame'



type ViewMode = '2d' | '3d'



function App() {

  const {

    game,

    screen,

    error,

    inviteLink,

    createGame,

    joinGame,

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

  } = useGame()

  const [view, setView] = useState<ViewMode>('3d')

  const is3d = view === '3d' && screen === 'game'

  const canMove = game ? canPlayerMove(game, atLivePosition) : false



  if (screen === 'lobby') {

    return (

      <div className="app app--lobby">

        <header className="app-header">

          <h1>ChessArena</h1>

          <p>Play chess online, vs bot, or locally — in 2D or 3D.</p>

        </header>

        <main className="lobby-container">

          <GameLobby onCreate={createGame} onJoin={joinGame} error={error} />

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

                : game.waitingFor

                  ? `Waiting for opponent (${game.waitingFor})…`

                  : `${game.turn} to move${game.inCheck ? ' — check!' : ''}`

            : 'Loading…'}

        </p>

        <div className="view-toggle">

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
                <div className="board-view">
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
                  onSwitchTo2D={() => setView('2d')}
                />
              </div>

            </div>

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

            />

          </>

        )}

      </main>

    </div>

  )

}



export default App

