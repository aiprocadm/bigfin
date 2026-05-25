import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes intelligently. Used by all shadcn components.
 *
 * Example:
 *   cn('px-2 py-1', condition && 'bg-accent', 'px-4')
 *   // → 'py-1 bg-accent px-4' (px-2 overridden by px-4)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
