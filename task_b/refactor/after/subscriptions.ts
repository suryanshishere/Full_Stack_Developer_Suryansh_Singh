import { database, type Row } from "../support/database";
import { payments } from "../support/payments";
import { mailer } from "../support/mailer";
import { isPlanName, priceForPlan, type PlanName } from "./pricing";

export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export type Actor = { id: string };

export type ChangePlanInput = {
  subscriptionId: string;
  newPlan: PlanName;
  promoCode?: string;
};

export type SubscriptionView = {
  id: string;
  plan: string;
  priceCents: number;
  updatedAt: string;
};

export function parseChangePlanInput(body: unknown): ChangePlanInput {
  if (typeof body !== "object" || body === null) {
    throw new DomainError(422, "invalid_body", "Request body must be an object");
  }
  const { subscriptionId, newPlan, promoCode } = body as Record<string, unknown>;

  if (typeof subscriptionId !== "string" || subscriptionId.length === 0) {
    throw new DomainError(422, "invalid_subscription_id", "subscriptionId is required");
  }
  if (!isPlanName(newPlan)) {
    throw new DomainError(422, "unknown_plan", `newPlan must be one of starter, classic, deluxe`);
  }
  if (promoCode !== undefined && typeof promoCode !== "string") {
    throw new DomainError(422, "invalid_promo_code", "promoCode must be a string");
  }

  return { subscriptionId, newPlan, promoCode };
}

function toView(row: Row): SubscriptionView {
  return {
    id: String(row.id),
    plan: String(row.plan),
    priceCents: Number(row.price_cents),
    updatedAt: String(row.updated_at),
  };
}

export async function changePlan(
  actor: Actor,
  input: ChangePlanInput,
  now: Date = new Date()
): Promise<SubscriptionView> {
  const subscription = await database.findSubscription(input.subscriptionId);
  if (!subscription) {
    throw new DomainError(404, "subscription_not_found", "Subscription not found");
  }
  if (subscription.user_id !== actor.id) {
    throw new DomainError(403, "not_your_subscription", "This subscription belongs to someone else");
  }

  const priceCents = priceForPlan({
    plan: input.newPlan,
    accountDiscountPercent: Number(subscription.discount_percent ?? 0),
    promoCode: input.promoCode,
  });

  const changedAt = now.toISOString();
  const updated = await database.transaction(async (tx) => {
    const row = await tx.applySubscriptionChange(input.subscriptionId, {
      plan: input.newPlan,
      priceCents,
      changedAt,
    });
    await tx.recordEvent({
      subscriptionId: input.subscriptionId,
      type: "plan_changed",
      detail: input.newPlan,
      actorId: actor.id,
      createdAt: changedAt,
    });
    await payments.updateSubscriptionPrice(String(subscription.payment_ref), priceCents);
    return toView(row);
  });

  mailer.enqueue(String(subscription.email), `Your plan is now ${input.newPlan}`);

  return updated;
}
