// @ts-nocheck
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price) {
  if (price === null || price === undefined) return '৳0';
  return `৳${Number(price).toLocaleString('en-BD')}`;
}
