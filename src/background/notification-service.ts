import type { IdleJob } from "../types/jobs.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("notifications");

const NOTIFICATION_ICON_PATH = "icons/icon-128.png";

export interface ChromeNotificationsPort {
  readonly create: (
    id: string,
    options: chrome.notifications.NotificationOptions,
  ) => void;
}

function defaultPort(): ChromeNotificationsPort {
  return {
    create: (id, options): void => {
      chrome.notifications.create(id, options);
    },
  };
}

export function notifyJobComplete(
  job: IdleJob,
  port: ChromeNotificationsPort = defaultPort(),
): Result<void, string> {
  try {
    port.create(`job-complete-${job.id}`, {
      type: "basic",
      iconUrl: NOTIFICATION_ICON_PATH,
      title: "Job Complete!",
      message: `Your ${job.skill} job "${job.name}" has finished.`,
      priority: 2,
    });
    logger.info("Notification sent for job", { jobId: job.id });
    return ok(undefined);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("Failed to send notification", { jobId: job.id, error: message });
    return err(`Notification failed: ${message}`);
  }
}
