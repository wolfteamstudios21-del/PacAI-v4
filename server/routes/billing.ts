import { Router } from 'express';
import { getUncachableStripeClient, getStripePublishableKey } from '../stripeClient';
import { db } from '../drizzle';
import { users, TIER_CONFIG, type UserTier } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { validateSessionToken } from '../auth';

const router = Router();

const TIER_TO_PRICE_LOOKUP: Record<string, string> = {};

router.get('/api/billing/config', async (req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({
      publishableKey,
      tiers: TIER_CONFIG,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get billing config' });
  }
});

router.get('/api/billing/prices', async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.description,
        p.metadata,
        pr.id as price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring
      FROM stripe.products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.active = true
      ORDER BY pr.unit_amount ASC
    `);

    res.json({ prices: result.rows });
  } catch (error) {
    res.json({ prices: [], tiers: TIER_CONFIG });
  }
});

router.post('/api/billing/create-checkout-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.headers['x-session-token'] as string;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = validateSessionToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { tier, priceId } = req.body;

    if (!tier || !priceId) {
      return res.status(400).json({ error: 'Tier and priceId required' });
    }

    const [user] = await db.select().from(users).where(eq(users.username, session.username));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stripe = await getUncachableStripeClient();

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { 
          username: session.username,
          userId: user.id 
        },
      });
      customerId = customer.id;

      await db.update(users)
        .set({ stripe_customer_id: customerId })
        .where(eq(users.id, user.id));
    }

    const isOneTime = tier === 'lifetime' || tier === 'enterprise';
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isOneTime ? 'payment' : 'subscription',
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        tier,
        username: session.username,
        userId: user.id,
      },
    });

    res.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

router.get('/api/billing/success', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id as string);

    if (session.payment_status === 'paid') {
      const tier = session.metadata?.tier || 'creator';
      const username = session.metadata?.username;

      if (username) {
        const expiresAt = tier === 'lifetime' || tier === 'enterprise' 
          ? null 
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await db.update(users)
          .set({ 
            tier: tier as UserTier,
            stripe_subscription_id: session.subscription as string | null,
            is_verified: 1,
            license_expires_at: expiresAt,
          })
          .where(eq(users.username, username));
      }

      res.json({ success: true, tier });
    } else {
      res.json({ success: false, status: session.payment_status });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to verify payment' });
  }
});

router.post('/api/billing/create-portal-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.headers['x-session-token'] as string;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = validateSessionToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const [user] = await db.select().from(users).where(eq(users.username, session.username));

    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${baseUrl}/dashboard`,
    });

    res.json({ url: portalSession.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
});

router.get('/api/billing/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.headers['x-session-token'] as string;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = validateSessionToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const [user] = await db.select().from(users).where(eq(users.username, session.username));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      tier: user.tier,
      hasSubscription: !!user.stripe_subscription_id,
      expiresAt: user.license_expires_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get billing status' });
  }
});

export default router;
