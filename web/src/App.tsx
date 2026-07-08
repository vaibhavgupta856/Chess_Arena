import './App.css'
import { useState } from 'react'
import { ChessBoard2D } from './components/ChessBoard2D'
import { ChessBoard3D } from './components/ChessBoard3D'
import { useGame } from './hooks/useGame'

type ViewMode = '2d' | '3d'

function App() {
  const { game, error, submitMove } = useGame()
  const [view, setView] = useState<ViewMode>('3d')
  const is3d = view === '3d'

  return (
    <div className={`app${is3d ? ' app--fullscreen' : ''}`}>
      <header className="app-header">
        <h1>ChessArena</h1>
        <p>
          {game
            ? `Game ${game.id} – ${game.over ? game.outcome : `${game.turn} to move`}`
            : 'Loading game…'}
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
      <main className={`board-container${is3d ? ' board-container--fullscreen' : ''}`}>
        {game && (
          <>
            <div className={`board-view${view === '2d' ? '' : ' board-view--hidden'}`}>
              <ChessBoard2D game={game} onMove={submitMove} />
            </div>
            <div className={`board-view${view === '3d' ? ' board-view--fullscreen' : ' board-view--hidden'}`}>
              <ChessBoard3D
                game={game}
                onMove={submitMove}
                onSwitchTo2D={() => setView('2d')}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
