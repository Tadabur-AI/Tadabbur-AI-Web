import { FiMoon, FiSun, FiMonitor } from 'react-icons/fi';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <FiSun className="h-5 w-5" />;
      case 'dark':
        return <FiMoon className="h-5 w-5" />;
      case 'system':
        return <FiMonitor className="h-5 w-5" />;
      default:
        return <FiSun className="h-5 w-5" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'Light';
    }
  };

  const getTitle = () => {
    switch (theme) {
      case 'light':
        return 'Switch to dark mode';
      case 'dark':
        return 'Switch to light mode';
      case 'system':
        return 'Switch to dark mode';
      default:
        return 'Toggle theme';
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border p-0 text-sm font-medium transition-colors hover:border-primary hover:bg-surface-2 ${className}`}
      title={getTitle()}
      aria-label={getTitle()}
    >
      <span aria-hidden="true" className="inline-flex items-center justify-center">
        {getIcon()}
      </span>
      {showLabel && <span className="hidden sm:inline">{getLabel()}</span>}
    </button>
  );
}
