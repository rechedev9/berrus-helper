import type { JobTimerState } from "./jobs.ts";
import type { PriceHistory } from "./items.ts";
import type { SessionStats } from "./session.ts";

export interface ExtensionSettings {
  readonly notificationsEnabled: boolean;
  readonly priceTrackingEnabled: boolean;
  readonly sessionTrackingEnabled: boolean;
  readonly hiscoreCacheMinutes: number;
}

export interface StorageSchema {
  readonly settings: ExtensionSettings;
  readonly jobTimers: JobTimerState;
  readonly priceHistories: readonly PriceHistory[];
  readonly currentSession: SessionStats | null;
  readonly lastHiscoreSearch: string | null;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  notificationsEnabled: true,
  priceTrackingEnabled: true,
  sessionTrackingEnabled: true,
  hiscoreCacheMinutes: 5,
} as const;

export const DEFAULT_STORAGE: StorageSchema = {
  settings: DEFAULT_SETTINGS,
  jobTimers: { activeJobs: [], completedJobIds: [] },
  priceHistories: [],
  currentSession: null,
  lastHiscoreSearch: null,
} as const;
