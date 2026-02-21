import type { ButtonHTMLAttributes } from 'react';
import { FaRobot } from 'react-icons/fa';

interface ReadWithTafsserButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function ReadWithTafsserButton({ label = 'Read with Tafsser', className = '', type = 'button', ...rest }: ReadWithTafsserButtonProps) {
  return (
    <button
      type={type}
      className={`flex items-center gap-2 rounded-md w-fit px-4 py-2 text-sm font-semibold uppercase tracking-wide text-text transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed bg-surface border border-border hover:bg-surface-2 ${className}`}
      {...rest}
    >
      <FaRobot size={16} />
      {label}
    </button>
  );
}
