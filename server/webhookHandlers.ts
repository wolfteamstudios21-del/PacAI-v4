import { getStripeSync } from './stripeClient';
import { db } from './drizzle';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler.'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature, uuid);
  }

  static async handleCheckoutComplete(session: any): Promise<void> {
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const tier = session.metadata?.tier || 'creator';

    if (!customerId) return;

    await db.execute(sql`
      UPDATE users 
      SET tier = ${tier}, 
          stripe_subscription_id = ${subscriptionId},
          is_verified = 1
      WHERE stripe_customer_id = ${customerId}
    `);
  }

  static async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    const status = subscription.status;

    if (status === 'canceled' || status === 'unpaid') {
      await db.execute(sql`
        UPDATE users 
        SET tier = 'free', 
            stripe_subscription_id = NULL
        WHERE stripe_customer_id = ${customerId}
      `);
    }
  }
}
