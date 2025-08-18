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
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <div className={`sm:block ${isSidebarOpen ? "block" : "hidden"} w-64`}>
        <div className="h-full flex flex-col">
          <div className="p-4 text-center font-bold">
            <LogoPotrait />
          </div>
          <div className="flex-1 overflow-y-auto">
            {props.sidebarItems?.map((item, index) => (
              <div
                key={index}
                className="flex items-center p-4 cursor-pointer"
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="sm:hidden"
          >
            {isSidebarOpen ? (
              <FiMenu className="text-2xl" />
            ) : (
              <FiMenu className="text-2xl rotate-180" />
            )}
          </button>
          <div className="font-bold">{props.screenTitle}</div>
          <div>{props.userProfile}</div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{props.children}</div>
      </div>
    </div>
  );
}
