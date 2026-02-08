import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

export function queryOne<T extends Element>(
  selector: string,
  parent: ParentNode = document,
): Result<T, string> {
  const el = parent.querySelector<T>(selector);
  if (!el) {
    return err(`Element not found: ${selector}`);
  }
  return ok(el);
}

export function queryAll<T extends Element>(
  selector: string,
  parent: ParentNode = document,
): readonly T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

const POLL_INTERVAL_MS = 200;
const DEFAULT_TIMEOUT_MS = 10_000;

export function waitForElement<T extends Element>(
  selector: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  parent: ParentNode = document,
): Promise<Result<T, string>> {
  return new Promise((resolve) => {
    const existing = parent.querySelector<T>(selector);
    if (existing) {
      resolve(ok(existing));
      return;
    }

    let settled = false;

    function settle(result: Result<T, string>): void {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      clearInterval(poll);
      resolve(result);
    }

    const observer = new MutationObserver(() => {
      const el = parent.querySelector<T>(selector);
      if (el) {
        settle(ok(el));
      }
    });

    const timer = setTimeout(() => {
      settle(err(`Timeout waiting for element: ${selector}`));
    }, timeoutMs);

    observer.observe(parent instanceof Document ? parent.body : parent, {
      childList: true,
      subtree: true,
    });

    const poll = setInterval(() => {
      const el = parent.querySelector<T>(selector);
      if (el) {
        settle(ok(el));
      }
    }, POLL_INTERVAL_MS);
  });
}
