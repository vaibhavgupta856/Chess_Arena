const TOUR_STORAGE_KEY = 'chessarena-tutorial-v2'

export type TourPlacement = 'center' | 'top' | 'bottom' | 'left' | 'right'

export type TourAction =
  | 'ensureLobbyPlay'
  | 'startDemoGame'
  | 'ensure3d'
  | 'openCamera'
  | 'autoRotateOn'
  | 'autoRotateOff'
  | 'openSidebar'
  | 'closeSidebar'

export type TourStep = {
  id: string
  title: string
  body: string
  /** Matches `[data-tour="..."]` */
  target?: string
  placement?: TourPlacement
  screen?: 'lobby' | 'game' | 'any'
  mobileOnly?: boolean
  desktopOnly?: boolean
  /** Soft dim so the 3D room stays visible during the orbit demo */
  dim?: 'full' | 'soft' | 'none'
  /** Hide the cutout spotlight (useful for full-board 3D) */
  hideSpotlight?: boolean
  /** Auto-advance after this many ms once the step is ready */
  autoAdvanceMs?: number
  /** Run when the step becomes active */
  enter?: TourAction[]
  /** Primary button label override */
  nextLabel?: string
}

/**
 * Tour order: 3D room first (with auto-orbit), then in-game panels, then lobby.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'room-3d',
    title: 'This is your 3D chess room',
    body: 'Watch the board orbit — ChessArena is a real 3D space. After the tour, drag with one finger (or mouse) to look around yourself.',
    target: 'board',
    placement: 'center',
    screen: 'game',
    dim: 'soft',
    hideSpotlight: true,
    enter: ['startDemoGame', 'ensure3d', 'closeSidebar', 'autoRotateOn'],
    autoAdvanceMs: 6500,
    nextLabel: 'Continue',
  },
  {
    id: 'camera',
    title: 'Camera controls',
    body: 'Free drag lets you orbit the room. Fixed locks to a preset angle. On phones, tap Cam to open this panel.',
    target: 'camera',
    placement: 'left',
    screen: 'game',
    dim: 'full',
    enter: ['ensure3d', 'autoRotateOff', 'openCamera', 'closeSidebar'],
  },
  {
    id: 'view-toggle',
    title: '2D & 3D',
    body: 'Jump between classic 2D and the 3D board anytime. Themes live here in-game too.',
    target: 'view-toggle',
    placement: 'bottom',
    screen: 'game',
    enter: ['autoRotateOff', 'closeSidebar'],
  },
  {
    id: 'mobile-bar',
    title: 'Mobile game bar',
    body: 'Status, step through moves, and Menu for the full game panel.',
    target: 'mobile-bar',
    placement: 'top',
    screen: 'game',
    mobileOnly: true,
    enter: ['closeSidebar'],
  },
  {
    id: 'sidebar-game',
    title: 'Game panel',
    body: 'Room info, whose turn it is, and clocks when timed. On mobile this slides up from Menu.',
    target: 'sidebar-game',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-tools',
    title: 'History & coach',
    body: 'Replay moves with time travel. In bot and local games, Coach can hint, review, or advise.',
    target: 'sidebar-history',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-actions',
    title: 'Game actions',
    body: 'Offer or claim draws, resign, or leave back to the lobby.',
    target: 'sidebar-actions',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'lobby-play',
    title: 'Start any mode',
    body: 'From the lobby: Play vs Bot, Online Room, or Hot Seat. Pick bot strength, then tap a card.',
    target: 'play',
    placement: 'top',
    screen: 'lobby',
    enter: ['autoRotateOff', 'closeSidebar', 'ensureLobbyPlay'],
  },
  {
    id: 'lobby-join',
    title: 'Join a room',
    body: 'Paste a room code or invite link here to sit as the second player.',
    target: 'join',
    placement: 'top',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'lobby-chrome',
    title: 'Themes & account',
    body: 'Swap looks anytime. Sign in for profile, friends, challenges, and the leaderboard — guests can still play.',
    target: 'theme',
    placement: 'bottom',
    screen: 'lobby',
  },
  {
    id: 'done',
    title: 'You’re ready',
    body: 'Orbit the 3D room, drag pieces to move, and use Menu on mobile for the full panel. Replay this tour anytime from Tutorial in the lobby.',
    placement: 'center',
    screen: 'any',
    enter: ['closeSidebar', 'autoRotateOff'],
    nextLabel: 'Finish',
  },
]

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

export function clearTutorialSeen() {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function isNarrowTourViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
}

export function filterTourSteps(steps: TourStep[], narrow: boolean): TourStep[] {
  return steps.filter((step) => {
    if (step.mobileOnly && !narrow) return false
    if (step.desktopOnly && narrow) return false
    return true
  })
}
