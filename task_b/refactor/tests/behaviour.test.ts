import { describe, expect, it } from "vitest";
import { call, implementations } from "./harness";

describe.each(implementations)("%s: a customer upgrades their own plan", (_name, handler) => {
  it("moves the subscription to the new plan", async () => {
    const outcome = await call(handler, {
      actorId: "user_ana",
      body: { subscriptionId: "sub_ana", newPlan: "deluxe" },
    });

    expect(outcome.threw).toBeNull();
    expect(outcome.status).toBe(200);
    expect(outcome.subscriptions).toContainEqual({
      id: "sub_ana",
      plan: "deluxe",
      priceCents: 5400,
    });
  });

  it("charges the list price when the account has no discount", async () => {
    const outcome = await call(handler, {
      actorId: "user_ana",
      body: { subscriptionId: "sub_ana", newPlan: "classic" },
    });

    expect(outcome.paymentCalls).toEqual([{ reference: "pay_ana_9931", priceCents: 3600 }]);
  });

  it("applies the account discount", async () => {
    const outcome = await call(handler, {
      actorId: "user_ben",
      body: { subscriptionId: "sub_ben", newPlan: "deluxe" },
    });

    expect(outcome.paymentCalls).toEqual([{ reference: "pay_ben_4417", priceCents: 4050 }]);
  });

  it("stacks a promo code on top of the account discount", async () => {
    const outcome = await call(handler, {
      actorId: "user_ben",
      body: { subscriptionId: "sub_ben", newPlan: "deluxe", promoCode: "SAVE10" },
    });

    expect(outcome.paymentCalls).toEqual([{ reference: "pay_ben_4417", priceCents: 3645 }]);
  });

  it("ignores an unrecognised promo code", async () => {
    const outcome = await call(handler, {
      actorId: "user_ana",
      body: { subscriptionId: "sub_ana", newPlan: "deluxe", promoCode: "NOT_A_CODE" },
    });

    expect(outcome.paymentCalls).toEqual([{ reference: "pay_ana_9931", priceCents: 5400 }]);
  });

  it("records exactly one plan_changed event attributed to the caller", async () => {
    const outcome = await call(handler, {
      actorId: "user_ana",
      body: { subscriptionId: "sub_ana", newPlan: "deluxe" },
    });

    expect(outcome.events).toEqual([
      {
        subscriptionId: "sub_ana",
        type: "plan_changed",
        detail: "deluxe",
        actorId: "user_ana",
      },
    ]);
  });

  it("leaves other customers untouched", async () => {
    const outcome = await call(handler, {
      actorId: "user_ana",
      body: { subscriptionId: "sub_ana", newPlan: "deluxe" },
    });

    expect(outcome.subscriptions).toContainEqual({
      id: "sub_ben",
      plan: "classic",
      priceCents: 3600,
    });
  });

  it("notifies the customer that their plan changed", async () => {
    const outcome = await call(handler, {
      actorId: "user_ana",
      body: { subscriptionId: "sub_ana", newPlan: "deluxe" },
    });

    expect(outcome.mailSentNow + outcome.mailQueued).toBe(1);
  });
});
