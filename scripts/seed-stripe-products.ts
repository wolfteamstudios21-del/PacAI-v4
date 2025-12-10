import Stripe from 'stripe';

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', 'development');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings?.settings?.secret) {
    throw new Error('Stripe connection not found');
  }

  return connectionSettings.settings.secret;
}

const TIER_PRODUCTS = [
  {
    name: 'PacAI Creator',
    description: 'For indie developers and small teams. 50 generations/month, 5 refs, 5 voices, 5 animations.',
    metadata: { tier: 'creator' },
    price: 999,
    recurring: { interval: 'month' as const },
  },
  {
    name: 'PacAI Pro',
    description: 'For professional studios. 200 generations/month, 20 refs, 10 voices, 10 animations.',
    metadata: { tier: 'pro' },
    price: 2999,
    recurring: { interval: 'month' as const },
  },
  {
    name: 'PacAI Lifetime',
    description: 'One-time purchase. Unlimited generations, refs, voices, and animations forever.',
    metadata: { tier: 'lifetime' },
    price: 29999,
    recurring: null,
  },
  {
    name: 'PacAI Enterprise',
    description: 'For large organizations. Unlimited everything plus priority support and custom integrations.',
    metadata: { tier: 'enterprise' },
    price: 99999,
    recurring: null,
  },
];

async function seedProducts() {
  console.log('Getting Stripe credentials...');
  const secretKey = await getCredentials();
  
  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });

  console.log('Creating PacAI tier products...\n');

  for (const tierProduct of TIER_PRODUCTS) {
    const existingProducts = await stripe.products.search({
      query: `name:'${tierProduct.name}'`,
    });

    if (existingProducts.data.length > 0) {
      console.log(`✓ ${tierProduct.name} already exists (${existingProducts.data[0].id})`);
      continue;
    }

    const product = await stripe.products.create({
      name: tierProduct.name,
      description: tierProduct.description,
      metadata: tierProduct.metadata,
    });

    console.log(`Created product: ${product.name} (${product.id})`);

    const priceParams: Stripe.PriceCreateParams = {
      product: product.id,
      unit_amount: tierProduct.price,
      currency: 'usd',
      metadata: tierProduct.metadata,
    };

    if (tierProduct.recurring) {
      priceParams.recurring = tierProduct.recurring;
    }

    const price = await stripe.prices.create(priceParams);
    console.log(`  Created price: $${(tierProduct.price / 100).toFixed(2)} (${price.id})\n`);
  }

  console.log('Done! Products are now available in your Stripe dashboard.');
}

seedProducts().catch(console.error);
