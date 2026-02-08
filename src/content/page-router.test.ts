import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  resolveActiveModules,
  isModuleActive,
  getCurrentRoute,
  checkUrlChange,
  onRouteChange,
  resetPageRouterState,
} from "./page-router.ts";
import type { RouteState } from "./page-router.ts";

const originalLocation = window.location;

function setPathname(pathname: string): void {
  Object.defineProperty(window, "location", {
    value: { ...originalLocation, pathname },
    writable: true,
    configurable: true,
  });
}

function restoreLocation(): void {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  resetPageRouterState();
  setPathname("/");
});

afterEach(() => {
  restoreLocation();
});

describe("page-router", () => {
  describe("resolveActiveModules", () => {
    it("should always include session and network", () => {
      const modules = resolveActiveModules("/character");

      expect(modules.has("session")).toBe(true);
      expect(modules.has("network")).toBe(true);
    });

    it("should include jobs on /jobs page", () => {
      const modules = resolveActiveModules("/g/c/rsn/jobs");

      expect(modules.has("jobs")).toBe(true);
    });

    it("should include prices on /shop page", () => {
      const modules = resolveActiveModules("/g/c/rsn/shop");

      expect(modules.has("prices")).toBe(true);
    });

    it("should include prices on /mercadillo page", () => {
      const modules = resolveActiveModules("/g/c/rsn/mercadillo");

      expect(modules.has("prices")).toBe(true);
    });

    it("should include prices on /market page", () => {
      const modules = resolveActiveModules("/g/c/rsn/market");

      expect(modules.has("prices")).toBe(true);
    });

    it("should not include jobs on character page", () => {
      const modules = resolveActiveModules("/g/c/rsn/character");

      expect(modules.has("jobs")).toBe(false);
    });

    it("should not include prices on skills page", () => {
      const modules = resolveActiveModules("/g/c/rsn/character/skills");

      expect(modules.has("prices")).toBe(false);
    });

    it("should not include jobs or prices on combat page", () => {
      const modules = resolveActiveModules("/g/c/rsn/combat");

      expect(modules.has("jobs")).toBe(false);
      expect(modules.has("prices")).toBe(false);
    });

    it("should not include jobs or prices on dungeons page", () => {
      const modules = resolveActiveModules("/g/c/rsn/dungeons");

      expect(modules.has("jobs")).toBe(false);
      expect(modules.has("prices")).toBe(false);
    });

    it("should handle case insensitive matching", () => {
      const modules = resolveActiveModules("/g/c/rsn/JOBS");

      expect(modules.has("jobs")).toBe(true);
    });

    it("should handle trailing slashes", () => {
      const modules = resolveActiveModules("/g/c/rsn/jobs/");

      expect(modules.has("jobs")).toBe(true);
    });
  });

  describe("checkUrlChange", () => {
    it("should return true on first call", () => {
      const changed = checkUrlChange();

      expect(changed).toBe(true);
    });

    it("should return false when pathname has not changed", () => {
      checkUrlChange();

      const changed = checkUrlChange();

      expect(changed).toBe(false);
    });

    it("should return true when pathname changes", () => {
      checkUrlChange();

      setPathname("/g/c/rsn/jobs");
      const changed = checkUrlChange();

      expect(changed).toBe(true);
    });

    it("should fire callbacks with previous and current route on change", () => {
      checkUrlChange();

      let capturedCurrent: RouteState | undefined;
      let capturedPrevious: RouteState | undefined;
      onRouteChange((current, previous) => {
        capturedCurrent = current;
        capturedPrevious = previous;
      });

      setPathname("/g/c/rsn/shop");
      checkUrlChange();

      expect(capturedCurrent?.pathname).toBe("/g/c/rsn/shop");
      expect(capturedPrevious?.pathname).toBe("/");
    });
  });

  describe("isModuleActive", () => {
    it("should report session as always active", () => {
      checkUrlChange();

      expect(isModuleActive("session")).toBe(true);
    });

    it("should report network as always active", () => {
      checkUrlChange();

      expect(isModuleActive("network")).toBe(true);
    });

    it("should report jobs inactive on non-jobs page", () => {
      checkUrlChange();

      expect(isModuleActive("jobs")).toBe(false);
    });

    it("should report jobs active on jobs page", () => {
      setPathname("/g/c/rsn/jobs");
      checkUrlChange();

      expect(isModuleActive("jobs")).toBe(true);
    });

    it("should report prices active on shop page", () => {
      setPathname("/g/c/rsn/shop");
      checkUrlChange();

      expect(isModuleActive("prices")).toBe(true);
    });
  });

  describe("onRouteChange", () => {
    it("should allow unsubscribing", () => {
      checkUrlChange();

      let callCount = 0;
      const unsubscribe = onRouteChange(() => {
        callCount += 1;
      });

      setPathname("/g/c/rsn/jobs");
      checkUrlChange();

      unsubscribe();

      setPathname("/g/c/rsn/shop");
      checkUrlChange();

      expect(callCount).toBe(1);
    });

    it("should not fire callback after unsubscribe", () => {
      checkUrlChange();

      let fired = false;
      const unsubscribe = onRouteChange(() => {
        fired = true;
      });
      unsubscribe();

      setPathname("/g/c/rsn/jobs");
      checkUrlChange();

      expect(fired).toBe(false);
    });
  });

  describe("getCurrentRoute", () => {
    it("should seed route if not initialized", () => {
      const route = getCurrentRoute();

      expect(route.pathname).toBeDefined();
      expect(route.activeModules.has("session")).toBe(true);
    });
  });
});
