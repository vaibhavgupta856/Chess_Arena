import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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

function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  intervalMs = 150,
): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      if (predicate()) {
        resolve(true)
        return
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false)
        return
      }
      window.setTimeout(tick, intervalMs)
    }
    tick()
  })
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
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const enterGen = useRef(0)

  const step: TourStep | undefined = steps[Math.min(index, Math.max(0, steps.length - 1))]

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (index > steps.length - 1) onIndexChange(Math.max(0, steps.length - 1))
  }, [index, steps.length, onIndexChange])

  const syncRect = useCallback(() => {
    if (!step) return
    if (step.target && !step.hideSpotlight) {
      const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }
    setRect(readTargetRect(step.target))
  }, [step])

  useLayoutEffect(() => {
    if (!active || !step) return
    syncRect()
    const id = window.setInterval(syncRect, 250)
    window.addEventListener('resize', syncRect)
    window.addEventListener('scroll', syncRect, true)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', syncRect)
      window.removeEventListener('scroll', syncRect, true)
    }
  }, [active, step, screen, syncRect])

  const runEnter = useCallback(async () => {
    if (!active || !step) return
    const gen = ++enterGen.current
    setBusy(true)
    setReady(false)
    setLoadError(null)

    try {
      for (const action of step.enter ?? []) {
        if (enterGen.current !== gen) return
        await onAction(action)
      }

      if (step.screen === 'game') {
        const ok = await waitFor(() => {
          if (enterGen.current !== gen) return true
          const board = document.querySelector('[data-tour="board"]')
          return Boolean(board)
        }, 20000)
        if (enterGen.current !== gen) return
        if (!ok) {
          setLoadError('Could not open the 3D practice room. The chess server may be waking up — try again.')
          setBusy(false)
          return
        }
      }

      if (step.screen === 'lobby') {
        const ok = await waitFor(() => {
          if (enterGen.current !== gen) return true
          if (step.target) return Boolean(document.querySelector(`[data-tour="${step.target}"]`))
          return true
        }, 8000)
        if (enterGen.current !== gen) return
        if (!ok && step.target) {
          setLoadError('Lobby UI is still loading. Tap Retry.')
          setBusy(false)
          return
        }
      }

      await new Promise((r) => window.setTimeout(r, 120))
      if (enterGen.current !== gen) return
      syncRect()
      setReady(true)
    } catch (err) {
      if (enterGen.current !== gen) return
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setLoadError(msg)
    } finally {
      if (enterGen.current === gen) setBusy(false)
    }
  }, [active, step, onAction, syncRect])

  useEffect(() => {
    void runEnter()
    return () => {
      enterGen.current += 1
    }
  }, [runEnter])

  const finish = useCallback(() => {
    markTutorialSeen()
    void onAction('autoRotateOff')
    void onAction('closeSidebar')
    onClose()
  }, [onAction, onClose])

  const goNext = useCallback(() => {
    if (!step || busy) return
    if (loadError) return
    if (index >= steps.length - 1) {
      finish()
      return
    }
    onIndexChange(index + 1)
  }, [step, busy, loadError, index, steps.length, finish, onIndexChange])

  const goBack = useCallback(() => {
    if (busy || index <= 0) return
    onIndexChange(index - 1)
  }, [busy, index, onIndexChange])

  // Auto-advance after the 3D orbit showcase once ready.
  useEffect(() => {
    if (!active || !step?.autoAdvanceMs || !ready || busy || loadError) return
    const id = window.setTimeout(() => {
      if (index >= steps.length - 1) finish()
      else onIndexChange(index + 1)
    }, step.autoAdvanceMs)
    return () => window.clearTimeout(id)
  }, [active, step?.autoAdvanceMs, step?.id, ready, busy, loadError, index, steps.length, finish, onIndexChange])

  const bodyText = loadError
    ? loadError
    : busy && !ready
      ? step?.screen === 'game'
        ? 'Opening your 3D practice room… (server may take a moment to wake)'
        : 'Loading…'
      : (step?.body ?? '')

  const cardRef = useRef<HTMLDivElement>(null)
  const [cardHeight, setCardHeight] = useState(200)

  useLayoutEffect(() => {
    if (!active) return
    const el = cardRef.current
    if (!el) return
    const measure = () => setCardHeight(el.getBoundingClientRect().height)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [active, index, bodyText, narrow, step?.id])

  if (!active || !step) return null

  const pad = 10
  const highlight =
    rect && !step.hideSpotlight
      ? {
          top: Math.max(8, rect.top - pad),
          left: Math.max(8, rect.left - pad),
          width: Math.min(window.innerWidth - 16, rect.width + pad * 2),
          height: Math.min(window.innerHeight - 16, rect.height + pad * 2),
        }
      : null

  const edge = 12
  // Prefer env(safe-area) via CSS for docked cards; JS clamp uses a generous bottom inset.
  const bottomInset = Math.max(edge, narrow ? 16 : 12) + (narrow ? 8 : 0)
  const cardWidth = narrow ? Math.min(window.innerWidth - edge * 2, 400) : 380
  const dim = step.dim ?? 'full'
  const dockBottom = Boolean(step.hideSpotlight || step.placement === 'center' || narrow)

  let cardTop = window.innerHeight / 2 - cardHeight / 2
  let cardLeft = window.innerWidth / 2 - cardWidth / 2

  if (!dockBottom && highlight) {
    const gap = 14
    switch (step.placement) {
      case 'bottom':
        cardTop = highlight.top + highlight.height + gap
        cardLeft = highlight.left + highlight.width / 2 - cardWidth / 2
        break
      case 'top':
        cardTop = highlight.top - gap - cardHeight
        cardLeft = highlight.left + highlight.width / 2 - cardWidth / 2
        break
      case 'left':
        cardTop = highlight.top + highlight.height / 2 - cardHeight / 2
        cardLeft = highlight.left - gap - cardWidth
        break
      case 'right':
        cardTop = highlight.top + highlight.height / 2 - cardHeight / 2
        cardLeft = highlight.left + highlight.width + gap
        break
      default:
        break
    }
  }

  const maxTop = Math.max(edge, window.innerHeight - cardHeight - bottomInset)
  cardTop = clamp(cardTop, edge, maxTop)
  cardLeft = clamp(cardLeft, edge, Math.max(edge, window.innerWidth - cardWidth - edge))

  const nextDisabled = busy || Boolean(loadError) || (!ready && Boolean(step.enter?.length || step.screen === 'game'))

  const cardStyle: CSSProperties = dockBottom
    ? {
        top: 'auto',
        bottom: `max(${bottomInset}px, env(safe-area-inset-bottom, 0px))`,
        left: narrow ? edge : cardLeft,
        width: narrow ? `calc(100% - ${edge * 2}px)` : cardWidth,
        maxHeight: `calc(100dvh - ${edge * 2}px - env(safe-area-inset-bottom, 0px))`,
      }
    : {
        top: cardTop,
        left: cardLeft,
        width: cardWidth,
        maxHeight: `calc(100dvh - ${edge * 2}px)`,
      }

  return (
    <div className="product-tour" role="dialog" aria-modal="true" aria-label="ChessArena tutorial">
      <div
        className={`product-tour-shade product-tour-shade--${dim}`}
        aria-hidden
      />
      {highlight && ready && (
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
        ref={cardRef}
        className={`product-tour-card${dockBottom ? ' product-tour-card--docked' : ''}${narrow ? ' product-tour-card--mobile' : ''}`}
        style={cardStyle}
      >
        <div className="product-tour-progress">
          {index + 1} / {steps.length}
        </div>
        <h2 className="product-tour-title">{step.title}</h2>
        <p className="product-tour-body">{bodyText}</p>
        <div className="product-tour-actions">
          <button type="button" className="product-tour-btn muted" onClick={finish}>
            Skip
          </button>
          <div className="product-tour-actions-right">
            {loadError ? (
              <button
                type="button"
                className="product-tour-btn primary"
                onClick={() => void runEnter()}
                disabled={busy}
              >
                Retry
              </button>
            ) : (
              <>
                {index > 0 && (
                  <button
                    type="button"
                    className="product-tour-btn muted"
                    onClick={goBack}
                    disabled={busy}
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="product-tour-btn primary"
                  onClick={goNext}
                  disabled={nextDisabled}
                >
                  {busy && !ready ? 'Loading…' : step.nextLabel ?? (index >= steps.length - 1 ? 'Finish' : 'Next')}
                </button>
              </>
            )}
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
      if (localStorage.getItem('chessarena-tutorial-v2') === '1') return
    } catch {
      // ignore
    }
    const id = window.setTimeout(() => setShould(true), 500)
    return () => window.clearTimeout(id)
  }, [])
  return [should, setShould] as const
}
