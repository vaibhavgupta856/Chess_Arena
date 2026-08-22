import { useEffect, useState } from 'react'

type Props = {
  message: string
  failed: boolean
  onRetry: () => void
}

export function BackendWakeScreen({ message, failed, onRetry }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (failed) return
    setElapsed(0)
    const id = window.setInterval(() => {
      setElapsed((s) => s + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [failed])

  return (
    <div className="backend-wake" role="status" aria-live="polite" aria-busy={!failed}>
      <div className="backend-wake-card">
        <span className={`backend-wake-mark${failed ? '' : ' backend-wake-mark--pulse'}`} aria-hidden>
          ♔
        </span>
        <p className="backend-wake-kicker">ChessArena</p>
        <h1 className="backend-wake-title">{failed ? 'Backend didn’t load' : 'Backend is loading'}</h1>
        <p className="backend-wake-body">
          {failed
            ? 'The backend is still spinning up, or it isn’t reachable. Wait a moment and retry.'
            : message}
        </p>
        {!failed && (
          <div className="backend-wake-bar" aria-hidden>
            <span className="backend-wake-bar-fill" />
          </div>
        )}
        {failed && (
          <button type="button" className="backend-wake-retry" onClick={onRetry}>
            Retry
          </button>
        )}
        {!failed && (
          <p className="backend-wake-hint">
            Backend is loading — first visit after sleep can take about a minute
            {elapsed > 0 ? ` · ${elapsed}s` : ''}.
          </p>
        )}
      </div>
    </div>
  )
}
