import type { ReactElement, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description: string;
  trigger?: ReactElement;
  children: ReactNode;
}

export function Modal({ open, onOpenChange, title, description, trigger, children }: ModalProps) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink opacity-60" />
      <Dialog.Content
        onKeyDown={(event) => {
          // A newer Toast layer can handle Escape without consuming it. Nested
          // Radix widgets consume it first or target their own portal content.
          if (event.key !== 'Escape' || event.defaultPrevented || !event.currentTarget.contains(event.target as Node)) return;
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(false);
        }}
        className="fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-[36rem] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto border border-ink bg-surface p-6 text-text shadow-[8px_8px_0_rgb(30_79_214_/_25%)]">
        <Dialog.Title className="text-xl font-medium text-ink">{title}</Dialog.Title>
        <Dialog.Description className="text-muted">{description}</Dialog.Description>
        {children}
        <Dialog.Close asChild><Button variant="fantasma" aria-label="Cerrar diálogo"><X className="ui-icon" aria-hidden="true" />Cerrar</Button></Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
