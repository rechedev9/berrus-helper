import type { StorageSchema } from "../types/storage.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { createLogger } from "./logger.ts";

const logger = createLogger("storage");

export interface ChromeStoragePort {
  readonly get: (keys: readonly string[]) => Promise<Record<string, unknown>>;
  readonly set: (items: Record<string, unknown>) => Promise<void>;
}

function defaultPort(): ChromeStoragePort {
  return {
    get: (keys: readonly string[]): Promise<Record<string, unknown>> =>
      chrome.storage.local.get([...keys]),
    set: (items: Record<string, unknown>): Promise<void> =>
      chrome.storage.local.set(items),
  };
}

export async function getStorage<K extends keyof StorageSchema>(
  keys: readonly K[],
  port: ChromeStoragePort = defaultPort(),
): Promise<Result<Pick<StorageSchema, K>, string>> {
  try {
    const result = await port.get(keys);
    // TS limitation: chrome.storage.local.get returns untyped Record
    return ok(result as Pick<StorageSchema, K>);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("Failed to get storage", { keys, error: message });
    return err(`Storage get failed: ${message}`);
  }
}

export async function setStorage<K extends keyof StorageSchema>(
  items: Partial<Pick<StorageSchema, K>>,
  port: ChromeStoragePort = defaultPort(),
): Promise<Result<void, string>> {
  try {
    await port.set({ ...items });
    return ok(undefined);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("Failed to set storage", { error: message });
    return err(`Storage set failed: ${message}`);
  }
}

export async function updateStorage<K extends keyof StorageSchema>(
  key: K,
  updater: (current: StorageSchema[K] | undefined) => StorageSchema[K],
  port: ChromeStoragePort = defaultPort(),
): Promise<Result<StorageSchema[K], string>> {
  const getResult = await getStorage([key], port);
  if (!getResult.ok) {
    return getResult;
  }

  const current = getResult.value[key];
  const updated = updater(current);

  // TS limitation: computed property key loses type narrowing
  const setResult = await setStorage(
    { [key]: updated } as Partial<Pick<StorageSchema, K>>,
    port,
  );
  if (!setResult.ok) {
    return setResult;
  }

  return ok(updated);
}
