const TOUR_STORAGE_KEY = 'chessarena-tutorial-v1'

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
  /** Run when the step becomes active */
  enter?: TourAction[]
  /** Primary button label override */
  nextLabel?: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ChessArena',
    body: 'A quick tour of the lobby, the 3D chess room, and the game tools. Works the same on phone and desktop.',
    placement: 'center',
    screen: 'any',
    enter: ['ensureLobbyPlay', 'closeSidebar', 'autoRotateOff'],
    nextLabel: 'Start tour',
  },
  {
    id: 'brand',
    title: 'Your arena',
    body: 'ChessArena is where you play online, vs bot, or hot-seat — in 2D or immersive 3D.',
    target: 'brand',
    placement: 'bottom',
    screen: 'lobby',
  },
  {
    id: 'theme',
    title: 'Themes',
    body: 'Swap board and room looks anytime. Your choice is saved for next visit.',
    target: 'theme',
    placement: 'bottom',
    screen: 'lobby',
  },
  {
    id: 'nav',
    title: 'Account & social',
    body: 'Sign in for profile, friends, challenges, and the leaderboard. Guests can still jump into a game.',
    target: 'nav',
    placement: 'bottom',
    screen: 'lobby',
  },
  {
    id: 'play',
    title: 'Play modes',
    body: 'Start vs Bot, create an Online Room, or play Hot Seat on one device. Cards open a room instantly.',
    target: 'play',
    placement: 'top',
    screen: 'lobby',
  },
  {
    id: 'bot-level',
    title: 'Bot strength',
    body: 'Pick how hard the engine plays before you tap Play vs Bot.',
    target: 'bot-level',
    placement: 'top',
    screen: 'lobby',
  },
  {
    id: 'join',
    title: 'Join a room',
    body: 'Paste a room code or invite link here to sit as the second player.',
    target: 'join',
    placement: 'top',
    screen: 'lobby',
  },
  {
    id: 'enter-3d',
    title: 'Enter the 3D room',
    body: 'Next we open a practice bot game and spin the camera so you can see the board in 3D.',
    placement: 'center',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
    nextLabel: 'Open 3D demo',
  },
  {
    id: 'room-3d',
    title: 'This is your 3D room',
    body: 'Watch the board orbit — that’s the free-drag camera. After the tour, drag with one finger (or mouse) to look around yourself.',
    target: 'board',
    placement: 'center',
    screen: 'game',
    enter: ['ensure3d', 'closeSidebar', 'autoRotateOn'],
    nextLabel: 'Nice — continue',
  },
  {
    id: 'camera',
    title: 'Camera controls',
    body: 'Switch Free drag vs Fixed angles, or pick a preset view. On phones, tap Cam to open this panel.',
    target: 'camera',
    placement: 'left',
    screen: 'game',
    enter: ['ensure3d', 'autoRotateOff', 'openCamera', 'closeSidebar'],
  },
  {
    id: 'view-toggle',
    title: '2D & 3D',
    body: 'Jump between classic 2D and the 3D board anytime. Themes live here in-game too.',
    target: 'view-toggle',
    placement: 'bottom',
    screen: 'game',
    enter: ['autoRotateOff'],
  },
  {
    id: 'mobile-bar',
    title: 'Mobile game bar',
    body: 'On phones: status, step through moves, and Menu to open the full game panel.',
    target: 'mobile-bar',
    placement: 'top',
    screen: 'game',
    mobileOnly: true,
    enter: ['closeSidebar'],
  },
  {
    id: 'sidebar-game',
    title: 'Game panel',
    body: 'Room info, whose turn it is, and (when timed) clocks. On mobile this slides up from Menu.',
    target: 'sidebar-game',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-history',
    title: 'Time travel',
    body: 'Step back and forward through the move list to review positions without changing the live game.',
    target: 'sidebar-history',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-coach',
    title: 'Coach',
    body: 'In bot and local games, ask for a hint, review the last move, or get position advice.',
    target: 'sidebar-coach',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-actions',
    title: 'Actions',
    body: 'Offer or claim draws, resign, or leave back to the lobby when you’re done.',
    target: 'sidebar-actions',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'done',
    title: 'You’re ready',
    body: 'Drag pieces to move (or tap–tap), rotate the 3D view, and use Menu on mobile for the full panel. Replay this tour anytime from the lobby.',
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
