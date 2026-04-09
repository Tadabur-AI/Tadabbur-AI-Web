import type { ButtonHTMLAttributes } from 'react';
import { FiPlay } from 'react-icons/fi';
import { ActionButton } from '../ui/primitives';

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
    <ActionButton
      type={type}
      variant="primary"
      className={className}
      {...rest}
    >
      <FiPlay size={16} aria-hidden="true" />
      {label}
    </ActionButton>
  );
}
