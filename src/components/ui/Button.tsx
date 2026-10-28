import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/format';

type Variant = 'primary' | 'ink' | 'outline' | 'tinted' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-full font-medium select-none whitespace-nowrap ' +
  'transition-[background-color,box-shadow,transform,color] duration-fast ease-standard ' +
  'focus-visible:outline-none focus-visible:shadow-focus active:scale-95 ' +
  'disabled:cursor-not-allowed disabled:active:scale-100';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-fg-on-dark hover:bg-primary-hover active:bg-primary-pressed shadow-xs disabled:bg-disabled-bg disabled:text-disabled-text disabled:shadow-none',
  ink: 'bg-ink text-fg-on-dark hover:bg-ink-hover disabled:bg-disabled-bg disabled:text-disabled-text',
  outline: 'bg-surface text-fg border border-line-strong hover:bg-surface-muted hover:border-primary active:bg-surface-sunken disabled:text-disabled-text disabled:border-line',
  tinted: 'bg-primary-subtle text-fg border border-primary-subtle-strong hover:bg-primary-subtle-strong disabled:text-disabled-text',
  ghost: 'bg-transparent text-fg hover:bg-primary-subtle active:bg-primary-subtle-strong disabled:text-disabled-text',
  danger: 'bg-error text-fg-on-dark hover:opacity-90 disabled:bg-disabled-bg disabled:text-disabled-text',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-body-sm',
  md: 'h-10 px-5 text-body',
  lg: 'h-12 px-6 text-body-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leading, trailing, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {/* width is locked while loading: content stays in flow but invisible */}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
        {leading}
        {children}
        {trailing}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <Loader2 className="animate-spin" size={20} />
        </span>
      )}
    </button>
  );
});

type IconVariant = 'ghost' | 'tinted' | 'ink' | 'primary' | 'outline' | 'dark';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: IconVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const iconVariants: Record<IconVariant, string> = {
  ghost: 'text-fg hover:bg-primary-subtle active:bg-primary-subtle-strong disabled:text-disabled-text',
  tinted: 'bg-primary-subtle text-primary hover:bg-primary-subtle-strong disabled:text-disabled-text',
  ink: 'bg-ink text-fg-on-dark hover:bg-ink-hover disabled:bg-disabled-bg disabled:text-disabled-text',
  primary: 'bg-primary text-fg-on-dark hover:bg-primary-hover active:bg-primary-pressed disabled:bg-disabled-bg disabled:text-disabled-text',
  outline: 'bg-surface border border-line-strong text-fg hover:border-primary hover:text-primary disabled:text-disabled-text',
  dark: 'border border-line-dark text-fg-on-dark hover:bg-dark-card2 disabled:opacity-50',
};

const iconSizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-fast ease-standard',
        'focus-visible:outline-none focus-visible:shadow-focus active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100',
        iconVariants[variant],
        iconSizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" size={20} aria-hidden /> : children}
    </button>
  );
});
