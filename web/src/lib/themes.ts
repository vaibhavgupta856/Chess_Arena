export type BoardTheme = {
  id: string
  name: string
  background: string
  fog: string
  ground: string
  tileLight: string
  tileDark: string
  boardEdge: string
  whitePiece: string
  whitePieceEmissive: string
  blackPiece: string
  blackPieceEmissive: string
  pieceBaseLight: string
  pieceBaseDark: string
  pieceRingLight: string
  pieceRingDark: string
  highlightSelect: string
  highlightHover: string
  squareLight2d: string
  squareDark2d: string
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'sky',
    name: 'Sky Classic',
    background: '#9ec8e8',
    fog: '#9ec8e8',
    ground: '#1b2430',
    tileLight: '#b8ad92',
    tileDark: '#2a5240',
    boardEdge: '#3d2817',
    whitePiece: '#f8f8ff',
    whitePieceEmissive: '#e8ecff',
    blackPiece: '#d48a3a',
    blackPieceEmissive: '#a85f20',
    pieceBaseLight: '#ececec',
    pieceBaseDark: '#d48a3a',
    pieceRingLight: '#1a2430',
    pieceRingDark: '#3a1f0a',
    highlightSelect: '#5ce1ff',
    highlightHover: '#ff9f43',
    squareLight2d: '#f0d9b5',
    squareDark2d: '#779556',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    background: '#0c1220',
    fog: '#0c1220',
    ground: '#05080f',
    tileLight: '#4a5568',
    tileDark: '#1e293b',
    boardEdge: '#111827',
    whitePiece: '#f1f5f9',
    whitePieceEmissive: '#94a3b8',
    blackPiece: '#f59e0b',
    blackPieceEmissive: '#b45309',
    pieceBaseLight: '#cbd5e1',
    pieceBaseDark: '#f59e0b',
    pieceRingLight: '#0f172a',
    pieceRingDark: '#78350f',
    highlightSelect: '#38bdf8',
    highlightHover: '#a78bfa',
    squareLight2d: '#64748b',
    squareDark2d: '#334155',
  },
  {
    id: 'forest',
    name: 'Forest',
    background: '#87b38d',
    fog: '#a8c9a8',
    ground: '#1a2e1a',
    tileLight: '#c4b896',
    tileDark: '#2d5a3d',
    boardEdge: '#3e2723',
    whitePiece: '#fffef5',
    whitePieceEmissive: '#e8f5e9',
    blackPiece: '#8d5524',
    blackPieceEmissive: '#5d3a1a',
    pieceBaseLight: '#f5f5dc',
    pieceBaseDark: '#8d5524',
    pieceRingLight: '#1b4332',
    pieceRingDark: '#3e2723',
    highlightSelect: '#81c784',
    highlightHover: '#ffd54f',
    squareLight2d: '#e8dcc0',
    squareDark2d: '#4a7c59',
  },
  {
    id: 'royal',
    name: 'Royal Purple',
    background: '#c4b5fd',
    fog: '#ddd6fe',
    ground: '#1e1b4b',
    tileLight: '#e9d5ff',
    tileDark: '#6b21a8',
    boardEdge: '#4c1d95',
    whitePiece: '#faf5ff',
    whitePieceEmissive: '#e9d5ff',
    blackPiece: '#fbbf24',
    blackPieceEmissive: '#d97706',
    pieceBaseLight: '#f3e8ff',
    pieceBaseDark: '#fbbf24',
    pieceRingLight: '#312e81',
    pieceRingDark: '#92400e',
    highlightSelect: '#c084fc',
    highlightHover: '#fb7185',
    squareLight2d: '#ede9fe',
    squareDark2d: '#7c3aed',
  },
]

const STORAGE_KEY = 'chessarena-theme'

export function getStoredThemeId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? 'sky'
}

export function setStoredThemeId(id: string) {
  localStorage.setItem(STORAGE_KEY, id)
}

export function getThemeById(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0]
}

function parseHexColor(hex: string) {
  const normalized = hex.replace('#', '')
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function isColorDark(hex: string): boolean {
  const { r, g, b } = parseHexColor(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.52
}

export type LobbyUiColors = {
  text: string
  textMuted: string
  surface: string
  surfaceHover: string
  border: string
  inputBg: string
  inputBorder: string
}

/** Readable lobby text/surfaces for any board theme background. */
export function getLobbyUiColors(background: string): LobbyUiColors {
  const dark = isColorDark(background)
  if (dark) {
    return {
      text: '#f3f4f6',
      textMuted: 'rgba(243, 244, 246, 0.82)',
      surface: 'rgba(255, 255, 255, 0.06)',
      surfaceHover: 'rgba(170, 59, 255, 0.12)',
      border: 'rgba(255, 255, 255, 0.14)',
      inputBg: 'rgba(0, 0, 0, 0.28)',
      inputBorder: 'rgba(255, 255, 255, 0.2)',
    }
  }
  return {
    text: '#0f172a',
    textMuted: 'rgba(15, 23, 42, 0.72)',
    surface: 'rgba(255, 255, 255, 0.55)',
    surfaceHover: 'rgba(170, 59, 255, 0.1)',
    border: 'rgba(15, 23, 42, 0.12)',
    inputBg: 'rgba(255, 255, 255, 0.75)',
    inputBorder: 'rgba(15, 23, 42, 0.18)',
  }
}
