import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  filterTourSteps,
  isNarrowTourViewport,
  markTutorialSeen,
  TOUR_STEPS,
  type TourAction,
  type TourStep,
} from '../lib/tutorial'
import { persistTourVoiceMuted, tourVoiceUrl } from '../lib/tourVoice'

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

type ArrowDir = 'up' | 'down' | 'left' | 'right'

type CardSlot = {
  top: number
  left: number
  maxHeight: number
  dock: 'top' | 'bottom' | 'free'
  arrow: ArrowDir | null
}

function arrowAlongEdge(targetMid: number, start: number, size: number) {
  return clamp(targetMid - start, 18, Math.max(18, size - 18))
}

function isTopChromeTarget(highlight: Rect | null, target?: string) {
  if (target === 'view-toggle' || target === 'theme' || target === 'brand' || target === 'nav') {
    return true
  }
  if (!highlight) return false
  return highlight.top < 120 && highlight.height < 140
}

/** Place the tour card beside the spotlight — never on top of it. */
function placeCardClearOfHighlight(
  highlight: Rect | null,
  avoid: Rect | null,
  cardW: number,
  cardH: number,
  preferred: TourStep['placement'],
  vw: number,
  vh: number,
  edge: number,
  bottomInset: number,
  gap: number,
  target?: string,
): CardSlot {
  const minCard = 220
  const maxTop = Math.max(edge, vh - minCard - bottomInset)
  const block = avoid ?? highlight

  if (!highlight || !block) {
    return {
      top: Math.max(edge, vh - cardH - bottomInset),
      left: clamp((vw - cardW) / 2, edge, Math.max(edge, vw - cardW - edge)),
      maxHeight: Math.min(cardH, vh - edge - bottomInset),
      dock: 'bottom',
      arrow: 'up',
    }
  }

  const midY = highlight.top + highlight.height / 2
  const midX = highlight.left + highlight.width / 2
  const topChrome = isTopChromeTarget(highlight, target)

  // Header / view-toggle: sit well below the chrome with the triangle pointing up.
  if (topChrome) {
    const bandBottom = Math.max(highlight.top + highlight.height, block.top + block.height)
    const top = clamp(Math.max(bandBottom + 28, vh * 0.34), edge, maxTop)
    return {
      top,
      left: clamp(midX - cardW / 2, edge, Math.max(edge, vw - cardW - edge)),
      maxHeight: Math.max(minCard, vh - top - bottomInset),
      dock: 'free',
      arrow: 'up',
    }
  }

  const leftRail = block.left < vw * 0.28 && block.height > vh * 0.28
  const bottomSheet = block.width > vw * 0.62 && block.top > vh * 0.32
  const rightRail = block.left + block.width > vw * 0.72 && block.height > vh * 0.28

  if (leftRail && vw - (block.left + block.width) > cardW + gap + edge) {
    const left = block.left + block.width + gap
    const top = clamp(midY - cardH / 2, edge, maxTop)
    return { top, left, maxHeight: vh - top - bottomInset, dock: 'free', arrow: 'left' }
  }

  if (bottomSheet && block.top - edge > minCard + gap) {
    const maxHeight = Math.max(minCard, block.top - edge - gap)
    const top = clamp(block.top - gap - Math.min(cardH, maxHeight), edge, maxTop)
    return {
      top,
      left: clamp(midX - cardW / 2, edge, Math.max(edge, vw - cardW - edge)),
      maxHeight,
      dock: top <= edge + 4 ? 'top' : 'free',
      arrow: 'down',
    }
  }

  if (rightRail && block.left > cardW + gap + edge) {
    const left = block.left - gap - cardW
    const top = clamp(midY - cardH / 2, edge, maxTop)
    return { top, left, maxHeight: vh - top - bottomInset, dock: 'free', arrow: 'right' }
  }

  const spaceAbove = block.top - edge
  const spaceBelow = vh - bottomInset - (block.top + block.height)
  const spaceLeft = block.left - edge
  const spaceRight = vw - edge - (block.left + block.width)
  const fits = (space: number) => space >= minCard + gap

  const order: Array<'below' | 'above' | 'right' | 'left'> = []
  const push = (side: 'below' | 'above' | 'right' | 'left') => {
    if (!order.includes(side)) order.push(side)
  }

  if (preferred === 'top') push('above')
  else if (preferred === 'bottom') push('below')
  else if (preferred === 'left') push('left')
  else if (preferred === 'right') push('right')

  if (spaceRight >= spaceLeft) {
    push('right')
    push('left')
  } else {
    push('left')
    push('right')
  }
  if (spaceBelow >= spaceAbove) {
    push('below')
    push('above')
  } else {
    push('above')
    push('below')
  }

  for (const side of order) {
    if (side === 'below' && !fits(spaceBelow)) continue
    if (side === 'above' && !fits(spaceAbove)) continue
    if (side === 'left' && spaceLeft < cardW + gap) continue
    if (side === 'right' && spaceRight < cardW + gap) continue

    let top = edge
    let left = clamp(midX - cardW / 2, edge, Math.max(edge, vw - cardW - edge))
    let maxHeight = cardH
    let arrow: ArrowDir = 'up'

    if (side === 'below') {
      top = block.top + block.height + gap
      maxHeight = Math.max(minCard, spaceBelow - gap)
      arrow = 'up'
    } else if (side === 'above') {
      maxHeight = Math.max(minCard, spaceAbove - gap)
      top = block.top - gap - Math.min(cardH, maxHeight)
      arrow = 'down'
    } else if (side === 'right') {
      left = block.left + block.width + gap
      top = clamp(midY - cardH / 2, edge, maxTop)
      maxHeight = vh - top - bottomInset
      arrow = 'left'
    } else {
      left = block.left - gap - cardW
      top = clamp(midY - cardH / 2, edge, maxTop)
      maxHeight = vh - top - bottomInset
      arrow = 'right'
    }

    top = clamp(top, edge, Math.max(edge, vh - Math.min(cardH, maxHeight) - bottomInset))
    left = clamp(left, edge, Math.max(edge, vw - cardW - edge))
    const box = { top, left, width: cardW, height: Math.min(cardH, maxHeight) }
    if (boxesOverlap(box, highlight, gap) || boxesOverlap(box, block, gap)) continue

    const dock: CardSlot['dock'] =
      side === 'below' && top + box.height >= vh - bottomInset - 8
        ? 'bottom'
        : side === 'above' && top <= edge + 4
          ? 'top'
          : 'free'
    return { top, left, maxHeight, dock, arrow }
  }

  // Last resort: sit in the largest empty side, still pointing at the target.
  // Never pin to the top edge — that covers header controls like the 2D/3D switch.
  if (spaceRight >= cardW * 0.7) {
    return {
      top: clamp(midY - cardH / 2, edge, maxTop),
      left: Math.min(block.left + block.width + gap, vw - cardW - edge),
      maxHeight: minCard,
      dock: 'free',
      arrow: 'left',
    }
  }
  if (highlight.top < vh * 0.45) {
    const top = clamp(Math.max(highlight.top + highlight.height + gap, vh * 0.34), edge, maxTop)
    return {
      top,
      left: clamp(midX - cardW / 2, edge, Math.max(edge, vw - cardW - edge)),
      maxHeight: Math.max(minCard, vh - top - bottomInset),
      dock: 'free',
      arrow: 'up',
    }
  }
  return {
    top: clamp(highlight.top - minCard - gap, edge, maxTop),
    left: clamp(midX - cardW / 2, edge, Math.max(edge, vw - cardW - edge)),
    maxHeight: minCard,
    dock: 'free',
    arrow: 'down',
  }
}

