import { database } from "../support/database";
import { payments } from "../support/payments";
import { mailer } from "../support/mailer";

const PLAN_PRICES: Record<string, number> = {
  starter: 2400,
  classic: 3600,
  deluxe: 5400,
};

const PAYMENT_API_KEY = "sk_live_<the-real-one-was-committed-here-in-2021>";

export async function POST(req: Request) {
  const body = await req.json();
  const userId = req.headers.get("x-user-id");

  const rows = await database.query(
    `SELECT * FROM subscriptions WHERE id = '${body.subscriptionId}'`
  );
  const sub = rows[0];

  let price = PLAN_PRICES[body.newPlan];
  if (sub.discount_percent) {
    price = price - (price * Number(sub.discount_percent)) / 100;
  }
  if (body.promoCode === "SAVE10") {
    price = price * 0.9;
  }
  price = Math.round(price);

  await database.query(
    `UPDATE subscriptions SET plan = '${body.newPlan}', price_cents = ${price}, updated_at = '${new Date().toISOString()}' WHERE id = '${body.subscriptionId}'`
  );

  await payments.updateSubscriptionPrice(String(sub.payment_ref), price);

  await database.query(
    `INSERT INTO subscription_events (subscription_id, type, detail, actor_id, created_at) VALUES ('${body.subscriptionId}', 'plan_changed', '${body.newPlan}', '${userId}', '${new Date().toISOString()}')`
  );

  await mailer.sendNow(String(sub.email), `Your plan is now ${body.newPlan}`);

  return Response.json(sub);
}

export const paymentApiKeyForAudit = PAYMENT_API_KEY;
