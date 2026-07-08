import { logger } from "@/adapters";
import type { AddonContributedView, AddonManifest } from "@wealthfolio/addon-sdk";

import {
  cleanRoutePath,
  isAddonRoutePathAllowed,
  scopedKey,
  toRouterPath,
  triggerNavigationUpdate,
  type DynamicNavItem,
  type DynamicRouteEntry,
} from "./addons-runtime-context";

/**
 * Durable contribution layer.
 *
 * Ingests each installed addon's `manifest.contributes.views` at boot WITHOUT
 * executing addon code, producing `DynamicNavItem`/`DynamicRouteEntry`-shaped
 * records that {@link ./addons-runtime-context} merges with its transient
 * runtime registrations. Entries here survive a runtime stop (a stopped-but-
 * enabled addon keeps its nav so it can be re-activated) and are cleared only on
 * disable/uninstall (or a full re-ingest on reload).
 *
 * Security note: validation reuses the exact route-namespace policy of the
 * transient path (`isAddonRoutePathAllowed`) — no security logic is duplicated
 * here. Invalid views are logged and skipped so one bad view cannot kill boot.
 */

// All three maps are keyed by `scopedKey(addonId, view.id)`.
const durableNavItems = new Map<string, DynamicNavItem>();
const durableRoutes = new Map<string, DynamicRouteEntry>();
const durableViews = new Map<string, AddonContributedView>();

function isExternalUrl(path: string) {
  // Anything with an explicit scheme or protocol-relative prefix escapes the
  // in-app router namespace and must be rejected outright.
  return /^[a-z][a-z0-9+.-]*:/i.test(path.trim()) || path.trim().startsWith("//");
}

interface IngestOptions {
  /**
   * Dev-mode addons stay runtime-registered and pinned (see refactor plan §5 G);
   * v1 does not ingest dev manifests into the durable layer. When true, ingest is
   * a no-op.
   */
  dev?: boolean;
}

/**
 * Ingest an addon's declarative view contributions into the durable layer.
 * Does not execute addon code and does not boot an iframe.
 */
export function ingestAddonContributions(
  addonId: string,
  manifest: AddonManifest,
  opts: IngestOptions = {},
): void {
  if (opts.dev) {
    return;
  }

  const views = manifest.contributes?.views ?? [];
  if (views.length === 0) {
    return;
  }

  const seenViewIds = new Set<string>();
  let changed = false;

  for (const view of views) {
    const viewId = String(view?.id ?? "").trim();
    const label = String(view?.label ?? "").trim();
    const rawPath = String(view?.path ?? "").trim();

    if (!viewId || !label || !rawPath) {
      logger.warn(
        `Addon '${addonId}' contributes a view with an empty id/label/path; skipping.`,
      );
      continue;
    }

    if (seenViewIds.has(viewId)) {
      logger.warn(
        `Addon '${addonId}' contributes duplicate view id '${viewId}'; skipping the duplicate.`,
      );
      continue;
    }
    seenViewIds.add(viewId);

    if (isExternalUrl(rawPath)) {
      logger.warn(
        `Addon '${addonId}' view '${viewId}' points at an external URL '${rawPath}'; skipping.`,
      );
      continue;
    }

    const href = cleanRoutePath(rawPath);
    // Reuse the same route-namespace policy as runtime registration — a view may
    // only mount under a path this addon is allowed to own.
    if (!isAddonRoutePathAllowed(addonId, href)) {
      logger.warn(
        `Addon '${addonId}' view '${viewId}' requests out-of-namespace path '${href}'; skipping.`,
      );
      continue;
    }

    const key = scopedKey(addonId, viewId);
    durableNavItems.set(key, {
      addonId,
      href,
      icon: typeof view.icon === "string" ? view.icon : undefined,
      id: key,
      order: typeof view.order === "number" ? view.order : 999,
      title: label,
    });
    durableRoutes.set(key, {
      addonId,
      href,
      path: toRouterPath(href),
      routeId: viewId,
      title: label,
    });
    durableViews.set(key, { ...view, id: viewId, label, path: rawPath });
    changed = true;
  }

  if (changed) {
    triggerNavigationUpdate();
  }
}

/** Sorted durable nav items (same shape/sort contract as the transient layer). */
export function getDurableNavItems(): DynamicNavItem[] {
  return Array.from(durableNavItems.values()).sort((a, b) => a.order - b.order);
}

/** Sorted durable routes (same shape/sort contract as the transient layer). */
export function getDurableRoutes(): DynamicRouteEntry[] {
  return Array.from(durableRoutes.values()).sort((a, b) => a.path.localeCompare(b.path));
}

/** The original contributed-view record for a given addon/view, if any. */
export function getView(addonId: string, viewId: string): AddonContributedView | undefined {
  return durableViews.get(scopedKey(addonId, viewId));
}

/**
 * Remove one addon's durable contributions. Call on disable/uninstall/manifest
 * update — NOT on plain runtime stop (a stopped-but-enabled addon keeps its nav
 * so it can be re-activated by lazy boot).
 */
export function clearAddonContributions(addonId: string): void {
  let changed = false;
  for (const [key, item] of durableNavItems) {
    if (item.addonId === addonId) {
      durableNavItems.delete(key);
      changed = true;
    }
  }
  for (const [key, route] of durableRoutes) {
    if (route.addonId === addonId) {
      durableRoutes.delete(key);
      changed = true;
    }
  }
  for (const key of Array.from(durableViews.keys())) {
    if (key.startsWith(`${addonId}:`)) {
      durableViews.delete(key);
    }
  }
  if (changed) {
    triggerNavigationUpdate();
  }
}

/**
 * Drop the entire durable registry. Used before a full re-ingest on reload so a
 * disabled/uninstalled addon that is no longer discovered leaves no stale nav.
 */
export function clearAllContributions(): void {
  const hadEntries = durableNavItems.size > 0 || durableRoutes.size > 0;
  durableNavItems.clear();
  durableRoutes.clear();
  durableViews.clear();
  if (hadEntries) {
    triggerNavigationUpdate();
  }
}
