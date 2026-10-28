import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import * as RSelect from '@radix-ui/react-select';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../../lib/format';
import { Kbd } from './Pills';

const control =
  'w-full rounded-md border bg-surface px-4 text-body-lg text-fg placeholder:text-fg-tertiary transition-[border-color,box-shadow] duration-fast ' +
  'hover:border-line-strong focus:outline-none focus:border-primary focus:shadow-focus ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-disabled-text';

function FieldShell({
  id,
  label,
  note,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label?: ReactNode;
  note?: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={id} className="text-body text-fg">
          {label} {note && <span className="text-caption text-fg-tertiary">{note}</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-body-sm text-error-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-body-sm text-fg-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  note?: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  wrapperClassName?: string;
  trailing?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, note, error, hint, wrapperClassName, className, id: idProp, trailing, ...rest },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} note={note} error={error} hint={hint} className={wrapperClassName}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className={cn(control, 'h-12', error ? 'border-error' : 'border-line-strong', !!trailing && 'pr-12', className)}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>}
      </div>
    </FieldShell>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; error?: string | null; maxLength?: number; wrapperClassName?: string }
>(function Textarea({ label, error, maxLength = 600, className, wrapperClassName, id: idProp, value, ...rest }, ref) {
  const auto = useId();
  const id = idProp ?? auto;
  const len = typeof value === 'string' ? value.length : 0;
  return (
    <FieldShell id={id} label={label} error={error} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={!!error || undefined}
        className={cn(control, 'min-h-20 py-3 text-body', error ? 'border-error' : 'border-line-strong', className)}
        {...rest}
      />
      <span className="self-end text-caption text-fg-tertiary tabular" aria-live="polite">
        {len}/{maxLength}
      </span>
    </FieldShell>
  );
});

export const SearchField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { shortcut?: string; label: string }
>(function SearchField({ shortcut, label, className, ...rest }, ref) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search size={16} className="pointer-events-none absolute left-3.5 text-fg-tertiary" aria-hidden />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        className={cn(
          'h-10 w-full rounded-md border border-line bg-surface-glass pl-10 pr-14 text-body text-fg glass placeholder:text-fg-tertiary',
          'hover:border-line-strong focus:outline-none focus:border-primary focus:shadow-focus',
        )}
        {...rest}
      />
      {shortcut && (
        <span className="pointer-events-none absolute right-3">
          <Kbd>{shortcut}</Kbd>
        </span>
      )}
    </div>
  );
});

export function Select<T extends string>({
  label,
  note,
  value,
  onChange,
  options,
  placeholder = 'Select',
  error,
  disabled,
  id: idProp,
  onBlur,
  size = 'lg',
  className,
}: {
  label?: ReactNode;
  note?: ReactNode;
  value: T | '';
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  id?: string;
  onBlur?: () => void;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} note={note} error={error} className={className}>
      <RSelect.Root
        value={value || undefined}
        onValueChange={(v) => onChange(v as T)}
        disabled={disabled}
        onOpenChange={(o) => !o && onBlur?.()}
      >
        <RSelect.Trigger
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn(
            control,
            'flex items-center justify-between text-left data-[placeholder]:text-fg-tertiary',
            size === 'lg' ? 'h-12' : 'h-9 px-3 text-body',
            error ? 'border-error' : 'border-line-strong',
          )}
        >
          <RSelect.Value placeholder={placeholder} />
          <RSelect.Icon>
            <ChevronDown size={20} className="text-fg-secondary" aria-hidden />
          </RSelect.Icon>
        </RSelect.Trigger>
        <RSelect.Portal>
          <RSelect.Content
            position="popper"
            sideOffset={6}
            className="z-[70] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-line bg-surface p-1 shadow-modal"
          >
            <RSelect.Viewport>
              {options.map((o) => (
                <RSelect.Item
                  key={o.value}
                  value={o.value}
                  className="flex h-10 cursor-pointer items-center justify-between gap-3 rounded-sm px-3 text-body text-fg outline-none data-[highlighted]:bg-primary-subtle data-[state=checked]:font-medium"
                >
                  <RSelect.ItemText>{o.label}</RSelect.ItemText>
                  <RSelect.ItemIndicator>
                    <Check size={16} className="text-primary" aria-hidden />
                  </RSelect.ItemIndicator>
                </RSelect.Item>
              ))}
            </RSelect.Viewport>
          </RSelect.Content>
        </RSelect.Portal>
      </RSelect.Root>
    </FieldShell>
  );
}
