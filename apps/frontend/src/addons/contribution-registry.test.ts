import { afterEach, describe, expect, it, vi } from "vitest";
import type { AddonContributedView, AddonManifest } from "@wealthfolio/addon-sdk";

// The real logger routes to the Tauri log plugin, which is unavailable under
// vitest; stub it so skipped-view warnings don't produce unhandled rejections.
vi.mock("@/adapters", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/adapters")>();
  return {
    ...actual,
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
  };
});

import {
  clearAddonContributions,
  clearAllContributions,
  getDurableNavItems,
  getDurableRoutes,
  getView,
  ingestAddonContributions,
} from "./contribution-registry";
import {
  clearAddonRegistrations,
  getDynamicNavItems,
  getDynamicRoutes,
  registerAddonNavItem,
  registerAddonRoute,
  setInstalledAddonIds,
} from "./addons-runtime-context";

function manifest(id: string, views: AddonContributedView[]): AddonManifest {
  return {
    id,
    name: id,
    version: "1.0.0",
    contributes: { views },
  };
}

const ADDON = "swingfolio-addon";

describe("contribution registry", () => {
  afterEach(() => {
    clearAllContributions();
    clearAddonRegistrations(ADDON);
    clearAddonRegistrations("other-addon");
    setInstalledAddonIds([]);
  });

  it("ingests valid views into the durable nav/route getters and getView", () => {
    ingestAddonContributions(
      ADDON,
      manifest(ADDON, [
        { id: "home", label: "Swingfolio", path: "/addons/swingfolio", icon: "TrendingUp", order: 5 },
      ]),
    );

    expect(getDurableNavItems()).toEqual([
      expect.objectContaining({
        addonId: ADDON,
        id: `${ADDON}:home`,
        title: "Swingfolio",
        href: "/addons/swingfolio",
        icon: "TrendingUp",
        order: 5,
      }),
    ]);
    expect(getDurableRoutes()).toEqual([
      expect.objectContaining({
        addonId: ADDON,
        routeId: "home",
        href: "/addons/swingfolio",
        path: "addons/swingfolio",
        title: "Swingfolio",
      }),
    ]);
    expect(getView(ADDON, "home")).toEqual(
      expect.objectContaining({ id: "home", label: "Swingfolio", path: "/addons/swingfolio" }),
    );
  });

  it("skips invalid views (external URL, out-of-namespace, empty field, duplicate id)", () => {
    ingestAddonContributions(
      ADDON,
      manifest(ADDON, [
        { id: "good", label: "Good", path: "/addons/swingfolio" },
        { id: "ext", label: "External", path: "https://evil.example.com/x" },
        { id: "oob", label: "Out of bounds", path: "/addon/some-other-addon" },
        { id: "", label: "No id", path: "/addons/swingfolio/x" },
        { id: "blank", label: "", path: "/addons/swingfolio/y" },
        { id: "good", label: "Duplicate", path: "/addons/swingfolio/dup" },
      ]),
    );

    const navIds = getDurableNavItems().map((item) => item.id);
    expect(navIds).toEqual([`${ADDON}:good`]);
    // The duplicate must not overwrite the first "good" view.
    expect(getView(ADDON, "good")?.label).toBe("Good");
    expect(getView(ADDON, "ext")).toBeUndefined();
    expect(getView(ADDON, "oob")).toBeUndefined();
  });

  it("clears one addon's contributions without touching another", () => {
    ingestAddonContributions(ADDON, manifest(ADDON, [
      { id: "home", label: "Swingfolio", path: "/addons/swingfolio" },
    ]));
    ingestAddonContributions("other-addon", manifest("other-addon", [
      { id: "home", label: "Other", path: "/addons/other" },
    ]));

    clearAddonContributions(ADDON);

    expect(getDurableNavItems().map((item) => item.addonId)).toEqual(["other-addon"]);
    expect(getView(ADDON, "home")).toBeUndefined();
    expect(getView("other-addon", "home")).toBeDefined();
  });

  it("dedupes a transient runtime registration that duplicates a durable view id (durable wins)", () => {
    ingestAddonContributions(ADDON, manifest(ADDON, [
      { id: "home", label: "Durable Home", path: "/addons/swingfolio" },
    ]));

    // Runtime registration reusing the same view id (RFC A2: view id == route id).
    registerAddonNavItem(ADDON, {
      id: "home",
      label: "Transient Home",
      route: "/addons/swingfolio",
    });
    registerAddonRoute(ADDON, { path: "/addons/swingfolio", routeId: "home" });

    const navForAddon = getDynamicNavItems().filter((item) => item.addonId === ADDON);
    expect(navForAddon).toHaveLength(1);
    expect(navForAddon[0].title).toBe("Durable Home");

    const routesForAddon = getDynamicRoutes().filter((route) => route.addonId === ADDON);
    expect(routesForAddon).toHaveLength(1);
    expect(routesForAddon[0].title).toBe("Durable Home");
  });
});
