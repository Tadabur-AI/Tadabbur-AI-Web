import type { ButtonHTMLAttributes } from 'react';
import { FiPlay } from 'react-icons/fi';

interface PlayPleasentlyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function PlayPleasentlyButton({ label = 'Play Pleasantly', className = '', type = 'button', ...rest }: PlayPleasentlyButtonProps) {
  return (
    <button
      type={type}
      className={`flex items-center gap-2 rounded-md w-fit px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-300 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-l from-green-500 via-yellow-500 to-green-500 shadow-md hover:shadow-lg ${className}`}
      {...rest}
    >
      <FiPlay size={16} />
      {label}
    </button>
  );
}
