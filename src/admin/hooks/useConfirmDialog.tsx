'use client';
// @ts-nocheck
// admin/src/hooks/useConfirmDialog.jsx
// Reusable hook for:
//   1. confirmDialog({ title, description, onConfirm, confirmLabel, isDanger })
//      → Two-button modal (Cancel + Confirm)
//   2. alertDialog({ title, message, type: 'success'|'error'|'warning'|'info' })
//      → One-button modal replacing native alert()

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

// ── Icons ──────────────────────────────────────────────────────────────────────
const SuccessIcon = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
    width:48, height:48, borderRadius:'50%', background:'rgba(16,185,129,0.12)',
    marginBottom:4, flexShrink:0 }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  </div>
);
const ErrorIcon = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
    width:48, height:48, borderRadius:'50%', background:'rgba(239,68,68,0.12)',
    marginBottom:4, flexShrink:0 }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  </div>
);
const WarningIcon = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
    width:48, height:48, borderRadius:'50%', background:'rgba(245,158,11,0.12)',
    marginBottom:4, flexShrink:0 }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  </div>
);
const InfoIcon = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
    width:48, height:48, borderRadius:'50%', background:'rgba(99,102,241,0.12)',
    marginBottom:4, flexShrink:0 }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  </div>
);

const TYPE_CONFIG = {
  success: { Icon: SuccessIcon, btnClass: 'btn-dialog-success', label: 'Got it' },
  error:   { Icon: ErrorIcon,   btnClass: 'btn-dialog-error',   label: 'OK' },
  warning: { Icon: WarningIcon, btnClass: 'btn-dialog-warning', label: 'OK' },
  info:    { Icon: InfoIcon,    btnClass: 'btn-dialog-info',    label: 'OK' },
};

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useConfirmDialog() {
  // Confirm dialog state
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Continue',
    cancelLabel: 'Cancel',
    isDanger: false,
    onConfirmHandler: null,
    onCancelHandler: null,
  });

  // Alert dialog state
  const [alertState, setAlertState] = useState({
    isOpen: false, title: '', message: '', type: 'info',
  });

  // ── confirmDialog ────────────────────────────────────────────────────────────
  const confirmDialog = ({
    title = 'Confirm Action',
    description = '',
    message = '',
    onConfirm = null,
    confirmText = '',
    confirmLabel = 'Continue',
    cancelText = '',
    cancelLabel = 'Cancel',
    isDanger = false,
    variant = ''
  }) => {
    return new Promise((resolve) => {
      const finalDescription = description || message || '';
      const finalConfirmLabel = confirmText || confirmLabel || 'Continue';
      const finalCancelLabel = cancelText || cancelLabel || 'Cancel';
      const isDangerAction = Boolean(isDanger || variant === 'danger');

      setConfirm({
        isOpen: true,
        title,
        description: finalDescription,
        confirmLabel: finalConfirmLabel,
        cancelLabel: finalCancelLabel,
        isDanger: isDangerAction,
        onConfirmHandler: () => {
          setConfirm((p) => ({ ...p, isOpen: false }));
          if (typeof onConfirm === 'function') {
            try {
              onConfirm();
            } catch (err) {
              console.error('onConfirm execution error:', err);
            }
          }
          resolve(true);
        },
        onCancelHandler: () => {
          setConfirm((p) => ({ ...p, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  // ── alertDialog ──────────────────────────────────────────────────────────────
  const alertDialog = ({ title, message, type = 'info' }) => {
    setAlertState({ isOpen: true, title, message, type });
  };

  // Short-hand helpers matching native alert() usage patterns
  const showSuccess = (message, title = 'Success')  => alertDialog({ title, message, type: 'success' });
  const showError   = (message, title = 'Error')    => alertDialog({ title, message, type: 'error' });
  const showWarning = (message, title = 'Warning')  => alertDialog({ title, message, type: 'warning' });
  const showInfo    = (message, title = 'Info')     => alertDialog({ title, message, type: 'info' });

  // ── JSX ──────────────────────────────────────────────────────────────────────
  const { Icon, btnClass, label } = TYPE_CONFIG[alertState.type] || TYPE_CONFIG.info;

  const ConfirmDialogComponent = (
    <>
      {/* ── Confirm Dialog ── */}
      <AlertDialog
        open={confirm.isOpen}
        onOpenChange={(open) => {
          if (!open && confirm.isOpen) {
            if (confirm.onCancelHandler) confirm.onCancelHandler();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
            {confirm.description && (
              <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => confirm.onCancelHandler && confirm.onCancelHandler()}>
              {confirm.cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirm.onConfirmHandler && confirm.onConfirmHandler()}
              className={confirm.isDanger ? 'bg-red-600 hover:bg-red-700 text-white font-semibold' : ''}
            >
              {confirm.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Alert Dialog ── */}
      <AlertDialog open={alertState.isOpen} onOpenChange={(open) => setAlertState((p) => ({ ...p, isOpen: open }))}>
        <AlertDialogContent style={{ maxWidth: 420 }}>
          <AlertDialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
              <Icon />
              <AlertDialogTitle style={{ marginTop: 4 }}>{alertState.title}</AlertDialogTitle>
              <AlertDialogDescription style={{ textAlign: 'center' }}>
                {alertState.message}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ justifyContent: 'center' }}>
            <AlertDialogAction
              className={`dialog-ok-btn ${btnClass}`}
              onClick={() => setAlertState((p) => ({ ...p, isOpen: false }))}
            >
              {label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return { confirmDialog, alertDialog, showSuccess, showError, showWarning, showInfo, ConfirmDialogComponent };
}
