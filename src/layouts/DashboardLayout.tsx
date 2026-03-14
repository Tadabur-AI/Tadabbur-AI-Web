import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiX } from "react-icons/fi";
import LogoPotrait from "../components/common/LogoPotrait";
import ThemeToggle from "../components/common/ThemeToggle";

export interface SidebarItem {
  label: string;
  icon?: React.ReactNode;
  path?: string;
  onClick?: () => void;
}

interface DashboardLayoutProps {
  sidebarItems: SidebarItem[];
  children?: React.ReactNode;
  screenTitle?: string | React.ReactNode;
  userProfile?: React.ReactNode;
}

export default function DashboardLayout({
  sidebarItems,
  children,
  screenTitle,
  userProfile,
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleItemClick = (item: SidebarItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      navigate(item.path);
    }
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-dropdown sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed sm:sticky top-0 left-0 h-screen w-[260px] z-sticky
          bg-surface border-r border-border flex flex-col
          transition-transform duration-200 ease-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
        `}
      >
        {/* Sidebar Header */}
        <div className="relative h-[56px] flex items-center justify-center px-4 border-b border-border">
          <LogoPotrait />
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="btn-ghost p-2 sm:hidden absolute right-4"
            aria-label="Close sidebar"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Sidebar Content */}
        <nav className="flex-1 overflow-y-auto py-2">
          {sidebarItems?.map((item, index) => (
            <button
              key={index}
              onClick={() => handleItemClick(item)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-muted hover:text-text hover:bg-surface-2 transition-colors text-left"
            >
              {item?.icon && <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 h-[56px] z-sticky bg-surface border-b border-border px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="btn-ghost p-2 sm:hidden"
              aria-label="Open sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="text-base font-semibold truncate">{screenTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {userProfile}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-[1200px] mx-auto p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
