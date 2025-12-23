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
        return 'Switch to system preference';
      case 'system':
        return 'Switch to light mode';
      default:
        return 'Toggle theme';
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center justify-center gap-2 rounded-lg border border-gray-300 p-2 text-sm font-medium transition-colors hover:border-primary hover:bg-gray-50 dark:border-gray-600 dark:hover:border-primary dark:hover:bg-gray-800 ${className}`}
      title={getTitle()}
      aria-label={getTitle()}
    >
      {getIcon()}
      {showLabel && <span className="hidden sm:inline">{getLabel()}</span>}
    </button>
  );
}
