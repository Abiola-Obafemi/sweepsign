import { describe, expect, it } from "vitest";
import { RevenueCatBilling } from "./billing";

describe("RevenueCat Test Store boundary", () => {
  it("accepts only explicit Test Store keys", () => {
    expect(new RevenueCatBilling("test_example").configured).toBe(true);
    expect(new RevenueCatBilling("rcb_live_example").configured).toBe(false);
    expect(new RevenueCatBilling("").configured).toBe(false);
  });
});
