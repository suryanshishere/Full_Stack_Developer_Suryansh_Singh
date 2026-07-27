import { describe, expect, it } from "vitest";
import { POST as before } from "../before/change-plan";
import { POST as after } from "../after/route";
import { call, invoke } from "./harness";

describe("defect 1: any signed-in customer can change someone else's plan", () => {
  const attack = {
    actorId: "user_ben",
    body: { subscriptionId: "sub_ana", newPlan: "starter" },
  };

  it("before: Ben downgrades Ana and the write goes through", async () => {
    const outcome = await call(before, attack);

    expect(outcome.status).toBe(200);
    expect(outcome.subscriptions).toContainEqual({
      id: "sub_ana",
      plan: "starter",
      priceCents: 2400,
    });
    expect(outcome.paymentCalls).toHaveLength(1);
  });

  it("after: the request is refused and nothing changes", async () => {
    const outcome = await call(after, attack);

    expect(outcome.status).toBe(403);
    expect(outcome.subscriptions).toContainEqual({
      id: "sub_ana",
      plan: "starter",
      priceCents: 2400,
    });
    expect(outcome.paymentCalls).toEqual([]);
    expect(outcome.events).toEqual([]);
  });
});

describe("defect 2: the subscription id is concatenated straight into SQL", () => {
  const injection = {
    actorId: "user_ben",
    body: { subscriptionId: "nope' OR '1'='1", newPlan: "starter" },
  };

  it("before: one request rewrites every subscription in the table", async () => {
    const outcome = await call(before, injection);

    expect(outcome.status).toBe(200);
    expect(outcome.subscriptions).toEqual([
      { id: "sub_ana", plan: "starter", priceCents: 2400 },
      { id: "sub_ben", plan: "starter", priceCents: 2400 },
    ]);
  });

  it("after: the id is looked up as a value, so it matches nothing", async () => {
    const outcome = await call(after, injection);

    expect(outcome.status).toBe(404);
    expect(outcome.subscriptions).toEqual([
      { id: "sub_ana", plan: "starter", priceCents: 2400 },
      { id: "sub_ben", plan: "classic", priceCents: 3600 },
    ]);
  });
});

describe("defect 3: an unknown plan produces a price of NaN", () => {
  const badPlan = {
    actorId: "user_ana",
    body: { subscriptionId: "sub_ana", newPlan: "premium" },
  };

  it("before: NaN is written to the row and sent to the payment provider", async () => {
    const outcome = await call(before, badPlan);

    const ana = outcome.subscriptions.find((row) => row.id === "sub_ana");
    expect(Number.isFinite(Number(ana?.priceCents))).toBe(false);
    expect(outcome.paymentCalls).toHaveLength(1);
    expect(Number.isFinite(outcome.paymentCalls[0].priceCents)).toBe(false);
  });

  it("after: the request is rejected before anything is written", async () => {
    const outcome = await call(after, badPlan);

    expect(outcome.status).toBe(422);
    expect(outcome.subscriptions).toContainEqual({
      id: "sub_ana",
      plan: "starter",
      priceCents: 2400,
    });
    expect(outcome.paymentCalls).toEqual([]);
  });
});

describe("defect 4: the payment provider failing leaves the database ahead of billing", () => {
  const upgrade = {
    actorId: "user_ana",
    body: { subscriptionId: "sub_ana", newPlan: "deluxe" },
    failPayment: true,
  };

  it("before: the customer is on deluxe, was never charged, and no event records it", async () => {
    const outcome = await call(before, upgrade);

    expect(outcome.threw).toContain("payment provider unavailable");
    expect(outcome.subscriptions).toContainEqual({
      id: "sub_ana",
      plan: "deluxe",
      priceCents: 5400,
    });
    expect(outcome.paymentCalls).toEqual([]);
    expect(outcome.events).toEqual([]);
  });

  it("after: the whole change rolls back", async () => {
    const outcome = await call(after, upgrade);

    expect(outcome.threw).toContain("payment provider unavailable");
    expect(outcome.subscriptions).toContainEqual({
      id: "sub_ana",
      plan: "starter",
      priceCents: 2400,
    });
    expect(outcome.paymentCalls).toEqual([]);
    expect(outcome.events).toEqual([]);
  });
});

describe("defect 5: sending email inside the request turns a retry into a double charge", () => {
  const upgrade = {
    actorId: "user_ana",
    body: { subscriptionId: "sub_ana", newPlan: "deluxe" },
  };

  it("before: mail fails after the money moved, and the retry charges again", async () => {
    const first = await call(before, { ...upgrade, failMail: true });
    expect(first.threw).toContain("mail provider timed out");
    expect(first.paymentCalls).toHaveLength(1);

    const retry = await invoke(before, upgrade);
    expect(retry.paymentCalls).toHaveLength(2);
    expect(retry.events).toHaveLength(2);
  });

  it("after: delivery is queued, so the request succeeds once and stays succeeded", async () => {
    const outcome = await call(after, { ...upgrade, failMail: true });

    expect(outcome.threw).toBeNull();
    expect(outcome.status).toBe(200);
    expect(outcome.paymentCalls).toHaveLength(1);
    expect(outcome.mailQueued).toBe(1);
  });
});

describe("defect 6: the response is stale and exposes internal columns", () => {
  const upgrade = {
    actorId: "user_ana",
    body: { subscriptionId: "sub_ana", newPlan: "deluxe" },
  };

  it("before: returns the pre-change row including notes and the payment reference", async () => {
    const outcome = await call(before, upgrade);
    const body = outcome.body as Record<string, unknown>;

    expect(body.plan).toBe("starter");
    expect(body.internal_notes).toBeDefined();
    expect(body.payment_ref).toBeDefined();
  });

  it("after: returns the updated subscription and nothing internal", async () => {
    const outcome = await call(after, upgrade);
    const body = outcome.body as Record<string, unknown>;

    expect(body).toEqual({
      id: "sub_ana",
      plan: "deluxe",
      priceCents: 5400,
      updatedAt: expect.any(String),
    });
  });
});

describe("the caller must be authenticated", () => {
  it("after: a request with no user header is rejected", async () => {
    const outcome = await call(after, {
      body: { subscriptionId: "sub_ana", newPlan: "deluxe" },
    });

    expect(outcome.status).toBe(401);
    expect(outcome.paymentCalls).toEqual([]);
  });
});
