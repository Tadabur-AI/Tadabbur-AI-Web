type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'icon';

interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  stretch?: boolean;
  className?: string;
}

export function buttonClassName({
  variant = 'secondary',
  size = 'md',
  stretch = false,
  className = '',
}: ButtonClassOptions = {}) {
  const variantClassName = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];

  const sizeClassName = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    icon: 'h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 aspect-square p-0',
  }[size];

  return [
    variantClassName,
    sizeClassName,
    stretch ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export type { ButtonSize, ButtonVariant };
