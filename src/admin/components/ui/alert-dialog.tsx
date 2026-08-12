// @ts-nocheck
"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

function AlertDialog({ ...props }) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({ ...props }) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({ ...props }) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  style,
  ...props
}) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(28, 22, 19, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        animation: 'fadeIn 0.2s ease-out',
        ...style
      }}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  size = "default",
  style,
  children,
  ...props
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100000,
          width: '90%',
          maxWidth: '440px',
          backgroundColor: '#FDFBF7',
          color: '#1C1613',
          padding: '28px',
          borderRadius: '16px',
          border: '1px solid #E9E2D2',
          boxShadow: '0 20px 60px rgba(28, 22, 19, 0.3)',
          fontFamily: 'Outfit, system-ui, sans-serif',
          animation: 'scaleIn 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
          outline: 'none',
          ...style
        }}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  style,
  ...props
}) {
  return (
    <div
      data-slot="alert-dialog-header"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '16px',
        ...style
      }}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  style,
  ...props
}) {
  return (
    <div
      data-slot="alert-dialog-footer"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '20px',
        ...style
      }}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  style,
  ...props
}) {
  return (
    <div
      data-slot="alert-dialog-media"
      style={{
        marginBottom: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: '#F5F2EB',
        ...style
      }}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  style,
  ...props
}) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      style={{
        fontSize: '1.25rem',
        fontWeight: 800,
        color: '#1C1613',
        fontFamily: 'Cinzel, serif',
        letterSpacing: '0.04em',
        margin: 0,
        ...style
      }}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  style,
  ...props
}) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      style={{
        fontSize: '0.875rem',
        color: '#7C6E65',
        lineHeight: 1.6,
        margin: 0,
        ...style
      }}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  style,
  onClick,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      data-slot="alert-dialog-action"
      onClick={onClick}
      style={{
        padding: '10px 24px',
        borderRadius: '100px',
        border: 'none',
        backgroundColor: '#C5A880',
        color: '#ffffff',
        fontWeight: 800,
        fontSize: '13px',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(197, 168, 128, 0.4)',
        transition: 'all 0.2s ease',
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function AlertDialogCancel({
  className,
  style,
  children,
  onClick,
  ...props
}) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      onClick={onClick}
      style={{
        padding: '10px 20px',
        borderRadius: '100px',
        border: '1px solid #E9E2D2',
        backgroundColor: '#F5F2EB',
        color: '#1C1613',
        fontWeight: 700,
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ...style
      }}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Close>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
