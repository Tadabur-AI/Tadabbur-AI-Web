import type { ButtonHTMLAttributes } from 'react';
import { FiBookOpen } from 'react-icons/fi';

interface ReadWithTafsserButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function ReadWithTafsserButton({ 
  label = 'Tafsir', 
  className = '', 
  type = 'button', 
  ...rest 
}: ReadWithTafsserButtonProps) {
  return (
    <button
      type={type}
      className={`btn-secondary ${className}`}
      {...rest}
    >
      <FiBookOpen size={16} />
      {label}
    </button>
  );
}
