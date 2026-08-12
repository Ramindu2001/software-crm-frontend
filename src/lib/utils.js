import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class names with conflict resolution.
 *
 * clsx handles conditionals/arrays/objects; twMerge then resolves competing
 * utilities so the *last* one wins. Without twMerge, a consumer passing
 * `className="bg-white"` to a component whose variant sets `bg-brand-600`
 * would end up with both classes and a coin-flip result decided by CSS order.
 *
 * @param {...import('clsx').ClassValue} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
