import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import LogoLandscape from '../components/common/LogoLandscape';
import ThemeToggle from '../components/common/ThemeToggle';
import { buttonClassName } from '../components/ui/buttonClassName';
import { IconButton } from '../components/ui/primitives';
import { FiMenu, FiX } from 'react-icons/fi';

type PrimaryNav = 'quran' | 'notes' | 'settings';

interface AppShellProps {
  activeNav: PrimaryNav;
  headerAccessory?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

const navItems: Array<{ key: PrimaryNav; label: string; path: string }> = [
  { key: 'quran', label: 'Quran', path: '/surahs' },
  { key: 'notes', label: 'Notes', path: '/notes' },
  { key: 'settings', label: 'Settings', path: '/settings' },
];

const OPEN_MOBILE_MENU_EVENT = 'tadabbur:open-mobile-menu';

export default function AppShell({
  activeNav,
  headerAccessory,
  children,
  contentClassName = '',
}: AppShellProps) {
  const mobileMenuId = useId();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    const handleOpenMobileMenu = () => {
      setIsMobileMenuOpen(true);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener(OPEN_MOBILE_MENU_EVENT, handleOpenMobileMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener(OPEN_MOBILE_MENU_EVENT, handleOpenMobileMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-background">
      <a href="#app-main" className="skip-link">
        Skip to main content
      </a>

      {isMobileMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-dropdown bg-black/45 backdrop-blur-[1px] sm:hidden"
            onClick={closeMobileMenu}
          />

          <aside
            id={mobileMenuId}
            className="fixed inset-y-0 left-0 z-modal flex w-[280px] max-w-[calc(100vw-1.5rem)] flex-col border-r border-border bg-surface px-3 py-3 shadow-[0_24px_80px_rgba(20,20,18,0.22)] sm:hidden"
            aria-label="Mobile navigation"
            aria-modal="true"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3 rounded-[24px] px-2 py-1">
              <Link
                to="/surahs"
                className="inline-flex min-w-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-2"
                onClick={closeMobileMenu}
              >
                <LogoLandscape />
              </Link>

              <IconButton label="Close menu" className="sm:hidden" onClick={closeMobileMenu}>
                <FiX size={18} />
              </IconButton>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto px-1 py-4" aria-label="Mobile">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  to={item.path}
                  aria-current={item.key === activeNav ? 'page' : undefined}
                  className={buttonClassName({
                    variant: item.key === activeNav ? 'primary' : 'ghost',
                    stretch: true,
                    className: 'justify-start rounded-[20px]',
                  })}
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-border px-2 pt-4">
              <ThemeToggle className="w-full justify-center" />
            </div>
          </aside>
        </>
      ) : null}

      <header className="sticky top-0 z-sticky bg-background/70 px-4 pb-2 pt-3 backdrop-blur sm:px-6 xl:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 rounded-[28px] bg-surface/95 px-4 py-3 shadow-[0_16px_40px_rgba(20,20,18,0.08)] backdrop-blur sm:px-5">
          <div className="flex items-center gap-2">
            <IconButton
              label="Open menu"
              className="sm:hidden"
              aria-controls={mobileMenuId}
              aria-expanded={isMobileMenuOpen}
              onClick={openMobileMenu}
            >
              <FiMenu size={18} />
            </IconButton>

            <Link
              to="/surahs"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-2"
            >
              <LogoLandscape />
            </Link>
          </div>

          <nav className="hidden flex-1 items-center gap-2 sm:flex" aria-label="Primary">
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
