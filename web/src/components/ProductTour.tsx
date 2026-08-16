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

function boxesOverlap(a: Rect, b: Rect, gap: number) {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  )
}

type CardSlot = {
  top: number
  left: number
  maxHeight: number
  dock: 'top' | 'bottom' | 'free'
}

/** Place the tour card in a viewport slot that does not cover the spotlight. */
function placeCardClearOfHighlight(
  highlight: Rect | null,
  cardW: number,
  cardH: number,
  preferred: TourStep['placement'],
  vw: number,
  vh: number,
  edge: number,
  bottomInset: number,
  gap: number,
): CardSlot {
  const minCard = 232
  const maxTop = Math.max(edge, vh - minCard - bottomInset)

  if (!highlight) {
    return {
      top: Math.max(edge, vh - cardH - bottomInset),
      left: clamp((vw - cardW) / 2, edge, Math.max(edge, vw - cardW - edge)),
      maxHeight: Math.min(cardH, vh - edge - bottomInset),
      dock: 'bottom',
    }
  }

  const spaceAbove = highlight.top - edge
  const spaceBelow = vh - bottomInset - (highlight.top + highlight.height)
  const spaceLeft = highlight.left - edge
  const spaceRight = vw - edge - (highlight.left + highlight.width)

  const fits = (space: number) => space >= Math.min(cardH, minCard) + gap

  const order: Array<'below' | 'above' | 'right' | 'left'> = []
  const push = (side: 'below' | 'above' | 'right' | 'left') => {
    if (!order.includes(side)) order.push(side)
  }

  if (preferred === 'top') push('above')
  else if (preferred === 'bottom') push('below')
  else if (preferred === 'left') push('left')
  else if (preferred === 'right') push('right')

  // Prefer the larger vertical gap — that's what stays readable on phones.
  if (spaceBelow >= spaceAbove) {
    push('below')
    push('above')
  } else {
    push('above')
    push('below')
  }
  if (spaceRight >= spaceLeft) {
    push('right')
    push('left')
  } else {
    push('left')
    push('right')
  }

  for (const side of order) {
    if (side === 'below' && !fits(spaceBelow) && fits(spaceAbove)) continue
    if (side === 'above' && !fits(spaceAbove) && fits(spaceBelow)) continue
    if (side === 'left' && spaceLeft < cardW + gap) continue
    if (side === 'right' && spaceRight < cardW + gap) continue

    let top = edge
    let left = clamp(highlight.left + highlight.width / 2 - cardW / 2, edge, Math.max(edge, vw - cardW - edge))
    let maxHeight = cardH

    if (side === 'below') {
      top = highlight.top + highlight.height + gap
      maxHeight = Math.max(minCard, spaceBelow - gap)
    } else if (side === 'above') {
      maxHeight = Math.max(minCard, spaceAbove - gap)
      top = highlight.top - gap - Math.min(cardH, maxHeight)
    } else if (side === 'right') {
      left = highlight.left + highlight.width + gap
      top = clamp(highlight.top + highlight.height / 2 - cardH / 2, edge, maxTop)
      maxHeight = vh - top - bottomInset
    } else {
      left = highlight.left - gap - cardW
      top = clamp(highlight.top + highlight.height / 2 - cardH / 2, edge, maxTop)
      maxHeight = vh - top - bottomInset
    }

    top = clamp(top, edge, Math.max(edge, vh - Math.min(cardH, maxHeight) - bottomInset))
    left = clamp(left, edge, Math.max(edge, vw - cardW - edge))
    const box = { top, left, width: cardW, height: Math.min(cardH, maxHeight) }
    if (boxesOverlap(box, highlight, gap - 2)) continue

    const dock: CardSlot['dock'] =
      side === 'below' && top + box.height >= vh - bottomInset - 8
        ? 'bottom'
        : side === 'above' && top <= edge + 4
          ? 'top'
          : 'free'
    return { top, left, maxHeight, dock }
  }

  // Last resort: park the card on the side of the screen opposite the target.
  const targetMid = highlight.top + highlight.height / 2
  if (targetMid > vh / 2) {
    return { top: edge, left: edge, maxHeight: Math.max(minCard, spaceAbove - gap), dock: 'top' }
  }
  return {
    top: vh - bottomInset - Math.min(cardH, Math.max(minCard, spaceBelow)),
    left: edge,
    maxHeight: Math.max(minCard, spaceBelow - gap),
    dock: 'bottom',
  }
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
    setRect(readTargetRect(step.target))
  }, [step])

  useEffect(() => {
    if (!active || !step?.target || step.hideSpotlight) return
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null
    if (!el) return
    const r = el.getBoundingClientRect()
    const mid = r.top + r.height / 2
    el.scrollIntoView({
      block: mid > window.innerHeight * 0.55 ? 'end' : 'start',
      inline: 'nearest',
      behavior: 'smooth',
    })
    const id = window.setTimeout(() => setRect(readTargetRect(step.target)), 280)
    return () => window.clearTimeout(id)
  }, [active, step?.id, step?.target, step?.hideSpotlight])

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
          if (step.optional) {
            if (index < steps.length - 1) onIndexChange(index + 1)
            else onClose()
            return
          }
          setLoadError('Lobby UI is still loading. Tap Retry.')
          setBusy(false)
          return
        }
      }

      if (step.target && step.target !== 'board') {
        const found = await waitFor(() => {
          if (enterGen.current !== gen) return true
          return Boolean(document.querySelector(`[data-tour="${step.target}"]`))
        }, step.optional ? 1600 : 8000)
        if (enterGen.current !== gen) return
        if (!found) {
          if (step.optional) {
            if (index < steps.length - 1) onIndexChange(index + 1)
            else onClose()
            return
          }
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
  }, [active, step, onAction, syncRect, index, steps.length, onIndexChange, onClose])

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
  const highlight = (() => {
    if (!rect || step.hideSpotlight) return null
    const maxH = Math.min(window.innerHeight - 16, window.innerHeight * 0.5)
    const height = Math.min(window.innerHeight - 16, rect.height + pad * 2, maxH)
    let top = Math.max(8, rect.top - pad)
    // If the target is taller than the spotlight, keep the on-screen slice.
    if (rect.height + pad * 2 > maxH) {
      top = clamp(rect.top - pad, 8, window.innerHeight - height - 8)
    }
    return {
      top,
      left: Math.max(8, rect.left - pad),
      width: Math.min(window.innerWidth - 16, rect.width + pad * 2),
      height,
    }
  })()

  const edge = 12
  const bottomInset = Math.max(edge, narrow ? 16 : 12) + (narrow ? 8 : 0)
  const cardWidth = narrow ? Math.min(window.innerWidth - edge * 2, 400) : 360
  const dim = step.dim ?? 'full'
  const showcase = Boolean(step.hideSpotlight || (step.placement === 'center' && !highlight))
  const slot = showcase
    ? {
        top: 0,
        left: narrow ? edge : (window.innerWidth - cardWidth) / 2,
        maxHeight: Math.min(Math.max(cardHeight, 240), window.innerHeight * 0.4),
        dock: (step.placement === 'top' ? 'top' : 'bottom') as 'top' | 'bottom',
      }
    : placeCardClearOfHighlight(
        highlight,
        cardWidth,
        cardHeight,
        step.placement,
        window.innerWidth,
        window.innerHeight,
        edge,
        bottomInset,
        16,
      )

  const nextDisabled = busy || Boolean(loadError) || (!ready && Boolean(step.enter?.length || step.screen === 'game'))

  const cardStyle: CSSProperties =
    slot.dock === 'bottom'
      ? {
          top: 'auto',
          bottom: `max(${bottomInset}px, env(safe-area-inset-bottom, 0px))`,
          left: narrow ? edge : clamp(slot.left, edge, window.innerWidth - cardWidth - edge),
          width: narrow ? `calc(100% - ${edge * 2}px)` : cardWidth,
          maxHeight: `min(${Math.max(240, slot.maxHeight)}px, 56dvh)`,
        }
      : slot.dock === 'top'
        ? {
            top: `max(${edge}px, env(safe-area-inset-top, 0px))`,
            bottom: 'auto',
            left: narrow ? edge : clamp(slot.left, edge, window.innerWidth - cardWidth - edge),
            width: narrow ? `calc(100% - ${edge * 2}px)` : cardWidth,
            maxHeight: `min(${Math.max(240, slot.maxHeight)}px, 56dvh)`,
          }
        : {
            top: slot.top,
            left: slot.left,
            width: cardWidth,
            maxHeight: `min(${Math.max(240, slot.maxHeight)}px, 56dvh)`,
          }

  return (
    <div className="product-tour" role="dialog" aria-modal="true" aria-label="ChessArena tutorial">
      <div
        className={`product-tour-shade product-tour-shade--${dim}`}
        aria-hidden
      />
      {highlight && ready && (
        <div
          className="product-tour-spotlight product-tour-spotlight--live"
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
        key={step.id}
        className={`product-tour-card${slot.dock !== 'free' ? ` product-tour-card--docked product-tour-card--${slot.dock}` : ''}${narrow ? ' product-tour-card--mobile' : ''}`}
        style={cardStyle}
      >
        <div className="product-tour-card-main">
        <div className="product-tour-track" aria-hidden>
          <div
            className="product-tour-track-fill"
            style={{ width: `${((index + 1) / Math.max(1, steps.length)) * 100}%` }}
          />
        </div>
        <div className="product-tour-progress">
          {index + 1} / {steps.length}
        </div>
        <h2 className="product-tour-title">{step.title}</h2>
        <p className="product-tour-body">{bodyText}</p>
        </div>
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

/** Always kick off the tour shortly after the site opens. */
export function useShouldAutoStartTour() {
  const [should, setShould] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setShould(true), 280)
    return () => window.clearTimeout(id)
  }, [])
  return [should, setShould] as const
}
