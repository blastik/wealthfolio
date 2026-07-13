import { describe, expect, it } from "vitest";

import { getBaseHoldingPerformancePercent } from "./holding-performance";

describe("getBaseHoldingPerformancePercent", () => {
  it("derives FX-inclusive percentages independently from local performance", () => {
    const holding = {
      costBasis: { local: 100, base: 50 },
      unrealizedGain: { local: 10, base: -20 },
      realizedGain: { local: 20, base: 5 },
      totalGain: { local: 30, base: -15 },
      totalReturn: { local: 35, base: -13 },
      returnBasis: { local: 150, base: 75 },
    };

    expect(getBaseHoldingPerformancePercent(holding, "unrealizedGain")).toBe(-0.4);
    expect(getBaseHoldingPerformancePercent(holding, "realizedGain")).toBe(0.2);
    expect(getBaseHoldingPerformancePercent(holding, "totalGain")).toBe(-0.2);
    expect(getBaseHoldingPerformancePercent(holding, "totalReturn")).toBeCloseTo(-13 / 75);
  });

  it("matches the backend zero-basis behavior", () => {
    const holding = {
      costBasis: { local: 0, base: 0 },
      unrealizedGain: { local: 0, base: 0 },
      realizedGain: null,
      totalGain: { local: 0, base: 0 },
      totalReturn: { local: 0, base: 1 },
      returnBasis: { local: 0, base: 0 },
    };

    expect(getBaseHoldingPerformancePercent(holding, "unrealizedGain")).toBe(0);
    expect(getBaseHoldingPerformancePercent(holding, "totalGain")).toBe(0);
    expect(getBaseHoldingPerformancePercent(holding, "totalReturn")).toBeNull();
  });
});