function readAvoidRect(target?: string): Rect | null {
  if (!target) return null
  if (target === 'view-toggle' || target === 'theme' || target === 'brand' || target === 'nav') {
    const hud = document.querySelector('.game-hud, .app-header') as HTMLElement | null
    if (hud) {
      const r = hud.getBoundingClientRect()
      if (r.width > 2 && r.height > 2) {
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      }
    }
  }
  const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null
  const host = el?.closest('.game-sidebar, .camera-controls, .mobile-game-bar, .view-toggle, .lobby-nav') as HTMLElement | null
  if (!host) return readTargetRect(target)
  const r = host.getBoundingClientRect()
  if (r.width < 2 && r.height < 2) return readTargetRect(target)
  return { top: r.top, left: r.left, width: r.width, height: r.height }
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
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [tourStarted, setTourStarted] = useState(false)
  const enterGen = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingIdRef = useRef<string | null>(null)
  const voiceStartedAtRef = useRef(0)
  const onActionRef = useRef(onAction)
  const onIndexChangeRef = useRef(onIndexChange)
  const onCloseRef = useRef(onClose)
  onActionRef.current = onAction
  onIndexChangeRef.current = onIndexChange
  onCloseRef.current = onClose

  const step: TourStep | undefined = steps[Math.min(index, Math.max(0, steps.length - 1))]
  const stepId = step?.id

  const stopVoice = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    el.pause()
  }, [])

  const playVoice = useCallback((id: string) => {
    const el = audioRef.current
    if (!el) return
    if (playingIdRef.current === id && !el.paused && !el.ended && voiceStartedAtRef.current) return
    el.pause()
    el.removeAttribute('src')
    el.load()
    el.src = tourVoiceUrl(id)
    playingIdRef.current = id
    voiceStartedAtRef.current = 0
    void el.play().then(() => {
      if (playingIdRef.current === id) voiceStartedAtRef.current = performance.now()
    }).catch(() => {
      if (playingIdRef.current === id) playingIdRef.current = null
    })
  }, [])

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
    const current = step
    const currentIndex = index
    setBusy(true)
    setReady(false)
    setLoadError(null)

    try {
      for (const action of current.enter ?? []) {
        if (enterGen.current !== gen) return
        await onActionRef.current(action)
      }

      if (current.screen === 'game') {
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

      if (current.screen === 'lobby') {
        const ok = await waitFor(() => {
          if (enterGen.current !== gen) return true
          if (current.target) return Boolean(document.querySelector(`[data-tour="${current.target}"]`))
          return true
        }, 8000)
        if (enterGen.current !== gen) return
        if (!ok && current.target) {
          if (current.optional) {
            if (currentIndex < steps.length - 1) onIndexChangeRef.current(currentIndex + 1)
            else onCloseRef.current()
            return
          }
          setLoadError('Lobby UI is still loading. Tap Retry.')
          setBusy(false)
          return
        }
      }

      if (current.target && current.target !== 'board') {
        const found = await waitFor(() => {
          if (enterGen.current !== gen) return true
          return Boolean(document.querySelector(`[data-tour="${current.target}"]`))
        }, current.optional ? 1600 : 8000)
        if (enterGen.current !== gen) return
        if (!found) {
          if (current.optional) {
            if (currentIndex < steps.length - 1) onIndexChangeRef.current(currentIndex + 1)
            else onCloseRef.current()
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
  }, [active, stepId, index, steps.length, syncRect, step])

  useEffect(() => {
    if (!active || !stepId) return
    void runEnter()
    return () => {
      enterGen.current += 1
    }
    // Re-run only when the step changes — not when game state refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepId])

  const finish = useCallback(() => {
    stopVoice()
    playingIdRef.current = null
    setTourStarted(false)
    markTutorialSeen()
    void onAction('stopThemeCycle')
    void onAction('autoRotateOff')
    void onAction('closeSidebar')
    onClose()
  }, [onAction, onClose, stopVoice])

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

  const beginTour = useCallback(async () => {
    persistTourVoiceMuted(false)
    setVoiceMuted(false)
    setTourStarted(true)
    const el = audioRef.current
    const firstId = steps[0]?.id
    if (!el || !firstId) return
    try {
      el.src = tourVoiceUrl(firstId)
      el.muted = true
      await el.play()
      el.pause()
      el.muted = false
      el.currentTime = 0
      playingIdRef.current = null
      if (ready && !loadError) playVoice(firstId)
    } catch {
      el.muted = false
    }
  }, [steps, ready, loadError, playVoice])

  const toggleVoice = useCallback(() => {
    if (voiceMuted) {
      persistTourVoiceMuted(false)
      setVoiceMuted(false)
      if (step && tourStarted && ready && !loadError) {
        playingIdRef.current = null
        playVoice(step.id)
      }
      return
    }
    persistTourVoiceMuted(true)
    setVoiceMuted(true)
    playingIdRef.current = null
    stopVoice()
  }, [voiceMuted, step, tourStarted, ready, loadError, playVoice, stopVoice])

  useEffect(() => {
    if (!active) {
      setTourStarted(false)
      playingIdRef.current = null
      stopVoice()
    }
  }, [active, stopVoice])

  const finishRef = useRef(finish)
  finishRef.current = finish
  const indexRef = useRef(index)
  indexRef.current = index
  const stepsLenRef = useRef(steps.length)
  stepsLenRef.current = steps.length

  useEffect(() => {
    voiceStartedAtRef.current = 0
  }, [stepId])

  useEffect(() => {
    if (!active || !tourStarted || voiceMuted || !ready || !step || loadError) return
    playVoice(step.id)
  }, [active, tourStarted, voiceMuted, ready, stepId, loadError, playVoice, step])

  useEffect(() => {
    if (!active || !tourStarted || !ready || busy || loadError || voiceMuted || !stepId) return
    const audio = audioRef.current
    if (!audio) return

    let advanced = false
    let pauseTimer: number | undefined
    const expectedId = stepId

    const clipFinished = () => {
      if (playingIdRef.current !== expectedId) return false
      const started = voiceStartedAtRef.current
      if (!started) return false
      const elapsed = (performance.now() - started) / 1000
      const dur = audio.duration
      if (!Number.isFinite(dur) || dur < 0.8) return false
      // Ignore leftover "ended" from the previous clip when this one just started.
      if (elapsed < dur * 0.72) return false
      return audio.ended || audio.currentTime >= dur * 0.85
    }

    const go = () => {
      if (advanced) return
      advanced = true
      const i = indexRef.current
      if (i >= stepsLenRef.current - 1) finishRef.current()
      else onIndexChangeRef.current(i + 1)
    }

    const onEnded = () => {
      if (!clipFinished()) return
      pauseTimer = window.setTimeout(go, 1000)
    }

    audio.addEventListener('ended', onEnded)
    if (clipFinished()) pauseTimer = window.setTimeout(go, 1000)

    return () => {
      audio.removeEventListener('ended', onEnded)
      if (pauseTimer) window.clearTimeout(pauseTimer)
    }
  }, [active, tourStarted, ready, busy, loadError, voiceMuted, stepId])

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
  }, [active, index, bodyText, narrow, step?.id, tourStarted])

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
  const dim = tourStarted ? (step.dim ?? 'full') : 'soft'
  const showcase = Boolean(step.hideSpotlight || (step.placement === 'center' && !highlight))
  const avoid = highlight ? readAvoidRect(step.target) : null
  const slot = showcase
    ? {
        top: 0,
        left: narrow ? edge : (window.innerWidth - cardWidth) / 2,
        maxHeight: Math.min(Math.max(cardHeight, 240), window.innerHeight * 0.4),
        dock: (step.placement === 'top' ? 'top' : 'bottom') as 'top' | 'bottom',
        arrow: (step.placement === 'top' ? 'down' : 'up') as ArrowDir,
      }
    : placeCardClearOfHighlight(
        highlight,
        avoid,
        cardWidth,
        cardHeight,
        step.placement,
        window.innerWidth,
        window.innerHeight,
        edge,
        bottomInset,
        16,
        step.target,
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

  const arrowPos = (() => {
    if (!slot.arrow || !highlight) return 24
    if (slot.arrow === 'left' || slot.arrow === 'right') {
      const cardTop = slot.dock === 'top' ? edge : slot.dock === 'bottom' ? window.innerHeight - Math.min(cardHeight, 240) - bottomInset : slot.top
      return arrowAlongEdge(highlight.top + highlight.height / 2, cardTop, Math.min(cardHeight, 240))
    }
    const cardLeft = narrow ? edge : slot.left
    const width = narrow ? window.innerWidth - edge * 2 : cardWidth
    return arrowAlongEdge(highlight.left + highlight.width / 2, cardLeft, width)
  })()

  const startCardStyle: CSSProperties = {
    top: Math.max(edge, window.innerHeight * 0.28),
    left: narrow ? edge : clamp((window.innerWidth - cardWidth) / 2, edge, window.innerWidth - cardWidth - edge),
    width: narrow ? `calc(100% - ${edge * 2}px)` : cardWidth,
  }

  return (
    <div className="product-tour" role="dialog" aria-modal="true" aria-label="ChessArena tutorial">
      <div
        className={`product-tour-shade product-tour-shade--${dim}`}
        aria-hidden
      />
      {tourStarted && highlight && ready && (
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

      {!tourStarted ? (
        <div
          ref={cardRef}
          className={`product-tour-card product-tour-card--start${narrow ? ' product-tour-card--mobile' : ''}`}
          style={startCardStyle}
        >
          <div className="product-tour-card-main">
            <h2 className="product-tour-title">Welcome to ChessArena</h2>
            <p className="product-tour-body">
              A short walkthrough of the 3D room and the rest of the arena. Tap Start and a guide will talk you through each panel.
            </p>
          </div>
          <div className="product-tour-actions">
            <button type="button" className="product-tour-btn muted" onClick={finish}>
              Skip
            </button>
            <div className="product-tour-actions-right">
              <button type="button" className="product-tour-btn primary" onClick={() => void beginTour()}>
                Start tour
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div
        ref={cardRef}
        key={step.id}
        className={`product-tour-card${slot.dock !== 'free' ? ` product-tour-card--docked product-tour-card--${slot.dock}` : ''}${narrow ? ' product-tour-card--mobile' : ''}`}
        style={cardStyle}
      >
        {slot.arrow && (
          <span
            className={`product-tour-arrow product-tour-arrow--${slot.arrow}`}
            style={
              slot.arrow === 'left' || slot.arrow === 'right'
                ? { top: arrowPos }
                : { left: arrowPos }
            }
            aria-hidden
          />
        )}
        <div className="product-tour-card-main">
        <div className="product-tour-track" aria-hidden>
          <div
            className="product-tour-track-fill"
            style={{ width: `${((index + 1) / Math.max(1, steps.length)) * 100}%` }}
          />
        </div>
        <div className="product-tour-progress-row">
          <div className="product-tour-progress">
            {index + 1} / {steps.length}
          </div>
          <button
            type="button"
            className={`product-tour-voice${voiceMuted ? ' is-muted' : ''}`}
            onClick={toggleVoice}
            aria-pressed={!voiceMuted}
            aria-label={voiceMuted ? 'Unmute tour voice' : 'Mute tour voice'}
          >
            {voiceMuted ? 'Unmute' : 'Mute'}
          </button>
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
      )}
      <audio ref={audioRef} preload="auto" hidden />
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
