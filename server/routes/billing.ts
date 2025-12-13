import express from 'express';
import { createCheckoutSession, getPortalUrl } from '../services/stripe.js';
import { handleWebhook } from '../controllers/webhookController.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import db from '../db.js';

import { checkJwt, extractTenant } from '../middleware/auth.js';

const router = express.Router();

// Public Webhook Endpoint (Must be raw body, handled in server.ts or here)
// Note: We will handle the raw body requirement in the main server.ts for this specific route
router.post('/webhook', handleWebhook);

// Protected Routes (require auth + tenant)
router.use(checkJwt);
router.use(extractTenant);
router.use(tenantMiddleware);

router.get('/plans', async (req, res) => {
  // Static plans for now, could fetch from Stripe
  const plans = [
    { id: 'freemium', name: 'Gratuito', price: 0, features: ['1 Grade/mês', 'Exportação PDF'] },
    { id: 'pro', name: 'Escola Pro', price: 9900, priceId: 'price_1Q...', features: ['Grades Ilimitadas', 'Exportação Excel/ICS', 'Suporte Prioritário'] },
    { id: 'enterprise', name: 'Rede de Ensino', price: 29900, priceId: 'price_1Q...', features: ['Múltiplas Unidades', 'API Access', 'SSO'] }
  ];
  res.json(plans);
});

router.post('/checkout-session', async (req, res) => {
  try {
    const { priceId } = req.body;
    const tenantId = req.tenantId!;
    
    // Get org to check if they already have a customer_id
    const org = await db('organizations').where({ id: tenantId }).first();
    
    const session = await createCheckoutSession(priceId, tenantId, org?.stripe_customer_id);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/portal', async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const org = await db('organizations').where({ id: tenantId }).first();

    if (!org?.stripe_customer_id) {
      return res.status(400).json({ error: "No billing account found" });
    }

    const url = await getPortalUrl(org.stripe_customer_id);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const invoices = await db('invoices')
      .where({ organization_id: tenantId })
      .orderBy('created_at', 'desc');
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: "Error fetching invoices" });
  }
});

export default router;
