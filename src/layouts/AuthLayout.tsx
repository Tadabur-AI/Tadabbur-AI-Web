import type { ReactNode } from "react";

interface AuthLayoutProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
}

export default function AuthLayout({ leftContent, rightContent }: AuthLayoutProps) {
  return (
    <div className="flex h-screen w-full sm:flex-row flex-col items-center sm:justify-center sm:justify-between">
      <div className="sm:w-1/2 w-full sm:p-8 p-2 h-full flex items-center justify-center ">
        {leftContent}
      </div>

      <div className="sm:w-1/2 w-full sm:p-8 p-2 h-full flex items-center justify-center ">
        {rightContent}
      </div>
    </div>
  );
}
