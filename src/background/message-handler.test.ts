import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  installMockChrome,
  type ChromeMockHandle,
} from "../test-utils/chrome-mock.ts";
import { buildIdleJob, buildPriceSnapshot, buildSessionEvent } from "../test-utils/fixtures.ts";
import { registerMessageHandlers } from "./message-handler.ts";
import type { JobTimerState } from "../types/jobs.ts";
import type { PriceHistory } from "../types/items.ts";
import type { SessionStats } from "../types/session.ts";

let handle: ChromeMockHandle;

beforeEach(() => {
  handle = installMockChrome();
  registerMessageHandlers();
});

afterEach(() => {
  handle.reset();
});

describe("message-handler", () => {
  describe("JOB_DETECTED", () => {
    it("should add a new job to activeJobs", async () => {
      const job = buildIdleJob({ id: "job-1" });
      const response = await handle.simulateMessage({
        type: "JOB_DETECTED",
        job,
      });

      expect(response).toEqual({ success: true });
      const data = handle.getStorageData();
      const timers = data["jobTimers"] as JobTimerState;
      expect(timers.activeJobs).toHaveLength(1);
      expect(timers.activeJobs[0]?.id).toBe("job-1");
    });

    it("should create an alarm for the job", async () => {
      const job = buildIdleJob({ id: "alarm-job" });
      await handle.simulateMessage({ type: "JOB_DETECTED", job });

      const alarms = handle.getAlarms();
      expect(alarms.has("job-timer-alarm-job")).toBe(true);
    });

    it("should deduplicate jobs with the same id", async () => {
      const job = buildIdleJob({ id: "dup-job" });
      await handle.simulateMessage({ type: "JOB_DETECTED", job });
      await handle.simulateMessage({ type: "JOB_DETECTED", job });

      const data = handle.getStorageData();
      const timers = data["jobTimers"] as JobTimerState;
      expect(timers.activeJobs).toHaveLength(1);
    });

    it("should add multiple distinct jobs", async () => {
      const job1 = buildIdleJob({ id: "j-1", name: "Mining Iron" });
      const job2 = buildIdleJob({ id: "j-2", name: "Mining Gold" });
      await handle.simulateMessage({ type: "JOB_DETECTED", job: job1 });
      await handle.simulateMessage({ type: "JOB_DETECTED", job: job2 });

      const data = handle.getStorageData();
      const timers = data["jobTimers"] as JobTimerState;
      expect(timers.activeJobs).toHaveLength(2);
    });
  });

  describe("JOB_COMPLETED", () => {
    it("should remove the job from activeJobs and add to completedJobIds", async () => {
      const job = buildIdleJob({ id: "comp-1" });
      handle.setStorageData({
        jobTimers: { activeJobs: [job], completedJobIds: [] },
      });

      const response = await handle.simulateMessage({
        type: "JOB_COMPLETED",
        jobId: "comp-1",
      });

      expect(response).toEqual({ success: true });
      const data = handle.getStorageData();
      const timers = data["jobTimers"] as JobTimerState;
      expect(timers.activeJobs).toHaveLength(0);
      expect(timers.completedJobIds).toContain("comp-1");
    });

    it("should cap completedJobIds at 500", async () => {
      const existingIds = Array.from({ length: 500 }, (_, i) => `old-${String(i)}`);
      handle.setStorageData({
        jobTimers: { activeJobs: [], completedJobIds: existingIds },
      });

      await handle.simulateMessage({
        type: "JOB_COMPLETED",
        jobId: "new-job",
      });

      const data = handle.getStorageData();
      const timers = data["jobTimers"] as JobTimerState;
      expect(timers.completedJobIds).toHaveLength(500);
      expect(timers.completedJobIds[timers.completedJobIds.length - 1]).toBe(
        "new-job",
      );
    });
  });

  describe("PRICE_SNAPSHOT", () => {
    it("should create a new price history for a new item", async () => {
      const snapshot = buildPriceSnapshot({ itemId: "gold-bar", price: 500 });
      const response = await handle.simulateMessage({
        type: "PRICE_SNAPSHOT",
        snapshot,
      });

      expect(response).toEqual({ success: true });
      const data = handle.getStorageData();
      const histories = data["priceHistories"] as readonly PriceHistory[];
      expect(histories).toHaveLength(1);
      expect(histories[0]?.itemId).toBe("gold-bar");
      expect(histories[0]?.currentPrice).toBe(500);
    });

    it("should append to existing price history", async () => {
      const first = buildPriceSnapshot({ itemId: "iron", price: 100 });
      await handle.simulateMessage({ type: "PRICE_SNAPSHOT", snapshot: first });

      const second = buildPriceSnapshot({ itemId: "iron", price: 120 });
      await handle.simulateMessage({ type: "PRICE_SNAPSHOT", snapshot: second });

      const data = handle.getStorageData();
      const histories = data["priceHistories"] as readonly PriceHistory[];
      expect(histories).toHaveLength(1);
      expect(histories[0]?.snapshots).toHaveLength(2);
      expect(histories[0]?.currentPrice).toBe(120);
    });

    it("should update min/max prices", async () => {
      const s1 = buildPriceSnapshot({ itemId: "ore", price: 200 });
      const s2 = buildPriceSnapshot({ itemId: "ore", price: 50 });
      const s3 = buildPriceSnapshot({ itemId: "ore", price: 300 });

      await handle.simulateMessage({ type: "PRICE_SNAPSHOT", snapshot: s1 });
      await handle.simulateMessage({ type: "PRICE_SNAPSHOT", snapshot: s2 });
      await handle.simulateMessage({ type: "PRICE_SNAPSHOT", snapshot: s3 });

      const data = handle.getStorageData();
      const histories = data["priceHistories"] as readonly PriceHistory[];
      expect(histories[0]?.minPrice).toBe(50);
      expect(histories[0]?.maxPrice).toBe(300);
    });

    it("should cap snapshots at 100 per item", async () => {
      for (let i = 0; i < 105; i++) {
        const snapshot = buildPriceSnapshot({ itemId: "capped", price: i });
        await handle.simulateMessage({
          type: "PRICE_SNAPSHOT",
          snapshot,
        });
      }

      const data = handle.getStorageData();
      const histories = data["priceHistories"] as readonly PriceHistory[];
      expect(histories[0]?.snapshots).toHaveLength(100);
    });
  });

  describe("XP_GAINED", () => {
    it("should create a session if none exists and track XP", async () => {
      const event = buildSessionEvent({
        type: "xp_gained",
        data: { skill: "Mineria", xp: 250, levels: 0 },
      });
      const response = await handle.simulateMessage({
        type: "XP_GAINED",
        event,
      });

      expect(response).toEqual({ success: true });
      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.totalXpGained).toBe(250);
    });

    it("should accumulate XP for the same skill", async () => {
      const e1 = buildSessionEvent({
        type: "xp_gained",
        data: { skill: "Pesca", xp: 100, levels: 0 },
      });
      const e2 = buildSessionEvent({
        type: "xp_gained",
        data: { skill: "Pesca", xp: 200, levels: 1 },
      });
      await handle.simulateMessage({ type: "XP_GAINED", event: e1 });
      await handle.simulateMessage({ type: "XP_GAINED", event: e2 });

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.totalXpGained).toBe(300);
      expect(session.skillGains).toHaveLength(1);
      expect(session.skillGains[0]?.xpGained).toBe(300);
      expect(session.skillGains[0]?.levelsGained).toBe(1);
    });
  });

  describe("ITEM_COLLECTED", () => {
    it("should increment itemsCollected", async () => {
      const event = buildSessionEvent({
        type: "item_collected",
        data: { itemName: "Iron Ore" },
      });
      await handle.simulateMessage({ type: "ITEM_COLLECTED", event });
      await handle.simulateMessage({ type: "ITEM_COLLECTED", event });

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.itemsCollected).toBe(2);
    });
  });

  describe("SESSION_EVENT", () => {
    it("should track item_sold events with pesetas earned", async () => {
      const event = buildSessionEvent({
        type: "item_sold",
        data: { amount: 500 },
      });
      await handle.simulateMessage({ type: "SESSION_EVENT", event });

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.pesetasEarned).toBe(500);
    });

    it("should track combat_kill events", async () => {
      const event = buildSessionEvent({
        type: "combat_kill",
        data: { result: "win" },
      });
      await handle.simulateMessage({ type: "SESSION_EVENT", event });

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.combatKills).toBe(1);
    });

    it("should track combat_death events", async () => {
      const event = buildSessionEvent({
        type: "combat_death",
        data: { result: "loss" },
      });
      await handle.simulateMessage({ type: "SESSION_EVENT", event });

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.combatDeaths).toBe(1);
    });

    it("should track job_completed events", async () => {
      const event = buildSessionEvent({
        type: "job_completed",
        data: {},
      });
      await handle.simulateMessage({ type: "SESSION_EVENT", event });

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.jobsCompleted).toBe(1);
    });

    it("should cap events at 1000", async () => {
      for (let i = 0; i < 1005; i++) {
        const event = buildSessionEvent({
          type: "item_collected",
          data: { itemName: `Item ${String(i)}` },
        });
        await handle.simulateMessage({ type: "SESSION_EVENT", event });
      }

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.events).toHaveLength(1000);
    });
  });

  describe("CONTENT_SCRIPT_READY", () => {
    it("should start a new session", async () => {
      const response = await handle.simulateMessage({
        type: "CONTENT_SCRIPT_READY",
      });

      expect(response).toEqual({ success: true });
      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session).toBeDefined();
      expect(session.totalXpGained).toBe(0);
      expect(session.events).toHaveLength(0);
    });
  });

  describe("GET_TIMERS", () => {
    it("should return job timer state from storage", async () => {
      const job = buildIdleJob({ id: "t-1" });
      handle.setStorageData({
        jobTimers: { activeJobs: [job], completedJobIds: ["old-1"] },
      });

      const response = (await handle.simulateMessage({
        type: "GET_TIMERS",
      })) as JobTimerState;

      expect(response.activeJobs).toHaveLength(1);
      expect(response.completedJobIds).toContain("old-1");
    });

    it("should return empty state when storage has no timers", async () => {
      const response = (await handle.simulateMessage({
        type: "GET_TIMERS",
      })) as JobTimerState;

      expect(response.activeJobs).toHaveLength(0);
      expect(response.completedJobIds).toHaveLength(0);
    });
  });

  describe("GET_PRICES", () => {
    it("should return all price histories", async () => {
      const snapshot = buildPriceSnapshot({ itemId: "ore" });
      await handle.simulateMessage({
        type: "PRICE_SNAPSHOT",
        snapshot,
      });

      const response = (await handle.simulateMessage({
        type: "GET_PRICES",
      })) as readonly PriceHistory[];

      expect(response).toHaveLength(1);
    });

    it("should filter by itemId when provided", async () => {
      await handle.simulateMessage({
        type: "PRICE_SNAPSHOT",
        snapshot: buildPriceSnapshot({ itemId: "a" }),
      });
      await handle.simulateMessage({
        type: "PRICE_SNAPSHOT",
        snapshot: buildPriceSnapshot({ itemId: "b" }),
      });

      const response = (await handle.simulateMessage({
        type: "GET_PRICES",
        itemId: "a",
      })) as readonly PriceHistory[];

      expect(response).toHaveLength(1);
      expect(response[0]?.itemId).toBe("a");
    });
  });

  describe("GET_SESSION_STATS", () => {
    it("should return null when no session exists", async () => {
      const response = await handle.simulateMessage({
        type: "GET_SESSION_STATS",
      });

      expect(response).toBeNull();
    });

    it("should return session stats after session start", async () => {
      await handle.simulateMessage({ type: "CONTENT_SCRIPT_READY" });
      const response = (await handle.simulateMessage({
        type: "GET_SESSION_STATS",
      })) as SessionStats;

      expect(response).toBeDefined();
      expect(response.totalXpGained).toBe(0);
    });
  });

  describe("SEARCH_HISCORES", () => {
    it("should return empty entries on fetch failure", async () => {
      // No global fetch mock — searchHiscores will fail with network error
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (() =>
        Promise.reject(new Error("Network error"))) as unknown as typeof fetch;

      try {
        const response = (await handle.simulateMessage({
          type: "SEARCH_HISCORES",
          playerName: "TestPlayer",
          category: "total",
        })) as { entries: readonly unknown[] };

        expect(response.entries).toHaveLength(0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
