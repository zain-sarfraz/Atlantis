import { loadStripe, type StripeCardElementChangeEvent } from '@stripe/stripe-js'
import { Elements, CardElement } from '@stripe/react-stripe-js'
import { Lock, CreditCard, Info } from 'lucide-react'

const rawPublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = rawPublishableKey ? loadStripe(rawPublishableKey) : null

interface StripeCardFormProps {
  onCardChange: (complete: boolean) => void
  disabled?: boolean
}

export function CardInputForm({ onCardChange, disabled }: StripeCardFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink">
          <span>Card Details</span>
          <span className="text-sand-dark">* Required</span>
        </label>
        <div className="rounded border border-border bg-white p-3.5 shadow-sm transition focus-within:border-sand focus-within:ring-2 focus-within:ring-sand">
          <CardElement
            options={{
              disabled,
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1a202c',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  '::placeholder': {
                    color: '#94a3b8',
                  },
                },
                invalid: {
                  color: '#dc2626',
                },
              },
            }}
            onChange={(e: StripeCardElementChangeEvent) => onCardChange(e.complete)}
          />
        </div>
      </div>
    </div>
  )
}

interface StripeCheckoutSectionProps {
  clientSecret?: string
  isCardComplete?: boolean
  onCardChange: (complete: boolean) => void
  submitting: boolean
}

export default function StripeCheckoutSection({
  onCardChange,
  submitting,
}: StripeCheckoutSectionProps) {
  const isStripeConfigured = Boolean(rawPublishableKey && rawPublishableKey.trim() !== '')

  return (
    <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-medium text-navy md:text-2xl">
          <Lock size={18} className="text-sand-dark" />
          Secure Payment
        </h2>
        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
          <Lock size={12} /> Encrypted
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        All transactions are secured and encrypted with 256-bit Stripe SSL protection.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {['VISA', 'Mastercard', 'AMEX', 'JCB', 'UnionPay'].map((brand) => (
          <span
            key={brand}
            className="rounded border border-border bg-cream px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-navy"
          >
            {brand}
          </span>
        ))}
      </div>

      {!isStripeConfigured && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">Stripe Mode: Test / Dev Sandbox</p>
          <p className="mt-0.5">
            Add <code className="font-mono bg-amber-100 px-1 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> in frontend environment file to activate live Stripe Elements.
          </p>
        </div>
      )}

      <div className="mt-5">
        {isStripeConfigured && stripePromise ? (
          <Elements stripe={stripePromise}>
            <CardInputForm onCardChange={onCardChange} disabled={submitting} />
          </Elements>
        ) : (
          /* Development / Fallback credit card interface */
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="cardNumMock">
                Card Number <span className="text-sand-dark">*</span>
              </label>
              <div className="relative">
                <CreditCard
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="cardNumMock"
                  required
                  placeholder="4242 •••• •••• 4242 (Stripe Test Card)"
                  onChange={(e) => onCardChange(e.target.value.length >= 15)}
                  className="w-full rounded border border-border bg-white pl-10 pr-3 py-2.5 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-sand focus:ring-2 focus:ring-sand"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="expMock">
                  Expiration Date (MM/YY) <span className="text-sand-dark">*</span>
                </label>
                <input
                  id="expMock"
                  required
                  placeholder="12/28"
                  className="w-full rounded border border-border bg-white px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-sand focus:ring-2 focus:ring-sand"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="cvvMock">
                  CVV <span className="text-sand-dark">*</span>
                  <Info size={14} className="ml-1 inline text-slate-400" />
                </label>
                <input
                  id="cvvMock"
                  required
                  placeholder="123"
                  className="w-full rounded border border-border bg-white px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-sand focus:ring-2 focus:ring-sand"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
