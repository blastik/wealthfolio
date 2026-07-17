import { describe, it, expect } from "vitest";
import { ACTIVITY_FORM_CONFIG } from "./activity-form-config";
import type { AccountSelectOption } from "../components/forms/fields";
import type { ActivityDetails } from "@/lib/types";

const accounts: AccountSelectOption[] = [
  { value: "acc-1", label: "Test Account", currency: "USD" },
];

describe("ACTIVITY_FORM_CONFIG.EXCHANGE.getDefaults", () => {
  it("returns empty defaults when creating (no activity)", () => {
    const defaults = ACTIVITY_FORM_CONFIG.EXCHANGE.getDefaults(undefined, accounts);
    expect(defaults).toMatchObject({
      fromAssetId: "",
      toAssetId: "",
      fee: 0,
    });
  });

  it("maps own asset to 'from' and counterpart to 'to' when editing the EXCHANGE_OUT leg", () => {
    const activity: Partial<ActivityDetails> = {
      accountId: "acc-1",
      date: new Date("2026-02-01T10:00:00.000Z"),
      subtype: "EXCHANGE_OUT",
      assetId: "aapl-id",
      assetSymbol: "AAPL",
      quantity: "3",
      currency: "USD",
      counterpartAssetId: "googl-id",
      counterpartAssetSymbol: "GOOGL",
      counterpartQuantity: "2",
      counterpartCurrency: "USD",
      counterpartFee: "5",
      comment: "note",
    };

    const defaults = ACTIVITY_FORM_CONFIG.EXCHANGE.getDefaults(activity, accounts) as Record<
      string,
      unknown
    >;

    expect(defaults.fromAssetId).toBe("AAPL");
    expect(defaults.fromExistingAssetId).toBe("aapl-id");
    expect(defaults.fromQuantity).toBe(3);
    expect(defaults.toAssetId).toBe("GOOGL");
    expect(defaults.toExistingAssetId).toBe("googl-id");
    expect(defaults.toQuantity).toBe(2);
    // Editing the OUT leg: the fee belongs to the counterpart (IN) leg.
    expect(defaults.fee).toBe(5);
    expect(defaults.comment).toBe("note");
  });

  it("maps own asset to 'to' and counterpart to 'from' when editing the EXCHANGE_IN leg", () => {
    const activity: Partial<ActivityDetails> = {
      accountId: "acc-1",
      date: new Date("2026-02-01T10:00:00.000Z"),
      subtype: "EXCHANGE_IN",
      assetId: "googl-id",
      assetSymbol: "GOOGL",
      quantity: "2",
      currency: "USD",
      fee: "5",
      counterpartAssetId: "aapl-id",
      counterpartAssetSymbol: "AAPL",
      counterpartQuantity: "3",
      counterpartCurrency: "USD",
    };

    const defaults = ACTIVITY_FORM_CONFIG.EXCHANGE.getDefaults(activity, accounts) as Record<
      string,
      unknown
    >;

    expect(defaults.fromAssetId).toBe("AAPL");
    expect(defaults.fromExistingAssetId).toBe("aapl-id");
    expect(defaults.fromQuantity).toBe(3);
    expect(defaults.toAssetId).toBe("GOOGL");
    expect(defaults.toExistingAssetId).toBe("googl-id");
    expect(defaults.toQuantity).toBe(2);
    // Editing the IN leg directly: its own fee is used.
    expect(defaults.fee).toBe(5);
  });
});
