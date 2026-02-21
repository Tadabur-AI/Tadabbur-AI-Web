import type { ButtonHTMLAttributes } from 'react';
import { FiPlay } from 'react-icons/fi';

interface PlayPleasentlyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function PlayPleasentlyButton({ 
  label = 'Play', 
  className = '', 
  type = 'button', 
  ...rest 
}: PlayPleasentlyButtonProps) {
  return (
    <button
      type={type}
      className={`btn-primary ${className}`}
      {...rest}
    >
      <FiPlay size={16} />
      {label}
    </button>
  );
}
