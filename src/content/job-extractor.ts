import type { IdleJob } from "../types/jobs.ts";
import type { SkillName } from "../types/skills.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";
import { findElementsByText, findAncestor } from "../utils/dom-walker.ts";
import { apiSkillToSkillName } from "../utils/skill-mapping.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("job-extractor");

const TIMER_PATTERN = /(\d+:)?\d+:\d{2}(?:\s*remaining)?/;
const PROGRESS_PATTERN = /^\d{1,3}%$/;
const CANCEL_BUTTON_TEXT = /^cancel$/i;
const SKILL_LINK_HREF = /\/character\/skills\/([a-z]+)/i;

const DEFAULT_SKILL = "Mineria" as const;

let jobCounter = 0;

function generateJobId(): string {
  jobCounter += 1;
  return `job-${Date.now()}-${String(jobCounter)}`;
}

export function parseTimerText(text: string): number | undefined {
  const cleaned = text.replace(/\s*remaining\s*/i, "").trim();
  const parts = cleaned.split(":").map(Number);
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

function isSkipText(text: string): boolean {
  return (
    TIMER_PATTERN.test(text) ||
    PROGRESS_PATTERN.test(text) ||
    CANCEL_BUTTON_TEXT.test(text) ||
    text.length === 0
  );
}

/**
 * A valid job container has multiple distinct text children:
 * at minimum a name and a timer.
 */
function isJobContainer(el: Element): boolean {
  const children = el.children;
  if (children.length < 2) return false;

  let hasTimer = false;
  let hasNonTimer = false;

  for (const child of children) {
    const text = child.textContent?.trim() ?? "";
    if (TIMER_PATTERN.test(text)) {
      hasTimer = true;
    } else if (!isSkipText(text) && text.length > 0) {
      hasNonTimer = true;
    }
  }

  return hasTimer && hasNonTimer;
}

function extractJobName(container: Element): string | undefined {
  for (const child of container.children) {
    const text = child.textContent?.trim() ?? "";
    if (text.length > 0 && !isSkipText(text)) {
      return text;
    }
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent?.trim() ?? "";
    if (text.length > 0 && !isSkipText(text)) {
      return text;
    }
    node = walker.nextNode();
  }

  return undefined;
}

function extractTimerText(container: Element): string | undefined {
  for (const child of container.children) {
    const text = child.textContent?.trim() ?? "";
    if (TIMER_PATTERN.test(text)) {
      return text;
    }
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent?.trim() ?? "";
    if (TIMER_PATTERN.test(text)) {
      return text;
    }
    node = walker.nextNode();
  }

  return undefined;
}

function extractSkill(container: Element): SkillName {
  const link = container.querySelector('a[href*="/character/skills/"]');
  if (link) {
    const href = link.getAttribute("href") ?? "";
    const match = SKILL_LINK_HREF.exec(href);
    if (match?.[1]) {
      const mapped = apiSkillToSkillName(match[1]);
      if (mapped) return mapped;
    }
  }
  return DEFAULT_SKILL;
}

function extractJobFromContainer(container: Element): IdleJob | undefined {
  const name = extractJobName(container);
  if (!name) return undefined;

  const timerText = extractTimerText(container);
  if (!timerText) return undefined;

  const durationMs = parseTimerText(timerText);
  if (durationMs === undefined) return undefined;

  const skill = extractSkill(container);
  const now = Date.now();

  return {
    id: generateJobId(),
    skill,
    name,
    startedAt: now,
    durationMs,
    endsAt: now + durationMs,
  };
}

export function extractActiveJobs(): Result<readonly IdleJob[], string> {
  logger.debug("Attempting job extraction via content-based scanning");

  const timerElements = findElementsByText(TIMER_PATTERN);
  logger.debug("Timer elements found", { count: timerElements.length });

  if (timerElements.length === 0) {
    return ok([]);
  }

  const seenContainers = new Set<Element>();
  const jobs: IdleJob[] = [];

  for (const timerEl of timerElements) {
    const container = findAncestor(timerEl, isJobContainer);
    if (!container || seenContainers.has(container)) continue;
    seenContainers.add(container);

    const job = extractJobFromContainer(container);
    if (job) {
      jobs.push(job);
    }
  }

  if (jobs.length > 0) {
    logger.debug("Successfully extracted jobs", {
      count: jobs.length,
      jobs: jobs.map((j) => ({ id: j.id, skill: j.skill, name: j.name })),
    });
  } else {
    logger.debug("Timer elements found but no jobs could be extracted", {
      timerCount: timerElements.length,
    });
  }

  return ok(jobs);
}
