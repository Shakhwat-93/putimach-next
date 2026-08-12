// @ts-nocheck
import { forwardRef } from 'react';
import './Input.css';
import { Input as ShadcnInput } from './ui/input';

export const Input = forwardRef(({ 
  label, 
  error, 
  helperText, 
  id, 
  fullWidth = false, 
  className = '', 
  isTextarea = false,
  ...props 
}, ref) => {
  return (
    <ShadcnInput
      ref={ref}
      id={id}
      label={label}
      error={error}
      helperText={helperText}
      fullWidth={fullWidth}
      isTextarea={isTextarea}
      className={className}
      {...props}
    />
  );
});

Input.displayName = 'Input';
