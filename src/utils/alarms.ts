import type { IdleJob } from "../types/jobs.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { createLogger } from "./logger.ts";

const logger = createLogger("alarms");

const ALARM_PREFIX = "job-timer-";
const MS_PER_MINUTE = 60_000;

export interface ChromeAlarmsPort {
  readonly create: (name: string, info: chrome.alarms.AlarmCreateInfo) => Promise<void>;
  readonly clear: (name: string) => Promise<boolean>;
  readonly get: (name: string) => Promise<chrome.alarms.Alarm | undefined>;
  readonly getAll: () => Promise<chrome.alarms.Alarm[]>;
}

function defaultPort(): ChromeAlarmsPort {
  return {
    create: (name, info): Promise<void> => chrome.alarms.create(name, info),
    clear: (name): Promise<boolean> => chrome.alarms.clear(name),
    get: (name): Promise<chrome.alarms.Alarm | undefined> =>
      chrome.alarms.get(name),
    getAll: (): Promise<chrome.alarms.Alarm[]> => chrome.alarms.getAll(),
  };
}

export function alarmNameForJob(jobId: string): string {
  return `${ALARM_PREFIX}${jobId}`;
}

export function jobIdFromAlarmName(alarmName: string): string | undefined {
  if (!alarmName.startsWith(ALARM_PREFIX)) {
    return undefined;
  }
  return alarmName.slice(ALARM_PREFIX.length);
}

export async function createJobAlarm(
  job: IdleJob,
  port: ChromeAlarmsPort = defaultPort(),
): Promise<Result<void, string>> {
  try {
    const delayMs = job.endsAt - Date.now();
    const delayMinutes = Math.max(delayMs / MS_PER_MINUTE, 0.1);

    await port.create(alarmNameForJob(job.id), {
      delayInMinutes: delayMinutes,
    });

    logger.info("Created alarm for job", { jobId: job.id, delayMinutes });
    return ok(undefined);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("Failed to create alarm", { jobId: job.id, error: message });
    return err(`Alarm creation failed: ${message}`);
  }
}

export async function cancelJobAlarm(
  jobId: string,
  port: ChromeAlarmsPort = defaultPort(),
): Promise<Result<void, string>> {
  try {
    await port.clear(alarmNameForJob(jobId));
    logger.info("Cancelled alarm for job", { jobId });
    return ok(undefined);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("Failed to cancel alarm", { jobId, error: message });
    return err(`Alarm cancellation failed: ${message}`);
  }
}
