import type { ReactNode } from "react";

interface AuthLayoutProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
}

export default function AuthLayout({ leftContent, rightContent }: AuthLayoutProps) {
  return (
    <div className="flex h-screen min-w-[50px] w-full flex-col items-center justify-center gap-2 overflow-hidden sm:flex-row sm:justify-between">
      <div className="flex h-full w-full min-w-0 items-center justify-center p-2 sm:w-1/2 sm:p-8">
        {leftContent}
      </div>

      <div className="flex h-full w-full min-w-0 items-center justify-center p-2 sm:w-1/2 sm:p-8">
        {rightContent}
      </div>
    </div>
  );
}
