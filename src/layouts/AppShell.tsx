import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import LogoLandscape from '../components/common/LogoLandscape';
import ThemeToggle from '../components/common/ThemeToggle';
import { buttonClassName } from '../components/ui/buttonClassName';

type PrimaryNav = 'quran' | 'notes';

interface AppShellProps {
  activeNav: PrimaryNav;
  headerAccessory?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

const navItems: Array<{ key: PrimaryNav; label: string; path: string }> = [
  { key: 'quran', label: 'Quran', path: '/surahs' },
  { key: 'notes', label: 'Notes', path: '/notes' },
];

export default function AppShell({
  activeNav,
  headerAccessory,
  children,
  contentClassName = '',
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <a href="#app-main" className="skip-link">
        Skip to main content
      </a>

      <header className="sticky top-0 z-sticky bg-background/70 px-4 pb-2 pt-3 backdrop-blur sm:px-6 xl:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 rounded-[28px] bg-surface/95 px-4 py-3 shadow-[0_16px_40px_rgba(20,20,18,0.08)] backdrop-blur sm:px-5">
          <Link
            to="/surahs"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-2"
          >
            <LogoLandscape />
          </Link>

          <nav className="flex flex-1 items-center gap-2" aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                aria-current={item.key === activeNav ? 'page' : undefined}
                className={buttonClassName({
                  variant: item.key === activeNav ? 'primary' : 'ghost',
                  className: item.key === activeNav ? 'shadow-[0_12px_32px_rgba(4,120,87,0.18)]' : '',
                })}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {headerAccessory}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="app-main" className={`mx-auto max-w-[1440px] px-4 py-6 sm:px-6 xl:px-8 ${contentClassName}`.trim()}>
        {children}
      </main>
    </div>
  );
}
