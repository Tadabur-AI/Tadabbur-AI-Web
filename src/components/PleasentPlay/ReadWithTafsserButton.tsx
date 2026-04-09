import type { ButtonHTMLAttributes } from 'react';
import { FiBookOpen } from 'react-icons/fi';
import { ActionButton } from '../ui/primitives';

interface ReadWithTafsserButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function ReadWithTafsserButton({ 
  label = 'Read', 
  className = '', 
  type = 'button', 
  ...rest 
}: ReadWithTafsserButtonProps) {
  return (
    <ActionButton
      type={type}
      variant="secondary"
      className={className}
      {...rest}
    >
      <FiBookOpen size={16} />
      {label}
    </ActionButton>
  );
}
