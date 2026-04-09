import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const safeAreaPadding: CSSProperties = {
  paddingTop: 'max(1rem, env(safe-area-inset-top))',
  paddingRight: 'max(1rem, env(safe-area-inset-right))',
  paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
  paddingLeft: 'max(1rem, env(safe-area-inset-left))',
};

const getFocusableNodes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (node) =>
      !node.hasAttribute('disabled') &&
      node.getAttribute('aria-hidden') !== 'true' &&
      node.tabIndex !== -1,
  );

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
  surfaceClassName?: string;
  placement?: 'center' | 'left';
  dismissOnBackdrop?: boolean;
}

export default function Overlay({
  open,
  onClose,
  children,
  labelledBy,
  describedBy,
  className = '',
  surfaceClassName = '',
  placement = 'center',
  dismissOnBackdrop = true,
}: OverlayProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const surface = surfaceRef.current;
      if (!surface) {
        return;
      }

      const focusableNodes = getFocusableNodes(surface);
      (focusableNodes[0] ?? surface).focus();
    }, 16);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !surfaceRef.current) {
        return;
      }

      const focusableNodes = getFocusableNodes(surfaceRef.current);
      if (focusableNodes.length === 0) {
        event.preventDefault();
        surfaceRef.current.focus();
        return;
      }

      const firstNode = focusableNodes[0];
      const lastNode = focusableNodes[focusableNodes.length - 1];
      const activeNode = document.activeElement;

      if (event.shiftKey && activeNode === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && activeNode === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusedElementRef.current?.focus?.();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={[
        'fixed inset-0 z-modal flex bg-black/45 backdrop-blur-sm',
        placement === 'left' ? 'items-stretch justify-start' : 'items-center justify-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={safeAreaPadding}
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={[
          'relative overscroll-contain focus:outline-none',
          surfaceClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
