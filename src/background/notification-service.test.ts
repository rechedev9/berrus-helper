import { describe, it, expect, mock } from "bun:test";
import {
  notifyJobComplete,
  type ChromeNotificationsPort,
} from "./notification-service.ts";
import { buildIdleJob } from "../test-utils/fixtures.ts";

describe("notification-service", () => {
  describe("notifyJobComplete", () => {
    it("should call port.create with correct notification options", () => {
      const createFn = mock(() => undefined);
      const port: ChromeNotificationsPort = { create: createFn };
      const job = buildIdleJob({ id: "n-1", name: "Mining Iron", skill: "Mineria" });

      const result = notifyJobComplete(job, port);

      expect(result.ok).toBe(true);
      expect(createFn).toHaveBeenCalledTimes(1);
      const [id, options] = createFn.mock.calls[0] as unknown as [
        string,
        chrome.notifications.NotificationOptions,
      ];
      expect(id).toBe("job-complete-n-1");
      expect(options.title).toBe("Job Complete!");
      expect(options.message).toContain("Mining Iron");
      expect(options.message).toContain("Mineria");
      expect(options.type).toBe("basic");
      expect(options.priority).toBe(2);
    });

    it("should return an error when port.create throws", () => {
      const port: ChromeNotificationsPort = {
        create: () => {
          throw new Error("Notification API unavailable");
        },
      };
      const job = buildIdleJob({ id: "n-2" });

      const result = notifyJobComplete(job, port);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Notification API unavailable");
      }
    });

    it("should include the job skill in the notification message", () => {
      const createFn = mock(() => undefined);
      const port: ChromeNotificationsPort = { create: createFn };
      const job = buildIdleJob({ skill: "Pesca", name: "Fishing Trout" });

      notifyJobComplete(job, port);

      const [, options] = createFn.mock.calls[0] as unknown as [
        string,
        chrome.notifications.NotificationOptions,
      ];
      expect(options.message).toContain("Pesca");
      expect(options.message).toContain("Fishing Trout");
    });
  });
});
