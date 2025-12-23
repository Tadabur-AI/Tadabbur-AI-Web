import type { ButtonHTMLAttributes } from 'react';
import { FaRobot } from 'react-icons/fa';

interface ReadWithTafsserButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function ReadWithTafsserButton({ label = 'Read with Tafsser', className = '', type = 'button', ...rest }: ReadWithTafsserButtonProps) {
  return (
    <button
      type={type}
      className={`flex items-center gap-2 rounded-md w-fit px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed bg-white border border-gray-200 hover:bg-gray-50 ${className}`}
      {...rest}
    >
      <FaRobot size={16} />
      {label}
    </button>
  );
}
