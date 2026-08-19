import { cn } from '@/lib/utils'
import { Input } from './Input'

/**
 * Amount field.
 *
 * A thin wrapper over Input that pins the currency to the control itself. The
 * schema stores money as bare DECIMAL(10,2) with no currency column, so an
 * unlabelled amount box is the exact place a rupee price gets typed as though
 * it were dollars — the affix is a constant, not a prop, because there is no
 * second currency for it to vary between.
 *
 * The numeric attributes are defaults rather than fixtures: everything
 * forwards to Input, so a caller can still override them along with label,
 * hint and error.
 */
export function MoneyInput({ className, ...props }) {
  return (
    <Input
      type="number"
      min="0"
      step="0.01"
      // Surfaces the decimal keypad on mobile; `type=number` alone gives a
      // telephone-style pad on some Android keyboards.
      inputMode="decimal"
      leadingIcon={<span className="text-xs font-medium">Rs.</span>}
      // Input's own pl-9 is sized for a single glyph; "Rs." needs the room.
      className={cn('pl-11', className)}
      {...props}
    />
  )
}
