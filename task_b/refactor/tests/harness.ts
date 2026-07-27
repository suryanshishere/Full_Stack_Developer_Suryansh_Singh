import { database, resetDatabase } from "../support/database";
import { payments, resetPayments } from "../support/payments";
import { mailer, resetMailer } from "../support/mailer";
import { POST as legacyHandler } from "../before/change-plan";
import { POST as refactoredHandler } from "../after/route";

export type Handler = (req: Request) => Promise<Response>;

export const implementations: [string, Handler][] = [
  ["before", legacyHandler],
  ["after", refactoredHandler],
];

export type CallOptions = {
  actorId?: string;
  body: unknown;
  failPayment?: boolean;
  failMail?: boolean;
};

export type Outcome = {
  status: number | null;
  body: unknown;
  threw: string | null;
  subscriptions: { id: string; plan: string; priceCents: unknown }[];
  paymentCalls: { reference: string; priceCents: number }[];
  events: { subscriptionId: string; type: string; detail: string; actorId: string }[];
  mailSentNow: number;
  mailQueued: number;
};

export function reset() {
  resetDatabase();
  resetPayments();
  resetMailer();
}

export async function call(handler: Handler, options: CallOptions): Promise<Outcome> {
  reset();
  if (options.failPayment) payments.failNextCall = true;
  if (options.failMail) mailer.failNextSend = true;
  return invoke(handler, options);
}

export async function invoke(handler: Handler, options: CallOptions): Promise<Outcome> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.actorId) headers["x-user-id"] = options.actorId;

  let status: number | null = null;
  let body: unknown = null;
  let threw: string | null = null;

  try {
    const response = await handler(
      new Request("http://crateful.test/api/subscriptions/change-plan", {
        method: "POST",
        headers,
        body: JSON.stringify(options.body),
      })
    );
    status = response.status;
    body = await response.json().catch(() => null);
  } catch (error) {
    threw = error instanceof Error ? error.message : String(error);
  }

  return {
    status,
    body,
    threw,
    subscriptions: database.table("subscriptions").map((row) => ({
      id: String(row.id),
      plan: String(row.plan),
      priceCents: row.price_cents,
    })),
    paymentCalls: payments.calls.map((entry) => ({ ...entry })),
    events: database.table("subscription_events").map((row) => ({
      subscriptionId: String(row.subscription_id),
      type: String(row.type),
      detail: String(row.detail),
      actorId: String(row.actor_id),
    })),
    mailSentNow: mailer.sent.length,
    mailQueued: mailer.queued.length,
  };
}
