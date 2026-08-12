// @ts-nocheck
import React from 'react';
import './Badge.css';
import { Badge as ShadcnBadge } from './ui/badge';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  return (
    <ShadcnBadge variant={variant} className={className}>
      {children}
    </ShadcnBadge>
  );
};
