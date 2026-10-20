import Icon from './Icon.jsx';
import { THEMES, THEME_ICONS, THEME_LABELS, useTheme } from '../theme.js';

/**
 * Segmented control for choosing Light, Dark or System appearance.
 * Keyboard accessible (native buttons) and announces the active choice.
 */
export default function ThemeSelector({ className = '' }) {
  const { theme, resolved, setTheme } = useTheme();

  return (
    <div className={`theme-switch ${className}`.trim()} role="group" aria-label="Colour theme">
      <span className="sr-only" role="status" aria-live="polite">
        {THEME_LABELS[theme]} theme selected, currently showing {THEME_LABELS[resolved]}.
      </span>

      {THEMES.map((option) => {
        const active = theme === option;

        return (
          <button
            key={option}
            type="button"
            className={`theme-option ${active ? 'active' : ''}`}
            onClick={() => setTheme(option)}
            aria-pressed={active}
            title={`${THEME_LABELS[option]} theme`}
          >
            <Icon name={THEME_ICONS[option]} size={16} />
            <span className="theme-option-label">{THEME_LABELS[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
