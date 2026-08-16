import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  filterTourSteps,
  isNarrowTourViewport,
  markTutorialSeen,
  TOUR_STEPS,
  type TourAction,
  type TourStep,
} from '../lib/tutorial'

type Rect = { top: number; left: number; width: number; height: number }

type Props = {
  active: boolean
  screen: 'lobby' | 'game'
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  onAction: (action: TourAction) => void | Promise<void>
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function readTargetRect(target?: string): Rect | null {
  if (!target) return null
  const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 && r.height < 2) return null
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  }
}

export function ProductTour({
  active,
  screen,
  index,
  onIndexChange,
  onClose,
  onAction,
}: Props) {
  const [narrow, setNarrow] = useState(isNarrowTourViewport)
  const steps = useMemo(() => filterTourSteps(TOUR_STEPS, narrow), [narrow])
  const [rect, setRect] = useState<Rect | null>(null)
  const [busy, setBusy] = useState(false)

  const step: TourStep | undefined = steps[Math.min(index, Math.max(0, steps.length - 1))]

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Keep index in range when mobile/desktop filter changes step count.
  useEffect(() => {
    if (index > steps.length - 1) onIndexChange(Math.max(0, steps.length - 1))
  }, [index, steps.length, onIndexChange])

  const syncRect = useCallback(() => {
    if (!step) return
    if (step.target) {
      const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }
    setRect(readTargetRect(step.target))
  }, [step])

  useLayoutEffect(() => {
    if (!active || !step) return
    syncRect()
    const id = window.setInterval(syncRect, 300)
    window.addEventListener('resize', syncRect)
    window.addEventListener('scroll', syncRect, true)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', syncRect)
      window.removeEventListener('scroll', syncRect, true)
    }
  }, [active, step, screen, syncRect])

  useEffect(() => {
    if (!active || !step?.enter?.length) return
    let cancelled = false
    void (async () => {
      setBusy(true)
      try {
        for (const action of step.enter ?? []) {
          if (cancelled) return
          await onAction(action)
        }
        await new Promise((r) => window.setTimeout(r, 200))
        if (!cancelled) syncRect()
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active, step?.id, onAction, syncRect, step?.enter])

  const waitingForGame = step?.screen === 'game' && screen !== 'game'
  const waitingForLobby = step?.screen === 'lobby' && screen !== 'lobby'

  const finish = useCallback(() => {
    markTutorialSeen()
    void onAction('autoRotateOff')
    void onAction('closeSidebar')
    onClose()
  }, [onAction, onClose])

  const goNext = useCallback(async () => {
    if (!step || busy) return

    if (step.id === 'enter-3d') {
      setBusy(true)
      try {
        await onAction('startDemoGame')
        const started = Date.now()
        while (Date.now() - started < 15000) {
          await new Promise((r) => window.setTimeout(r, 200))
          if (document.querySelector('[data-tour="board"]')) break
        }
      } finally {
        setBusy(false)
      }
    }

    if (index >= steps.length - 1) {
      finish()
      return
    }
    onIndexChange(index + 1)
  }, [step, busy, onAction, index, steps.length, finish, onIndexChange])

  const goBack = useCallback(() => {
    if (busy || index <= 0) return
    onIndexChange(index - 1)
  }, [busy, index, onIndexChange])

  if (!active || !step) return null

  const pad = 10
  const highlight = rect
    ? {
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: Math.min(window.innerWidth - 16, rect.width + pad * 2),
        height: Math.min(window.innerHeight - 16, rect.height + pad * 2),
      }
    : null

  const cardWidth = narrow ? Math.min(window.innerWidth - 24, 340) : 360
  let cardTop = window.innerHeight / 2 - 90
  let cardLeft = window.innerWidth / 2 - cardWidth / 2

  if (highlight && step.placement !== 'center') {
    const gap = 14
    switch (step.placement) {
      case 'bottom':
        cardTop = highlight.top + highlight.height + gap
        cardLeft = highlight.left + highlight.width / 2 - cardWidth / 2
        break
      case 'top':
        cardTop = highlight.top - gap - 160
        cardLeft = highlight.left + highlight.width / 2 - cardWidth / 2
        break
      case 'left':
        cardTop = highlight.top + highlight.height / 2 - 80
        cardLeft = highlight.left - gap - cardWidth
        break
      case 'right':
        cardTop = highlight.top + highlight.height / 2 - 80
        cardLeft = highlight.left + highlight.width + gap
        break
      default:
        break
    }
  }

  cardTop = clamp(cardTop, 12, window.innerHeight - 220)
  cardLeft = clamp(cardLeft, 12, window.innerWidth - cardWidth - 12)

  return (
    <div className="product-tour" role="dialog" aria-modal="true" aria-label="ChessArena tutorial">
      <div className="product-tour-shade" aria-hidden />
      {highlight && !(waitingForGame || waitingForLobby) && (
        <div
          className="product-tour-spotlight"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}

      <div
        className="product-tour-card"
        style={{ top: cardTop, left: cardLeft, width: cardWidth }}
      >
        <div className="product-tour-progress">
          {index + 1} / {steps.length}
        </div>
        <h2 className="product-tour-title">{step.title}</h2>
        <p className="product-tour-body">
          {waitingForGame
            ? 'Opening your 3D practice room…'
            : waitingForLobby
              ? 'Returning to the lobby…'
              : step.body}
        </p>
        <div className="product-tour-actions">
          <button type="button" className="product-tour-btn muted" onClick={finish} disabled={busy}>
            Skip
          </button>
          <div className="product-tour-actions-right">
            {index > 0 && (
              <button type="button" className="product-tour-btn muted" onClick={goBack} disabled={busy}>
                Back
              </button>
            )}
            <button
              type="button"
              className="product-tour-btn primary"
              onClick={() => void goNext()}
              disabled={busy || waitingForGame}
            >
              {busy ? 'Working…' : step.nextLabel ?? (index >= steps.length - 1 ? 'Finish' : 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function useShouldAutoStartTour() {
  const [should, setShould] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem('chessarena-tutorial-v1') === '1') return
    } catch {
      // ignore
    }
    const id = window.setTimeout(() => setShould(true), 800)
    return () => window.clearTimeout(id)
  }, [])
  return [should, setShould] as const
}
