import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  installMockChrome,
  type ChromeMockHandle,
} from "../test-utils/chrome-mock.ts";
import { buildSessionEvent } from "../test-utils/fixtures.ts";
import {
  startSession,
  addSessionEvent,
  getSessionStats,
} from "./session-manager.ts";
import type { SessionStats } from "../types/session.ts";

let handle: ChromeMockHandle;

beforeEach(() => {
  handle = installMockChrome();
});

afterEach(() => {
  handle.reset();
});

describe("session-manager", () => {
  describe("startSession", () => {
    it("should create a new empty session", async () => {
      const result = await startSession();

      expect(result.ok).toBe(true);
      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.totalXpGained).toBe(0);
      expect(session.events).toHaveLength(0);
      expect(session.itemsCollected).toBe(0);
    });

    it("should overwrite an existing session", async () => {
      await startSession();
      const event = buildSessionEvent({
        type: "item_collected",
        data: { itemName: "Ore" },
      });
      await addSessionEvent(event);

      await startSession();

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.itemsCollected).toBe(0);
      expect(session.events).toHaveLength(0);
    });
  });

  describe("addSessionEvent", () => {
    it("should create a session if none exists", async () => {
      const event = buildSessionEvent({
        type: "xp_gained",
        data: { skill: "Mineria", xp: 50, levels: 0 },
      });
      const result = await addSessionEvent(event);

      expect(result.ok).toBe(true);
      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.totalXpGained).toBe(50);
    });

    it("should track xp_gained with skill gains", async () => {
      await startSession();
      const event = buildSessionEvent({
        type: "xp_gained",
        data: { skill: "Herreria", xp: 200, levels: 1 },
      });
      await addSessionEvent(event);

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.totalXpGained).toBe(200);
      expect(session.skillGains).toHaveLength(1);
      expect(session.skillGains[0]?.skill).toBe("Herreria");
      expect(session.skillGains[0]?.xpGained).toBe(200);
      expect(session.skillGains[0]?.levelsGained).toBe(1);
    });

    it("should accumulate XP for the same skill", async () => {
      await startSession();
      const e1 = buildSessionEvent({
        type: "xp_gained",
        data: { skill: "Cocina", xp: 100, levels: 0 },
      });
      const e2 = buildSessionEvent({
        type: "xp_gained",
        data: { skill: "Cocina", xp: 150, levels: 1 },
      });
      await addSessionEvent(e1);
      await addSessionEvent(e2);

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.skillGains).toHaveLength(1);
      expect(session.skillGains[0]?.xpGained).toBe(250);
      expect(session.skillGains[0]?.levelsGained).toBe(1);
    });

    it("should track different skills separately", async () => {
      await startSession();
      await addSessionEvent(
        buildSessionEvent({
          type: "xp_gained",
          data: { skill: "Mineria", xp: 100, levels: 0 },
        }),
      );
      await addSessionEvent(
        buildSessionEvent({
          type: "xp_gained",
          data: { skill: "Pesca", xp: 50, levels: 0 },
        }),
      );

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.skillGains).toHaveLength(2);
      expect(session.totalXpGained).toBe(150);
    });

    it("should increment itemsCollected for item_collected events", async () => {
      await startSession();
      await addSessionEvent(
        buildSessionEvent({
          type: "item_collected",
          data: { itemName: "Iron Ore" },
        }),
      );
      await addSessionEvent(
        buildSessionEvent({
          type: "item_collected",
          data: { itemName: "Gold Ore" },
        }),
      );

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.itemsCollected).toBe(2);
    });

    it("should track pesetasEarned for item_sold events", async () => {
      await startSession();
      await addSessionEvent(
        buildSessionEvent({
          type: "item_sold",
          data: { amount: 300 },
        }),
      );

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.pesetasEarned).toBe(300);
    });

    it("should track pesetasSpent for item_bought events", async () => {
      await startSession();
      await addSessionEvent(
        buildSessionEvent({
          type: "item_bought",
          data: { amount: 100 },
        }),
      );

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.pesetasSpent).toBe(100);
    });

    it("should track combatKills for combat_kill events", async () => {
      await startSession();
      await addSessionEvent(
        buildSessionEvent({ type: "combat_kill", data: {} }),
      );
      await addSessionEvent(
        buildSessionEvent({ type: "combat_kill", data: {} }),
      );

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.combatKills).toBe(2);
    });

    it("should track combatDeaths for combat_death events", async () => {
      await startSession();
      await addSessionEvent(
        buildSessionEvent({ type: "combat_death", data: {} }),
      );

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.combatDeaths).toBe(1);
    });

    it("should track jobsCompleted for job_completed events", async () => {
      await startSession();
      await addSessionEvent(
        buildSessionEvent({ type: "job_completed", data: {} }),
      );

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.jobsCompleted).toBe(1);
    });

    it("should cap events at 1000", async () => {
      await startSession();

      for (let i = 0; i < 1005; i++) {
        await addSessionEvent(
          buildSessionEvent({
            type: "item_collected",
            data: { itemName: `Item ${String(i)}` },
          }),
        );
      }

      const data = handle.getStorageData();
      const session = data["currentSession"] as SessionStats;
      expect(session.events).toHaveLength(1000);
      expect(session.itemsCollected).toBe(1005);
    });
  });

  describe("getSessionStats", () => {
    it("should return null when no session exists", async () => {
      const result = await getSessionStats();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it("should return session stats after start", async () => {
      await startSession();
      const result = await getSessionStats();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toBeNull();
        expect(result.value?.totalXpGained).toBe(0);
      }
    });
  });
});
