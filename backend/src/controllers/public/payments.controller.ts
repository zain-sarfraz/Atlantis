import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { stripe, isStripeConfigured } from '../../config/stripe'
import { prisma } from '../../config/database'
import { createError } from '../../middleware/error'

const CreatePaymentIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['AED', 'USD', 'EUR', 'GBP']).default('AED'),
  email: z.string().email().optional(),
  bookingRef: z.string().optional(),
  metadata: z.record(z.string()).optional(),
})

/** POST /api/payments/create-payment-intent */
export async function createPaymentIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CreatePaymentIntentSchema.parse(req.body)

    if (!isStripeConfigured() || !stripe) {
      // If Stripe key is not configured in env yet, return indicative response
      return res.status(200).json({
        clientSecret: 'mock_client_secret_stripe_not_configured',
        paymentIntentId: 'mock_pi_' + Date.now(),
        isMock: true,
        message: 'Stripe API key (STRIPE_SECRET_KEY) is not set in backend .env',
      })
    }

    // Stripe expects amount in smallest currency unit (e.g. fils/cents -> multiply by 100)
    const amountInCents = Math.round(data.amount * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: data.currency.toLowerCase(),
      receipt_email: data.email,
      metadata: {
        bookingRef: data.bookingRef || '',
        ...data.metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      isMock: false,
    })
  } catch (err) {
    next(err)
  }
}

/** POST /api/webhooks/stripe — Stripe webhook listener */
export async function handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const sig = req.headers['stripe-signature'] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event: any = req.body

    if (webhookSecret && sig && stripe) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      } catch (err: any) {
        console.error('[Stripe Webhook] Verification failed:', err.message)
        return res.status(400).send(`Webhook Error: ${err.message}`)
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      console.log(`[Stripe Webhook] PaymentIntent ${paymentIntent.id} succeeded for amount ${paymentIntent.amount}`)

      const bookingRef = paymentIntent.metadata?.bookingRef
      if (bookingRef) {
        await prisma.booking.updateMany({
          where: { bookingRef },
          data: {
            paymentStatus: 'PAID',
            stripePaymentIntentId: paymentIntent.id,
          },
        })
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object
      console.warn(`[Stripe Webhook] PaymentIntent ${paymentIntent.id} failed`)

      const bookingRef = paymentIntent.metadata?.bookingRef
      if (bookingRef) {
        await prisma.booking.updateMany({
          where: { bookingRef },
          data: {
            paymentStatus: 'FAILED',
            stripePaymentIntentId: paymentIntent.id,
          },
        })
      }
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
}
