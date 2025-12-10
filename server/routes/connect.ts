import { Router, Request, Response } from "express";
import { db } from "../drizzle";
import { users, creatorProducts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { validateSessionToken } from "../auth";

const router = Router();

let stripeClient: any = null;

async function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import("stripe")).default;
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
    });
  }
  return stripeClient;
}

const APPLICATION_FEE_PERCENT = 10;
const APPLICATION_FEE_FIXED = 30;
const BASE_URL = process.env.BASE_URL || "https://pacaiwolfstudio.com";

async function getAuthenticatedUser(req: Request) {
  const sessionToken = req.headers["x-session-token"] as string;
  if (!sessionToken) return null;
  
  const tokenData = validateSessionToken(sessionToken);
  if (!tokenData) return null;
  
  const [user] = await db.select().from(users).where(eq(users.username, tokenData.username));
  return user || null;
}

router.post("/connect/create", async (req: Request, res: Response) => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(503).json({ error: "Payment service unavailable" });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.stripe_account_id) {
      return res.json({ accountId: user.stripe_account_id, message: "Account already exists" });
    }

    const account = await stripe.accounts.create({
      type: "standard",
      country: "US",
      email: user.username.includes("@") ? user.username : `${user.username}@pacai.dev`,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        pacai_user_id: user.id,
        pacai_username: user.username,
      },
    });

    await db.update(users)
      .set({ stripe_account_id: account.id })
      .where(eq(users.id, user.id));

    res.json({ accountId: account.id });
  } catch (error: any) {
    console.error("Connect account creation failed:", error);
    res.status(500).json({ error: error.message || "Failed to create connected account" });
  }
});

