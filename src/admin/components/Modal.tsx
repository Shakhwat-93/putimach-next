// @ts-nocheck
import React from 'react';
import './Modal.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export const Modal = ({ isOpen, onClose, title, subtitle, children, className = '', size }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent onClose={onClose} className={className} size={size}>
        {(title || subtitle) && (
          <DialogHeader className="shrink-0">
            {title && <DialogTitle>{title}</DialogTitle>}
            {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
          </DialogHeader>
        )}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};
