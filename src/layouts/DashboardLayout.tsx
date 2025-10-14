import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import LogoPotrait from "../components/common/LogoPotrait";

export interface sidebarItems {
  label: string;
  icon?: React.ReactNode;
  path: string;
}
interface DashboardLayoutProps {
  sidebarItems: sidebarItems[];
  children?: React.ReactNode;
  screenTitle?: string | React.ReactNode;
  userProfile?: React.ReactNode;
}
export default function DashboardLayout(props: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen min-w-[50px] w-full overflow-hidden">
      {/* Sidebar */}
      <div className={`sm:block ${isSidebarOpen ? "block" : "hidden"} w-[min(16rem,100vw)] sm:w-64`}>
        <div className="flex h-full flex-col">
          <div className="p-3 text-center text-base font-bold sm:p-4">
            <LogoPotrait />
          </div>
          <div className="flex-1 overflow-y-auto">
            {props.sidebarItems?.map((item, index) => (
              <div
                key={index}
                className="flex cursor-pointer items-center gap-2 p-3 text-sm sm:p-4 sm:text-base"
                onClick={() => navigate(item?.path)}
              >
                {item?.icon && <span className="mr-2">{item?.icon}</span>}
                <p>{item?.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3 sm:flex-nowrap sm:p-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center justify-center rounded border border-transparent p-2 text-lg sm:hidden"
          >
            {isSidebarOpen ? (
              <FiMenu className="text-2xl" />
            ) : (
              <FiMenu className="text-2xl rotate-180" />
            )}
          </button>
          <div className="min-w-0 flex-1 text-sm font-bold sm:text-base">
            <div className="truncate">{props.screenTitle}</div>
          </div>
          <div className="flex min-w-0 shrink-0 justify-end text-xs sm:text-sm">
            {props.userProfile}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">{props.children}</div>
      </div>
    </div>
  );
}
