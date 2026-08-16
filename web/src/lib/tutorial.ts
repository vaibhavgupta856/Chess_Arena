const TOUR_STORAGE_KEY = 'chessarena-tutorial-v3'

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
  /** Skip this step if the target never appears */
  optional?: boolean
  /** Auto-advance after this many ms once the step is ready */
  autoAdvanceMs?: number
  /** Run when the step becomes active */
  enter?: TourAction[]
  /** Primary button label override */
  nextLabel?: string
}

/**
 * Full-arena tour: 3D room first, then every in-game panel, then every lobby surface.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'room-3d',
    title: 'Welcome to the 3D room',
    body: 'This is ChessArena. Watch the board orbit — a real 3D space you can drag around after the tour.',
    target: 'board',
    placement: 'center',
    screen: 'game',
    dim: 'soft',
    hideSpotlight: true,
    enter: ['startDemoGame', 'ensure3d', 'closeSidebar', 'autoRotateOn'],
    autoAdvanceMs: 7000,
    nextLabel: 'Keep exploring',
  },
  {
    id: 'camera',
    title: 'Orbit the camera',
    body: 'Free drag spins the room. Fixed locks a preset angle. On phones, tap Cam to open this.',
    target: 'camera',
    placement: 'left',
    screen: 'game',
    dim: 'full',
    enter: ['ensure3d', 'autoRotateOff', 'openCamera', 'closeSidebar'],
  },
  {
    id: 'view-toggle',
    title: '2D, 3D & themes',
    body: 'Flip between classic 2D and 3D anytime. Theme swatches live here during a game too.',
    target: 'view-toggle',
    placement: 'bottom',
    screen: 'game',
    enter: ['autoRotateOff', 'closeSidebar'],
  },
  {
    id: 'mobile-bar',
    title: 'Mobile game bar',
    body: 'Turn status, step through moves, and Menu for the full game panel.',
    target: 'mobile-bar',
    placement: 'top',
    screen: 'game',
    mobileOnly: true,
    enter: ['closeSidebar'],
  },
  {
    id: 'sidebar-game',
    title: 'Game panel',
    body: 'Room code, mode, whose turn it is, and clocks when you play timed. On mobile this slides up from Menu.',
    target: 'sidebar-game',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-history',
    title: 'Time travel',
    body: 'Step back and forward through the game without changing the live position.',
    target: 'sidebar-history',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-coach',
    title: 'Coach',
    body: 'In bot and local games: hint, review the last move, or scan threats.',
    target: 'sidebar-coach',
    placement: 'left',
    screen: 'game',
    optional: true,
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-invite',
    title: 'Invite a friend',
    body: 'Online rooms get a share link — they sit as Black on their device.',
    target: 'sidebar-invite',
    placement: 'left',
    screen: 'game',
    optional: true,
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-actions',
    title: 'Draws & resign',
    body: 'Offer or claim a draw, resign, or wait out a reply from your opponent.',
    target: 'sidebar-actions',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-moves',
    title: 'Move list',
    body: 'Every SAN move lands here so you can recap the game at a glance.',
    target: 'sidebar-moves',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'sidebar-leave',
    title: 'Back to lobby',
    body: 'Leave the room anytime. Your next game starts from the lobby.',
    target: 'sidebar-leave',
    placement: 'left',
    screen: 'game',
    enter: ['openSidebar'],
  },
  {
    id: 'brand',
    title: 'ChessArena lobby',
    body: 'Home base for online rooms, bots, and hot-seat — 2D or immersive 3D.',
    target: 'brand',
    placement: 'bottom',
    screen: 'lobby',
    enter: ['autoRotateOff', 'closeSidebar', 'ensureLobbyPlay'],
  },
  {
    id: 'theme',
    title: 'Themes',
    body: 'Swap board and room looks. Your pick is saved for next time.',
    target: 'theme',
    placement: 'bottom',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'nav',
    title: 'Account & social',
    body: 'Sign in for profile, friends, challenges, and the leaderboard. Guests can still play.',
    target: 'nav',
    placement: 'bottom',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'play',
    title: 'Play now',
    body: 'Four ways in: vs bot (either color), an online room, or hot-seat on one device.',
    target: 'play',
    placement: 'top',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'play-bot',
    title: 'Play vs Bot',
    body: 'Practice against the engine as White. Tap the card to jump into a room.',
    target: 'play-bot',
    placement: 'top',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'play-bot-black',
    title: 'Bot as White',
    body: 'Take Black and let the engine move first — great for learning defense.',
    target: 'play-bot-black',
    placement: 'top',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'play-online',
    title: 'Online room',
    body: 'Create a room, copy the invite, and play live over the web.',
    target: 'play-online',
    placement: 'top',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'play-local',
    title: 'Hot seat',
    body: 'Two players, one screen — pass the device between White and Black.',
    target: 'play-local',
    placement: 'top',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'bot-level',
    title: 'Bot strength',
    body: 'Beginner through master. Pick a level before you tap Play vs Bot.',
    target: 'bot-level',
    placement: 'top',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'join',
    title: 'Join a room',
    body: 'Paste a room code or invite link to sit as the second player.',
    target: 'join',
    placement: 'top',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'server',
    title: 'Server status',
    body: 'The live chess API lives here. If it is waking up, wait a moment and retry.',
    target: 'server',
    placement: 'top',
    screen: 'lobby',
    optional: true,
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'lobby-hero',
    title: 'The battlefield',
    body: 'Procedural 3D pieces, live multiplayer, adjustable bots, and a built-in coach.',
    target: 'lobby-hero',
    placement: 'top',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'lobby-features',
    title: 'What’s included',
    body: 'Legal-move hints, drag-and-drop, ratings, friends, and more — all in one arena.',
    target: 'lobby-features',
    placement: 'top',
    screen: 'lobby',
    enter: ['ensureLobbyPlay'],
  },
  {
    id: 'done',
    title: 'You’re in',
    body: 'Orbit the room, drag pieces to move, and use Menu on mobile. Replay anytime from Tutorial.',
    placement: 'center',
    screen: 'any',
    enter: ['closeSidebar', 'autoRotateOff'],
    nextLabel: 'Enter the arena',
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
