export const PLAN_PRICES = {
  starter: 2400,
  classic: 3600,
  deluxe: 5400,
} as const;

export type PlanName = keyof typeof PLAN_PRICES;

export const PROMO_DISCOUNTS: Record<string, number> = {
  SAVE10: 10,
};

export function isPlanName(value: unknown): value is PlanName {
  return typeof value === "string" && value in PLAN_PRICES;
}

export function promoDiscountPercent(promoCode: unknown): number {
  if (typeof promoCode !== "string") return 0;
  return PROMO_DISCOUNTS[promoCode] ?? 0;
}

export function priceForPlan(input: {
  plan: PlanName;
  accountDiscountPercent: number;
  promoCode?: unknown;
}): number {
  const listPrice = PLAN_PRICES[input.plan];
  const afterAccountDiscount = listPrice * (1 - clampPercent(input.accountDiscountPercent) / 100);
  const afterPromo =
    afterAccountDiscount * (1 - clampPercent(promoDiscountPercent(input.promoCode)) / 100);
  return Math.round(afterPromo);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, 100);
}
