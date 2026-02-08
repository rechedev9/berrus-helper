import { jobIdFromAlarmName } from "../utils/alarms.ts";
import { getStorage, updateStorage } from "../utils/storage.ts";
import { notifyJobComplete } from "./notification-service.ts";
import { createLogger } from "../utils/logger.ts";
import type { JobTimerState } from "../types/jobs.ts";

const logger = createLogger("alarm-handler");

const MAX_COMPLETED_JOB_IDS = 500;

export async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  const jobId = jobIdFromAlarmName(alarm.name);
  if (!jobId) {
    logger.warn("Received alarm with unknown name", alarm.name);
    return;
  }

  logger.info("Job alarm fired", { jobId });

  const storageResult = await getStorage(["jobTimers", "settings"]);
  if (!storageResult.ok) {
    logger.error("Failed to read storage for alarm", storageResult.error);
    return;
  }

  const { jobTimers, settings } = storageResult.value;
  if (!jobTimers) return;

  const completedJob = jobTimers.activeJobs.find((j) => j.id === jobId);
  if (!completedJob) {
    logger.warn("Job not found in active jobs", { jobId });
    return;
  }

  if (settings?.notificationsEnabled !== false) {
    notifyJobComplete(completedJob);
  }

  await updateStorage(
    "jobTimers",
    (current: JobTimerState | undefined): JobTimerState => {
      const state = current ?? { activeJobs: [], completedJobIds: [] };
      return {
        activeJobs: state.activeJobs.filter((j) => j.id !== jobId),
        completedJobIds: [...state.completedJobIds, jobId].slice(
          -MAX_COMPLETED_JOB_IDS,
        ),
      };
    },
  );
}
