// @ts-nocheck
import React from 'react';
import './Modal.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export const Modal = ({ isOpen, onClose, title, subtitle, children, className = '', size }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent onClose={onClose} className={className} size={size}>
        {(title || subtitle) && (
          <DialogHeader className="shrink-0 pb-3 sm:pb-4 border-b border-border/60">
            {title && <DialogTitle>{title}</DialogTitle>}
            {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
          </DialogHeader>
        )}
        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 scrollbar-thin pt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};
