import { Purchases } from "@revenuecat/purchases-js";

export const PRO_ENTITLEMENT = "sweepsign_pro";

export type BillingState =
  "unavailable" | "ready" | "success" | "cancelled" | "error";

/** Thin boundary so the UI can be tested without pretending a checkout succeeded. */
export class RevenueCatBilling {
  private purchases: Purchases | null = null;

  constructor(
    private readonly apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY,
  ) {}

  get configured() {
    return Boolean(this.apiKey?.startsWith("test_"));
  }

  async connect(userId: string): Promise<boolean> {
    if (!this.configured || !this.apiKey) return false;
    this.purchases ??= Purchases.configure({
      apiKey: this.apiKey,
      appUserId: userId,
    });
    const info = await this.purchases.getCustomerInfo();
    return Boolean(info.entitlements.active[PRO_ENTITLEMENT]);
  }

  async presentPaywall(): Promise<BillingState> {
    if (!this.purchases) return "unavailable";
    try {
      const result = await this.purchases.presentPaywall({});
      return result.customerInfo.entitlements.active[PRO_ENTITLEMENT]
        ? "success"
        : "cancelled";
    } catch {
      return "error";
    }
  }

  async restore(): Promise<BillingState> {
    if (!this.purchases) return "unavailable";
    try {
      const info = await this.purchases.getCustomerInfo();
      return info.entitlements.active[PRO_ENTITLEMENT]
        ? "success"
        : "cancelled";
    } catch {
      return "error";
    }
  }
}
