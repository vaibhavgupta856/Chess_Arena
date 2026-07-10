import { BOARD_THEMES } from '../lib/themes'
import { useTheme } from '../hooks/useTheme'

export function ThemePicker() {
  const { themeId, setThemeId } = useTheme()

  return (
    <div className="theme-picker">
      <span className="theme-picker-label">Theme</span>
      <div className="theme-picker-options">
        {BOARD_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={themeId === theme.id ? 'active' : ''}
            onClick={() => setThemeId(theme.id)}
            title={theme.name}
            style={{
              background: `linear-gradient(135deg, ${theme.tileDark} 50%, ${theme.tileLight} 50%)`,
            }}
          >
            <span className="sr-only">{theme.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
