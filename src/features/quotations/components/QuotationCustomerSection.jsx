import { Building2, UserPlus } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Textarea,
} from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Who the quotation is addressed to.
 *
 * ── Why there are two modes ──
 * Quoting used to require picking somebody out of the customer directory, which
 * meant a price could not be given to anyone who was not already a customer.
 * That is backwards: a quotation is how somebody *becomes* a customer. The
 * choice was either to refuse the quote or to create a speculative customer
 * record for every enquiry, filling the directory with rows nobody cleans up.
 *
 * So a quotation can now be addressed to a prospect, whose details live on the
 * document itself. Nothing is written to the customer directory until the offer
 * is accepted — at which point the detail page offers to add them, using the
 * details already captured here.
 *
 * ── Why only the name is required ──
 * The server asks for `company_name` and nothing else, and this mirrors it. A
 * quotation is often raised off a phone call where the company name is the one
 * thing you actually have. Demanding an email would either block the quote or
 * teach people to type something false into a field that later gets invoiced.
 */

const MODES = [
  {
    value: 'existing',
    label: 'Existing customer',
    icon: Building2,
    hint: 'Pick somebody already in the directory.',
  },
  {
    value: 'new',
    label: 'Someone new',
    icon: UserPlus,
    hint: 'Quote a prospect who is not on file yet.',
  },
]

function ModeToggle({ mode, onChange }) {
  return (
    <div role="radiogroup" aria-label="Who is this for?" className="grid gap-2 sm:grid-cols-2">
      {MODES.map((entry) => {
        const isActive = mode === entry.value

        return (
          <button
            key={entry.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(entry.value)}
            className={cn(
              'flex items-start gap-2.5 rounded-lg p-3 text-left transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              isActive
                ? 'bg-brand-50 ring-2 ring-brand-600'
                : 'bg-surface ring-1 ring-line hover:bg-sunken',
            )}
          >
            <entry.icon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                isActive ? 'text-brand-700' : 'text-ink-subtle',
              )}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span
                className={cn(
                  'block text-sm font-medium',
                  isActive ? 'text-brand-700' : 'text-ink',
                )}
              >
                {entry.label}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">{entry.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * @param {object} props
 * @param {object} props.builder From useQuotationBuilder.
 * @param {object} props.errors Form-level errors.
 */
export function QuotationCustomerSection({ builder, errors }) {
  const { values, setValue, setNewCustomerValue } = builder
  const isNew = values.customerMode === 'new'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4">
        <ModeToggle
          mode={values.customerMode}
          onChange={(mode) => setValue('customerMode', mode)}
        />

        {isNew ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Company or person"
                value={values.newCustomer.companyName}
                onChange={(event) => setNewCustomerValue('companyName', event.target.value)}
                error={errors.newCustomerName}
                placeholder="Who is this quotation for?"
                required
              />

              <Input
                label="Contact person"
                value={values.newCustomer.contactPerson}
                onChange={(event) =>
                  setNewCustomerValue('contactPerson', event.target.value)
                }
                placeholder="Optional"
              />

              <Input
                label="Email"
                type="email"
                value={values.newCustomer.email}
                onChange={(event) => setNewCustomerValue('email', event.target.value)}
                error={errors.newCustomerEmail}
                placeholder="Optional"
                hint="Needed later to invoice them, but not to quote them."
              />

              <Input
                label="Phone"
                type="tel"
                value={values.newCustomer.phone}
                onChange={(event) => setNewCustomerValue('phone', event.target.value)}
                placeholder="Optional"
              />

              <Textarea
                label="Address"
                value={values.newCustomer.address}
                onChange={(event) => setNewCustomerValue('address', event.target.value)}
                rows={2}
                placeholder="Optional. Printed on the quotation."
                wrapperClassName="sm:col-span-2"
              />
            </div>

            <p className="rounded-lg bg-info-soft px-3 py-2 text-xs text-info-strong">
              These details are stored on the quotation itself — nothing is added to
              your customer list yet. Once the quotation is accepted, the quotation
              page offers to add them, and that is what unlocks turning it into an
              agreement.
            </p>
          </>
        ) : (
          <>
            <Select
              label="Customer"
              value={values.customerId}
              onChange={(event) => setValue('customerId', event.target.value)}
              options={builder.customers}
              error={errors.customerId}
              disabled={builder.isLoadingOptions}
              placeholder={builder.isLoadingOptions ? 'Loading…' : 'Select a customer'}
              required
            />
            <p className="text-xs text-ink-muted">
              Their contact person, phone, address and email are copied onto the
              quotation as it stands today, so correcting their record later never
              rewrites a document you have already sent.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
