import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DM from '@radix-ui/react-dropdown-menu';
import { X } from 'lucide-react';
import { cn } from '../../lib/format';
import { IconButton } from './Button';

/**
 * Modal: Radix Dialog gives focus trap, Esc, scroll lock and focus return.
 * `onRequestClose` lets callers intercept close (e.g. "Discard changes?").
 */
export function Modal({
  open,
  onRequestClose,
  title,
  description,
  titleTone = 'primary',
  children,
  footer,
  className,
}: {
  open: boolean;
  onRequestClose: () => void;
  title: string;
  description?: string;
  titleTone?: 'primary' | 'ink';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onRequestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-scrim backdrop-blur-md" />
        <Dialog.Content
          className={cn(
            'fixed z-[61] flex flex-col bg-surface shadow-modal focus:outline-none',
            // full-height sheet on narrow screens, centred card from md up
            'inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[90vh] md:w-modal md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl',
            className,
          )}
        >
          <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
            <div>
              <Dialog.Title className={cn('text-h2 font-medium', titleTone === 'primary' ? 'text-primary' : 'text-fg')}>
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1.5 text-body-lg text-fg-secondary">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton aria-label="Close dialog">
                <X size={20} />
              </IconButton>
            </Dialog.Close>
          </header>
          <div className="border-t border-line" />
          <div className="thin-scroll flex-1 overflow-y-auto px-6 py-6">{children}</div>
          {footer && (
            <>
              <div className="border-t border-line" />
              <footer className="px-6 py-4">{footer}</footer>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Small confirm dialog. */
export function Confirm({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = 'primary',
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: 'primary' | 'danger';
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-scrim backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-modal focus:outline-none">
          <Dialog.Title className="text-h3 font-medium text-fg">{title}</Dialog.Title>
          {body && <Dialog.Description className="mt-2 text-body text-fg-secondary">{body}</Dialog.Description>}
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="h-10 rounded-full px-5 text-body font-medium text-fg hover:bg-primary-subtle focus-visible:outline-none focus-visible:shadow-focus"
            >
              Cancel
            </button>
            <button
              autoFocus
              onClick={onConfirm}
              className={cn(
                'h-10 rounded-full px-5 text-body font-medium text-fg-on-dark focus-visible:outline-none focus-visible:shadow-focus',
                tone === 'danger' ? 'bg-error hover:opacity-90' : 'bg-primary hover:bg-primary-hover',
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Right-side drawer panel. */
export function DrawerPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-scrim backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-full flex-col bg-surface shadow-modal focus:outline-none md:w-drawer md:rounded-l-xl">
          <header className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-h3 font-medium text-fg">{title}</Dialog.Title>
              {subtitle && <Dialog.Description asChild><div className="mt-1 text-body-sm text-fg-secondary">{subtitle}</div></Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <IconButton aria-label="Close panel">
                <X size={20} />
              </IconButton>
            </Dialog.Close>
          </header>
          <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <footer className="border-t border-line px-6 py-4">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function Menu({ trigger, items, align = 'end' }: { trigger: ReactNode; items: MenuItem[]; align?: 'start' | 'end' }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>{trigger}</DM.Trigger>
      <DM.Portal>
        <DM.Content
          align={align}
          sideOffset={6}
          className="z-[70] min-w-40 rounded-md border border-line bg-surface p-1 shadow-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => (
            <DM.Item
              key={it.label}
              disabled={it.disabled}
              onSelect={it.onSelect}
              className={cn(
                'flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-3 text-body outline-none',
                'data-[highlighted]:bg-primary-subtle data-[disabled]:cursor-not-allowed data-[disabled]:text-disabled-text',
                it.danger ? 'text-error-text' : 'text-fg',
              )}
            >
              {it.icon}
              {it.label}
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
