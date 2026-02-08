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

    const observer = new MutationObserver(() => {
      const el = parent.querySelector<T>(selector);
      if (el) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(ok(el));
      }
    });

    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(err(`Timeout waiting for element: ${selector}`));
    }, timeoutMs);

    observer.observe(parent instanceof Document ? parent.body : parent, {
      childList: true,
      subtree: true,
    });

    // Also poll in case MutationObserver misses it
    const poll = setInterval(() => {
      const el = parent.querySelector<T>(selector);
      if (el) {
        clearInterval(poll);
        observer.disconnect();
        clearTimeout(timer);
        resolve(ok(el));
      }
    }, POLL_INTERVAL_MS);

    // Clean up poll on timeout too
    setTimeout(() => clearInterval(poll), timeoutMs);
  });
}
