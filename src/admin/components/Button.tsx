// @ts-nocheck
import React from 'react';
import './Button.css';
import { Button as ShadcnButton } from './ui/button';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  // Map legacy variants to shadcn variants
  const variantMap = {
    primary: 'primary',
    secondary: 'secondary',
    outline: 'outline',
    ghost: 'ghost',
    danger: 'danger',
    destructive: 'destructive',
    success: 'success',
    green: 'success',
    indigo: 'indigo',
    purple: 'purple',
    link: 'link'
  };

  const mappedVariant = variantMap[variant] || variant || 'default';
  const mappedSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : size === 'xs' ? 'xs' : 'default';

  return (
    <ShadcnButton
      variant={mappedVariant}
      size={mappedSize}
      className={`${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </ShadcnButton>
  );
};
