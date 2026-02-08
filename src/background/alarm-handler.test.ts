import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  installMockChrome,
  type ChromeMockHandle,
} from "../test-utils/chrome-mock.ts";
import { buildIdleJob } from "../test-utils/fixtures.ts";
import { handleAlarm } from "./alarm-handler.ts";
import type { JobTimerState } from "../types/jobs.ts";

let handle: ChromeMockHandle;

beforeEach(() => {
  handle = installMockChrome();
});

afterEach(() => {
  handle.reset();
});

describe("alarm-handler", () => {
  describe("handleAlarm", () => {
    it("should move job from active to completed and send notification", async () => {
      const job = buildIdleJob({ id: "a-1", name: "Mining Iron" });
      handle.setStorageData({
        jobTimers: { activeJobs: [job], completedJobIds: [] },
        settings: {
          notificationsEnabled: true,
          priceTrackingEnabled: true,
          sessionTrackingEnabled: true,
          hiscoreCacheMinutes: 5,
        },
      });

      await handleAlarm({
        name: "job-timer-a-1",
        scheduledTime: Date.now(),
      });

      const data = handle.getStorageData();
      const timers = data["jobTimers"] as JobTimerState;
      expect(timers.activeJobs).toHaveLength(0);
      expect(timers.completedJobIds).toContain("a-1");

      const notifications = handle.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.options.title).toBe("Job Complete!");
    });

    it("should skip notification when notifications are disabled", async () => {
      const job = buildIdleJob({ id: "a-2" });
      handle.setStorageData({
        jobTimers: { activeJobs: [job], completedJobIds: [] },
        settings: {
          notificationsEnabled: false,
          priceTrackingEnabled: true,
          sessionTrackingEnabled: true,
          hiscoreCacheMinutes: 5,
        },
      });

      await handleAlarm({
        name: "job-timer-a-2",
        scheduledTime: Date.now(),
      });

      const notifications = handle.getNotifications();
      expect(notifications).toHaveLength(0);
    });

    it("should ignore unknown alarm names", async () => {
      await handleAlarm({
        name: "unknown-alarm",
        scheduledTime: Date.now(),
      });

      // No crash, no storage changes
      expect(handle.getStorageData()).toEqual({});
    });

    it("should handle missing job gracefully", async () => {
      handle.setStorageData({
        jobTimers: { activeJobs: [], completedJobIds: [] },
      });

      await handleAlarm({
        name: "job-timer-nonexistent",
        scheduledTime: Date.now(),
      });

      const data = handle.getStorageData();
      const timers = data["jobTimers"] as JobTimerState;
      expect(timers.activeJobs).toHaveLength(0);
      expect(timers.completedJobIds).toHaveLength(0);
    });

    it("should cap completedJobIds at 500", async () => {
      const job = buildIdleJob({ id: "cap-job" });
      const existingIds = Array.from(
        { length: 500 },
        (_, i) => `old-${String(i)}`,
      );
      handle.setStorageData({
        jobTimers: { activeJobs: [job], completedJobIds: existingIds },
      });

      await handleAlarm({
        name: "job-timer-cap-job",
        scheduledTime: Date.now(),
      });

      const data = handle.getStorageData();
      const timers = data["jobTimers"] as JobTimerState;
      expect(timers.completedJobIds).toHaveLength(500);
      expect(
        timers.completedJobIds[timers.completedJobIds.length - 1],
      ).toBe("cap-job");
    });

    it("should still move job to completed even without settings in storage", async () => {
      const job = buildIdleJob({ id: "no-settings" });
      handle.setStorageData({
        jobTimers: { activeJobs: [job], completedJobIds: [] },
      });

      await handleAlarm({
        name: "job-timer-no-settings",
        scheduledTime: Date.now(),
      });

      const data = handle.getStorageData();
      const timers = data["jobTimers"] as JobTimerState;
      expect(timers.activeJobs).toHaveLength(0);
      expect(timers.completedJobIds).toContain("no-settings");
      // Notification should be sent (notificationsEnabled !== false)
      expect(handle.getNotifications()).toHaveLength(1);
    });
  });
});
