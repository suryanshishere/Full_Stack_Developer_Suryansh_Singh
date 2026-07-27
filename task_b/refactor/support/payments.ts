export type PaymentCall = { reference: string; priceCents: number };

class PaymentProvider {
  calls: PaymentCall[] = [];
  failNextCall = false;

  async updateSubscriptionPrice(reference: string, priceCents: number): Promise<void> {
    if (this.failNextCall) {
      this.failNextCall = false;
      throw new Error("payment provider unavailable (503)");
    }
    this.calls.push({ reference, priceCents });
  }
}

export let payments = new PaymentProvider();

export function resetPayments(): PaymentProvider {
  payments = new PaymentProvider();
  return payments;
}
