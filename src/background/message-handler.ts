import type { JobTimerState } from "../types/jobs.ts";
import type { PriceHistory, PriceSnapshot } from "../types/items.ts";
import { onMessage } from "../utils/messages.ts";
import { getStorage, updateStorage } from "../utils/storage.ts";
import { createJobAlarm } from "../utils/alarms.ts";
import {
  addSessionEvent,
  getSessionStats,
  startSession,
} from "./session-manager.ts";
import { searchHiscores } from "./hiscore-fetcher.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("message-handler");

const MAX_SNAPSHOTS_PER_ITEM = 100;
const MAX_COMPLETED_JOB_IDS = 500;

function addPriceSnapshot(
  histories: readonly PriceHistory[],
  snapshot: PriceSnapshot,
): readonly PriceHistory[] {
  const updated = [...histories];
  const idx = updated.findIndex((h) => h.itemId === snapshot.itemId);

  if (idx >= 0) {
    const existing = updated[idx];
    if (!existing) return histories;
    const snapshots = [...existing.snapshots, snapshot].slice(
      -MAX_SNAPSHOTS_PER_ITEM,
    );
    const prices = snapshots.map((s) => s.price);
    updated[idx] = {
      itemId: existing.itemId,
      itemName: snapshot.itemName,
      snapshots,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      currentPrice: snapshot.price,
    };
  } else {
    updated.push({
      itemId: snapshot.itemId,
      itemName: snapshot.itemName,
      snapshots: [snapshot],
      minPrice: snapshot.price,
      maxPrice: snapshot.price,
      currentPrice: snapshot.price,
    });
  }

  return updated;
}

export function registerMessageHandlers(): void {
  onMessage({
    JOB_DETECTED: async (message) => {
      logger.info("Job detected", { job: message.job });
      const result = await updateStorage(
        "jobTimers",
        (current: JobTimerState | undefined): JobTimerState => {
          const state = current ?? { activeJobs: [], completedJobIds: [] };
          const exists = state.activeJobs.some((j) => j.id === message.job.id);
          if (exists) return state;
          return {
            ...state,
            activeJobs: [...state.activeJobs, message.job],
          };
        },
      );

      if (result.ok) {
        await createJobAlarm(message.job);
      }

      return { success: result.ok };
    },

    JOB_COMPLETED: async (message) => {
      logger.info("Job completed", { jobId: message.jobId });
      const result = await updateStorage(
        "jobTimers",
        (current: JobTimerState | undefined): JobTimerState => {
          const state = current ?? { activeJobs: [], completedJobIds: [] };
          return {
            activeJobs: state.activeJobs.filter((j) => j.id !== message.jobId),
            completedJobIds: [...state.completedJobIds, message.jobId].slice(
              -MAX_COMPLETED_JOB_IDS,
            ),
          };
        },
      );
      return { success: result.ok };
    },

    PRICE_SNAPSHOT: async (message) => {
      logger.info("Price snapshot", { snapshot: message.snapshot });
      const result = await updateStorage(
        "priceHistories",
        (
          current: readonly PriceHistory[] | undefined,
        ): readonly PriceHistory[] =>
          addPriceSnapshot(current ?? [], message.snapshot),
      );
      return { success: result.ok };
    },

    XP_GAINED: async (message) => {
      const result = await addSessionEvent(message.event);
      return { success: result.ok };
    },

    ITEM_COLLECTED: async (message) => {
      const result = await addSessionEvent(message.event);
      return { success: result.ok };
    },

    SESSION_EVENT: async (message) => {
      const result = await addSessionEvent(message.event);
      return { success: result.ok };
    },

    CONTENT_SCRIPT_READY: async () => {
      logger.info("Content script ready");
      await startSession();
      return { success: true };
    },

    GET_TIMERS: async () => {
      const result = await getStorage(["jobTimers"]);
      if (!result.ok) {
        return { activeJobs: [], completedJobIds: [] };
      }
      return result.value.jobTimers ?? { activeJobs: [], completedJobIds: [] };
    },

    GET_PRICES: async (message) => {
      const result = await getStorage(["priceHistories"]);
      if (!result.ok) return [];
      const histories = result.value.priceHistories ?? [];
      if (message.itemId) {
        return histories.filter((h) => h.itemId === message.itemId);
      }
      return histories;
    },

    GET_SESSION_STATS: async () => {
      const result = await getSessionStats();
      if (!result.ok) return null;
      return result.value;
    },

    SEARCH_HISCORES: async (message) => {
      const result = await searchHiscores(message.playerName, message.category);
      if (!result.ok) {
        return {
          query: message.playerName,
          category: message.category,
          entries: [],
          fetchedAt: Date.now(),
        };
      }
      return result.value;
    },
  });
}
