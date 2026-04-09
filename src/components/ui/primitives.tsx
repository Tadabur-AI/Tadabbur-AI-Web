import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonClassName';
import Overlay from './Overlay';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  stretch?: boolean;
  children: ReactNode;
}

export function ActionButton({
  variant = 'secondary',
  size = 'md',
  stretch = false,
  className = '',
  type = 'button',
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, stretch, className })}
      {...props}
    >
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
}

export function IconButton({
  label,
  variant = 'ghost',
  className = '',
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={buttonClassName({ variant, size: 'icon', className })}
      {...props}
    >
      <span aria-hidden="true" className="inline-flex h-full w-full shrink-0 items-center justify-center">
        {children}
      </span>
    </button>
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  hintId?: string;
  labelHidden?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  hint,
  hintId,
  labelHidden = false,
  className = '',
  children,
}: FieldProps) {
  const generatedHintId = useId();
  const resolvedHintId = hint ? hintId ?? generatedHintId : undefined;
  const labelClassName = labelHidden
    ? 'sr-only'
    : 'text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-text-muted';

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`.trim()}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClassName}>
          {label}
        </label>
      ) : (
        <span className={labelClassName}>
          {label}
        </span>
      )}
      {children}
      {hint ? (
        <span id={resolvedHintId} className="text-xs leading-5 text-text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

interface ContentGroupProps {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function ContentGroup({ label, hint, className = '', children }: ContentGroupProps) {
  const labelId = useId();
  const hintId = useId();

  return (
    <section
      aria-labelledby={labelId}
      aria-describedby={hint ? hintId : undefined}
      className={`flex min-w-0 flex-col gap-3 ${className}`.trim()}
    >
      <div className="space-y-1">
        <h3 id={labelId} className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
          {label}
        </h3>
        {hint ? (
          <p id={hintId} className="text-sm leading-6 text-text-muted">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  options: SelectOption[];
  wrapperClassName?: string;
}

export function SelectField({
  label,
  hint,
  options,
  wrapperClassName = '',
  id,
  className = '',
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const generatedHintId = useId();
  const inputId = id ?? generatedId;
  const describedBy = [props['aria-describedby'], hint ? generatedHintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <Field label={label} htmlFor={inputId} hint={hint} hintId={generatedHintId} className={wrapperClassName}>
      <select id={inputId} className={`field-control ${className}`.trim()} {...props} aria-describedby={describedBy}>
        {options.map((option) => (
          <option key={`${option.value}`} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  wrapperClassName?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
}

export function TextAreaField({
  label,
  hint,
  wrapperClassName = '',
  id,
  className = '',
  textareaRef,
  ...props
}: TextAreaFieldProps) {
  const generatedId = useId();
  const generatedHintId = useId();
  const inputId = id ?? generatedId;
  const describedBy = [props['aria-describedby'], hint ? generatedHintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <Field label={label} htmlFor={inputId} hint={hint} hintId={generatedHintId} className={wrapperClassName}>
      <textarea
        id={inputId}
        ref={textareaRef}
        className={`field-control field-textarea ${className}`.trim()}
        {...props}
        aria-describedby={describedBy}
      />
    </Field>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-text text-balance sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm leading-7 text-text-muted sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

interface PanelProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, description, actions, className = '', children }: PanelProps) {
  return (
    <section className={`panel ${className}`.trim()}>
      {title || description || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 pb-4">
          <div className="min-w-0 space-y-1">
            {title ? <h2 className="text-base font-semibold text-text">{title}</h2> : null}
            {description ? <p className="text-sm leading-6 text-text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface SegmentedControlItem<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  items: SegmentedControlItem<T>[];
  onChange: (value: T) => void;
  labelHidden?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  items,
  onChange,
  labelHidden = false,
  className = '',
}: SegmentedControlProps<T>) {
  const groupName = useId();
  const legendClassName = labelHidden
    ? 'sr-only'
    : 'text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-text-muted';

  return (
    <fieldset className={`space-y-2 ${className}`.trim()}>
      <legend className={legendClassName}>
        {label}
      </legend>
      <div className="segmented-control">
        {items.map((item) => {
          const selected = item.value === value;
          const optionId = `${groupName}-${item.value}`;
          return (
            <label
              key={item.value}
              htmlFor={optionId}
              className={`segmented-control__option ${selected ? 'is-active' : ''} ${item.disabled ? 'is-disabled' : ''}`.trim()}
            >
              <input
                id={optionId}
                type="radio"
                name={groupName}
                value={item.value}
                checked={selected}
                disabled={item.disabled}
                onChange={() => onChange(item.value)}
                className="segmented-control__input"
              />
              <span className="segmented-control__label">{item.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-start gap-4 rounded-[24px] border border-dashed border-border bg-surface px-5 py-6 sm:px-6 ${className}`.trim()}
    >
      {icon ? (
        <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="max-w-2xl text-sm leading-7 text-text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  isBusy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  isBusy = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  if (!open) {
    return null;
  }

  return (
    <Overlay
      open={open}
      onClose={isBusy ? () => undefined : onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      surfaceClassName="w-full max-w-md rounded-[28px] border border-border bg-surface p-6 shadow-[0_24px_80px_rgba(20,20,18,0.2)]"
    >
      <div>
        <div className="space-y-3">
          <h2 id={titleId} className="text-xl font-semibold text-text">
            {title}
          </h2>
          <p id={descriptionId} className="text-sm leading-7 text-text-muted">
            {description}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" onClick={onClose} disabled={isBusy}>
            {cancelLabel}
          </ActionButton>
          <ActionButton variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={isBusy}>
            {confirmLabel}
          </ActionButton>
        </div>
      </div>
    </Overlay>
  );
}

export function PoliteLiveRegion({ message }: { message: string }) {
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}

export function usePoliteStatus(timeoutMs = 2200) {
  const [message, setMessage] = useState('');
  const clearTimerRef = useRef<number | null>(null);
  const announceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
      }
      if (announceTimerRef.current !== null) {
        window.clearTimeout(announceTimerRef.current);
      }
    };
  }, []);

  const announce = useCallback(
    (nextMessage: string) => {
      if (announceTimerRef.current !== null) {
        window.clearTimeout(announceTimerRef.current);
      }
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
      }

      setMessage('');

      announceTimerRef.current = window.setTimeout(() => {
        setMessage(nextMessage);
      }, 20);

      clearTimerRef.current = window.setTimeout(() => {
        setMessage('');
      }, timeoutMs);
    },
    [timeoutMs],
  );

  return { message, announce };
}
