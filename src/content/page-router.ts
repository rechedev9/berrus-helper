import { createLogger } from "../utils/logger.ts";

const logger = createLogger("page-router");

export type ContentModule = "jobs" | "prices" | "session" | "network";

export interface RouteState {
  readonly pathname: string;
  readonly activeModules: ReadonlySet<ContentModule>;
}

type RouteChangeCallback = (current: RouteState, previous: RouteState) => void;

const ALWAYS_ACTIVE: readonly ContentModule[] = ["session", "network"];

const ROUTE_RULES: readonly {
  readonly pattern: RegExp;
  readonly modules: readonly ContentModule[];
}[] = [
  { pattern: /\/jobs/i, modules: ["jobs"] },
  { pattern: /\/shop/i, modules: ["prices"] },
  { pattern: /\/mercadillo/i, modules: ["prices"] },
  { pattern: /\/market/i, modules: ["prices"] },
];

let currentRoute: RouteState | undefined;
const listeners: Set<RouteChangeCallback> = new Set();

export function resolveActiveModules(pathname: string): ReadonlySet<ContentModule> {
  const modules = new Set<ContentModule>(ALWAYS_ACTIVE);

  for (const rule of ROUTE_RULES) {
    if (rule.pattern.test(pathname)) {
      for (const mod of rule.modules) {
        modules.add(mod);
      }
    }
  }

  return modules;
}

export function getCurrentRoute(): RouteState {
  if (!currentRoute) {
    const pathname = window.location.pathname;
    currentRoute = { pathname, activeModules: resolveActiveModules(pathname) };
  }
  return currentRoute;
}

export function isModuleActive(module: ContentModule): boolean {
  return getCurrentRoute().activeModules.has(module);
}

export function onRouteChange(callback: RouteChangeCallback): () => void {
  listeners.add(callback);
  return (): void => {
    listeners.delete(callback);
  };
}

export function checkUrlChange(): boolean {
  const pathname = window.location.pathname;
  const previous = currentRoute;

  if (!previous) {
    currentRoute = { pathname, activeModules: resolveActiveModules(pathname) };
    logger.info("Initial route", { pathname, modules: [...currentRoute.activeModules] });
    return true;
  }

  if (pathname === previous.pathname) {
    return false;
  }

  currentRoute = { pathname, activeModules: resolveActiveModules(pathname) };
  logger.info("Route changed", {
    from: previous.pathname,
    to: pathname,
    modules: [...currentRoute.activeModules],
  });

  for (const listener of listeners) {
    listener(currentRoute, previous);
  }

  return true;
}

/** Reset internal state — for testing only. */
export function resetPageRouterState(): void {
  currentRoute = undefined;
  listeners.clear();
}
