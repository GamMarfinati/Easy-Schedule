import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("Missing STRIPE_SECRET_KEY in environment variables.");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});

export const createCheckoutSession = async (priceId: string, tenantId: string, customerId?: string) => {
  // Construir objeto da sessão condicionalmente
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    client_reference_id: tenantId, // Pass tenantId to webhook
    subscription_data: {
      metadata: {
        tenant_id: tenantId
      }
    },
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/billing?canceled=true`,
  };

  // Só adicionar customer se existir e não for string vazia
  if (customerId && customerId.trim() !== '') {
    sessionParams.customer = customerId;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return session;
};

export const getPortalUrl = async (customerId: string) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/billing`,
  });
  return session.url;
};

export default stripe;
