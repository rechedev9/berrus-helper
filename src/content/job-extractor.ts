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

  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (h !== undefined && m !== undefined && s !== undefined && !isNaN(h) && !isNaN(m) && !isNaN(s)) {
      return (h * 3600 + m * 60 + s) * 1000;
    }
  }

  if (parts.length === 2) {
    const [m, s] = parts;
    if (m !== undefined && s !== undefined && !isNaN(m) && !isNaN(s)) {
      return (m * 60 + s) * 1000;
    }
  }

  return undefined;
}

function extractJobFromElement(el: Element): IdleJob | undefined {
  const nameEl = el.querySelector(JOB_NAME_SELECTOR);
  const skillEl = el.querySelector(JOB_SKILL_SELECTOR);
  const timerEl = el.querySelector(JOB_TIMER_SELECTOR);

  const name = nameEl?.textContent?.trim();
  const skillText = skillEl?.textContent?.trim() ?? el.getAttribute("data-skill");
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
  const jobElements = queryAll<Element>(JOB_ITEM_SELECTOR);

  if (jobElements.length === 0) {
    return ok([]);
  }

  const jobs: IdleJob[] = [];
  for (const el of jobElements) {
    const job = extractJobFromElement(el);
    if (job) {
      jobs.push(job);
    }
  }

  logger.info("Extracted jobs", { count: jobs.length });
  return ok(jobs);
}
