import { Request, Response } from 'express';
import stripe from '../services/stripe.js';
import db from '../db.js';
import Stripe from 'stripe';
import { emailService } from '../services/email.js';

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!sig || !endpointSecret) {
      throw new Error('Missing Stripe signature or webhook secret');
    }
    // Verify signature using the raw body (req.body must be a buffer here)
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (tenantId) {
          await db('organizations')
            .where({ id: tenantId })
            .update({
              stripe_customer_id: customerId,
              // We might want to fetch the plan details here, but for now assume Pro
              // In a real app, you'd map price_id to plan_id
              plan_id: 'pro', 
              updated_at: new Date()
            });
          console.log(`Organization ${tenantId} linked to customer ${customerId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Find org by customer_id
        const org = await db('organizations').where({ stripe_customer_id: customerId }).first();
        
        if (org) {
          // Record invoice
          await db('invoices').insert({
            organization_id: org.id,
            stripe_invoice_id: invoice.id,
            amount_cents: invoice.amount_paid,
            status: 'paid',
            paid_at: new Date(invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : Date.now()),
          });

          // Extend subscription validity
          // Usually we rely on 'customer.subscription.updated', but this confirms payment
          console.log(`Payment succeeded for org ${org.id}`);

          // Send confirmation email (assuming we have an email for the org/admin)
          // In a real app, we'd fetch the admin user's email. For now, we'll try to use customer email from invoice if available
          const customerEmail = invoice.customer_email;
          if (customerEmail) {
             await emailService.sendPaymentConfirmed(org, { amount_cents: invoice.amount_paid, pdf_url: invoice.hosted_invoice_url || undefined }, customerEmail);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const org = await db('organizations').where({ stripe_customer_id: customerId }).first();

        if (org) {
          await db('organizations')
            .where({ id: org.id })
            .update({
              plan_active_until: new Date((subscription as any).current_period_end * 1000),
              updated_at: new Date()
            });
            console.log(`Subscription updated for org ${org.id}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const org = await db('organizations').where({ stripe_customer_id: customerId }).first();

        if (org) {
          await db('organizations')
            .where({ id: org.id })
            .update({
              plan_id: 'freemium',
              plan_active_until: null,
              updated_at: new Date()
            });
          console.log(`Subscription deleted/canceled for org ${org.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
