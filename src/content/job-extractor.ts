import type { IdleJob } from "../types/jobs.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";
import { queryAll } from "../utils/dom.ts";
import { isSkillName } from "../utils/type-guards.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("job-extractor");

// Placeholder selectors — must be refined by inspecting berrus.app DOM
const JOB_ITEM_SELECTOR = '[data-testid="idle-job"], .idle-job, .job-item';
const JOB_NAME_SELECTOR = ".job-name, .job-title, [data-job-name]";
const JOB_SKILL_SELECTOR = ".job-skill, [data-skill]";
const JOB_TIMER_SELECTOR = ".job-timer, .countdown, [data-ends-at]";

let jobCounter = 0;

function generateJobId(): string {
  jobCounter += 1;
  return `job-${Date.now()}-${String(jobCounter)}`;
}

function parseTimerText(text: string): number | undefined {
  // Try parsing "HH:MM:SS" or "MM:SS" format
  const parts = text.trim().split(":").map(Number);
  const allValid = parts.every((n) => !isNaN(n));
  if (!allValid) return undefined;

  if (parts.length === 3) {
    const [h = 0, m = 0, s = 0] = parts;
    return (h * 3600 + m * 60 + s) * 1000;
  }

  if (parts.length === 2) {
    const [m = 0, s = 0] = parts;
    return (m * 60 + s) * 1000;
  }

  return undefined;
}

function extractJobFromElement(el: Element): IdleJob | undefined {
  const nameEl = el.querySelector(JOB_NAME_SELECTOR);
  const skillEl = el.querySelector(JOB_SKILL_SELECTOR);
  const timerEl = el.querySelector(JOB_TIMER_SELECTOR);

  const name = nameEl?.textContent?.trim();
  const skillText =
    skillEl?.textContent?.trim() ?? el.getAttribute("data-skill");
  const timerText = timerEl?.textContent?.trim();
  const endsAtAttr = timerEl?.getAttribute("data-ends-at");

  if (!name) return undefined;

  const skill = skillText && isSkillName(skillText) ? skillText : undefined;
  if (!skill) {
    logger.warn("Could not determine skill for job", { name, skillText });
    return undefined;
  }

  const now = Date.now();
  let endsAt: number;
  let durationMs: number;

  if (endsAtAttr) {
    endsAt = parseInt(endsAtAttr, 10);
    durationMs = endsAt - now;
  } else if (timerText) {
    const remaining = parseTimerText(timerText);
    if (!remaining) return undefined;
    durationMs = remaining;
    endsAt = now + remaining;
  } else {
    return undefined;
  }

  return {
    id: el.getAttribute("data-job-id") ?? generateJobId(),
    skill,
    name,
    startedAt: now,
    durationMs,
    endsAt,
  };
}

export function extractActiveJobs(): Result<readonly IdleJob[], string> {
  logger.info("Attempting job extraction", { selector: JOB_ITEM_SELECTOR });

  const jobElements = queryAll<Element>(JOB_ITEM_SELECTOR);
  logger.info("Job elements found", { count: jobElements.length });

  if (jobElements.length === 0) {
    logger.warn("No job elements matched selector", {
      selector: JOB_ITEM_SELECTOR,
      hint: "DOM may not contain expected structure or selectors need updating",
    });
  }

  const jobs = jobElements
    .map(extractJobFromElement)
    .filter((job): job is IdleJob => job !== undefined);

  const failedCount = jobElements.length - jobs.length;
  if (failedCount > 0) {
    logger.warn("Some job elements failed extraction", {
      total: jobElements.length,
      extracted: jobs.length,
      failed: failedCount,
    });
  }

  if (jobs.length > 0) {
    logger.info("Successfully extracted jobs", {
      count: jobs.length,
      jobs: jobs.map((j) => ({ id: j.id, skill: j.skill, name: j.name })),
    });
  }

  return ok(jobs);
}
