// @ts-nocheck
import React from 'react';
import './Card.css';
import { Card as ShadcnCard } from './ui/card';

export const Card = ({ children, className = '', noPadding = false, ...props }) => {
  return (
    <ShadcnCard noPadding={noPadding} className={className} {...props}>
      {children}
    </ShadcnCard>
  );
};
