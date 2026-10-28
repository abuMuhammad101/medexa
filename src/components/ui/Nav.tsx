import { forwardRef, useRef, type KeyboardEvent, type ReactNode } from 'react';
import * as RTooltip from '@radix-ui/react-tooltip';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/format';

/** Segmented control (radio group semantics, arrow keys move). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const n = (i + dir + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md bg-surface-sunken p-1 glass">
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => (refs.current[i] = el)}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'rounded-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus',
              size === 'md' ? 'h-9 px-4 text-body' : 'h-7 px-3 text-body-sm',
              active ? 'bg-surface text-fg shadow-xs' : 'text-fg-secondary hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const RangeSegmentedControl = SegmentedControl;

/** Pill tab used in SOAP tabs. Status dot: reviewed (green) or gaps (amber). */
export const Tab = forwardRef<
  HTMLButtonElement,
  { active?: boolean; status?: 'reviewed' | 'gaps' | 'none'; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Tab({ active, status = 'none', children, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={active}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full px-5 text-body font-medium transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:shadow-focus disabled:text-disabled-text',
        active ? 'border border-primary bg-primary-subtle text-fg' : 'border border-transparent text-fg-secondary hover:bg-surface-muted hover:text-fg',
        className,
      )}
      {...rest}
    >
      {status !== 'none' && (
        <span className={cn('h-1.5 w-1.5 rounded-full', status === 'reviewed' ? 'bg-success' : 'bg-warning')} aria-hidden />
      )}
      {children}
      {status !== 'none' && <span className="sr-only">{status === 'reviewed' ? '(reviewed)' : '(has gaps)'}</span>}
    </button>
  );
});

export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <RTooltip.Root delayDuration={250}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-xs rounded-sm bg-ink px-2.5 py-1.5 text-caption text-fg-on-dark shadow-raised"
        >
          {content}
          <RTooltip.Arrow className="fill-ink" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

/** Side-rail item. Collapsed rail shows the label in a tooltip. */
export function NavItem({
  to,
  icon,
  label,
  end,
  onClick,
}: {
  to?: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  onClick?: () => void;
}) {
  const cls = (active: boolean) =>
    cn(
      'flex h-11 w-11 items-center justify-center rounded-md transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus',
      active ? 'bg-primary text-fg-on-dark shadow-raised' : 'text-fg hover:bg-primary-subtle',
    );
  return (
    <Tooltip content={label} side="right">
      {to ? (
        <NavLink to={to} end={end} aria-label={label} className={({ isActive }) => cls(isActive)}>
          {icon}
        </NavLink>
      ) : (
        <button type="button" aria-label={label} onClick={onClick} className={cls(false)}>
          {icon}
        </button>
      )}
    </Tooltip>
  );
}