router.post("/connect/onboard", async (req: Request, res: Response) => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(503).json({ error: "Payment service unavailable" });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.stripe_account_id) {
      return res.status(400).json({ error: "No connected account found. Create one first." });
    }

    const accountLink = await stripe.accountLinks.create({
      account: user.stripe_account_id,
      refresh_url: `${BASE_URL}/billing?refresh=true`,
      return_url: `${BASE_URL}/billing?success=true`,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  } catch (error: any) {
    console.error("Onboarding link creation failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/connect/status", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.stripe_account_id) {
      return res.json({ status: "not_started" });
    }

    const stripe = await getStripe();
    if (!stripe) {
      return res.status(503).json({ error: "Payment service unavailable" });
    }

    const account = await stripe.accounts.retrieve(user.stripe_account_id);
    const chargesEnabled = account.charges_enabled;
    const payoutsEnabled = account.payouts_enabled;
    const detailsSubmitted = account.details_submitted;

    let status = "incomplete";
    if (chargesEnabled && payoutsEnabled) {
      status = "complete";
      await db.update(users)
        .set({ stripe_onboarding_complete: 1 })
        .where(eq(users.id, user.id));
    } else if (detailsSubmitted) {
      status = "pending";
    } else {
      status = "started";
    }

    res.json({ status, chargesEnabled, payoutsEnabled, detailsSubmitted });
  } catch (error: any) {
    console.error("Connect status check failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/products/create", async (req: Request, res: Response) => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(503).json({ error: "Payment service unavailable" });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.stripe_account_id) {
      return res.status(400).json({ error: "Complete Stripe onboarding first" });
    }

    const { name, description, priceInCents, currency = "usd" } = req.body;

    if (!name || !priceInCents || priceInCents < 100) {
      return res.status(400).json({ error: "Invalid product data. Price must be at least $1.00" });
    }

    const product = await stripe.products.create(
      { name, description: description || undefined },
      { stripeAccount: user.stripe_account_id }
    );

    const price = await stripe.prices.create(
      {
        unit_amount: priceInCents,
        currency,
        product: product.id,
      },
      { stripeAccount: user.stripe_account_id }
    );

    await db.insert(creatorProducts).values({
      user_id: user.id,
      stripe_price_id: price.id,
      stripe_product_id: price.product as string,
      name,
      description: description || null,
      price_cents: priceInCents,
      currency,
    });

    res.json({ priceId: price.id, productId: price.product });
  } catch (error: any) {
    console.error("Product creation failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/products/my", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const products = await db.select().from(creatorProducts).where(eq(creatorProducts.user_id, user.id));
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

router.get("/store/:accountId", async (req: Request, res: Response) => {
  const { accountId } = req.params;

  try {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(503).send("Payment service unavailable");
    }

    const prices = await stripe.prices.list(
      { limit: 100, expand: ["data.product"], active: true },
      { stripeAccount: accountId }
    );

    const products = prices.data.map((p: any) => ({
      id: p.id,
      name: p.product?.name || "Product",
      description: p.product?.description || "",
      amount: p.unit_amount,
      currency: p.currency,
    }));

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Creator Store - PacAI</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Inter', -apple-system, sans-serif; 
      background: #0b0d0f; 
      color: #e4e4e7;
      padding: 2rem; 
      min-height: 100vh;
    }
    h1 { font-size: 2.5rem; margin-bottom: 2rem; color: #fff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
    .card { 
      background: #141517; 
      padding: 1.5rem; 
      border-radius: 0.75rem; 
      border: 1px solid #27272a;
      transition: border-color 0.2s;
    }
    .card:hover { border-color: #3e73ff; }
    .card h2 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #fff; }
    .card p { opacity: 0.7; margin-bottom: 1rem; line-height: 1.5; }
    .price { font-size: 2rem; font-weight: bold; color: #3e73ff; margin-bottom: 1rem; }
    button { 
      background: #3e73ff; 
      color: #fff;
      padding: 0.75rem 1.5rem; 
      border: none; 
      border-radius: 0.5rem; 
      cursor: pointer; 
      font-size: 1rem;
      font-weight: 500;
      width: 100%;
      transition: background 0.2s;
    }
    button:hover { background: #2563eb; }
    .empty { text-align: center; padding: 4rem; opacity: 0.6; }
  </style>
</head>
<body>
  <h1>Creator Store</h1>
  ${products.length === 0 ? '<div class="empty">No products available yet.</div>' : `
  <div class="grid">
    ${products.map((p: any) => `
      <div class="card">
        <h2>${escapeHtml(p.name)}</h2>
        <p>${escapeHtml(p.description || "")}</p>
        <div class="price">$${(p.amount / 100).toFixed(2)} ${p.currency.toUpperCase()}</div>
        <button onclick="checkout('${p.id}', '${accountId}')">Buy Now</button>
      </div>
    `).join("")}
  </div>
  `}
  <script>
    const stripe = Stripe("${process.env.STRIPE_PUBLISHABLE_KEY || ""}");
    async function checkout(priceId, accountId) {
      try {
        const res = await fetch("/api/connect/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId, accountId })
        });
        const data = await res.json();
        if (data.sessionId) {
          stripe.redirectToCheckout({ sessionId: data.sessionId });
        } else {
          alert(data.error || "Checkout failed");
        }
      } catch (err) {
        alert("Checkout error");
      }
    }
  </script>
</body>
</html>
    `);
  } catch (error: any) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html><head><title>Error</title></head>
      <body style="background:#0b0d0f;color:#fff;padding:2rem;font-family:sans-serif;">
        <h1>Store Unavailable</h1>
        <p>This creator store is not available at this time.</p>
      </body></html>
    `);
  }
});

router.post("/checkout", async (req: Request, res: Response) => {
  const { priceId, accountId } = req.body;

  if (!priceId || !accountId) {
    return res.status(400).json({ error: "Missing priceId or accountId" });
  }

  try {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(503).json({ error: "Payment service unavailable" });
    }

    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] }, { stripeAccount: accountId });

    if (!price.unit_amount) {
      return res.status(400).json({ error: "Invalid price" });
    }

    const applicationFee = Math.round(price.unit_amount * (APPLICATION_FEE_PERCENT / 100)) + APPLICATION_FEE_FIXED;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: price.currency,
          unit_amount: price.unit_amount,
          product_data: {
            name: (price.product as any)?.name || "Product",
          },
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${BASE_URL}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/api/connect/store/${accountId}`,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: accountId,
        },
      },
    });

    res.json({ sessionId: session.id });
  } catch (error: any) {
    console.error("Checkout session creation failed:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
