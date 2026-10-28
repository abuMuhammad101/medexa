import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/format';

export function Card({
  tone = 'light',
  title,
  actions,
  className,
  children,
  ai,
  ...rest
}: {
  tone?: 'light' | 'dark';
  title?: ReactNode;
  actions?: ReactNode;
  ai?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section
      className={cn(
        'rounded-xl',
        tone === 'light' ? 'bg-surface text-fg shadow-xs' : 'bg-dark-card text-fg-on-dark shadow-raised',
        ai && 'ai-ring shadow-ai',
        className,
      )}
      {...rest}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-6 pt-5">
          {typeof title === 'string' ? <h2 className="text-h3 font-medium">{title}</h2> : title}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
