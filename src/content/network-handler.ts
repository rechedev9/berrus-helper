import type { InterceptedResponse } from "../utils/network-interceptor.ts";
import type { SessionEvent } from "../types/session.ts";
import type { IdleJob } from "../types/jobs.ts";
import { sendMessage } from "../utils/messages.ts";
import { createLogger } from "../utils/logger.ts";
import { isRecord } from "../utils/type-guards.ts";
import { apiSkillToSkillName } from "../utils/skill-mapping.ts";

const logger = createLogger("network-handler");

const API_PATTERNS = {
  character: /\/api\/protected\/character\/(?!all\b)[^/]+(\?.*)?$/,
  rewards: /\/api\/protected\/character\/.*\/protected\/rewards/,
  jobs: /\/api\/protected\/character\/.*\/protected\/jobs/,
} as const;

let previousSkillsXp: Readonly<Record<string, number>> = {};
let previousCombatState: string | undefined;

function tryParseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function handleCharacterResponse(data: unknown): void {
  if (!isRecord(data)) return;

  handleCharacterJobs(data);
  handleCharacterSkillsXp(data);
  handleCharacterCombat(data);
}

function handleCharacterJobs(data: Record<string, unknown>): void {
  const jobs = data["jobs"];
  if (!Array.isArray(jobs)) return;

  for (const job of jobs) {
    if (!isRecord(job)) continue;
    if (job["status"] !== "active") continue;

    const jobId = job["jobId"];
    if (typeof jobId !== "string") continue;

    const skill = typeof job["skill"] === "string"
      ? apiSkillToSkillName(job["skill"])
      : undefined;

    const startedAt = typeof job["startedAt"] === "number"
      ? job["startedAt"]
      : Date.now();
    const durationMs = typeof job["durationMs"] === "number"
      ? job["durationMs"]
      : 0;

    const idleJob: IdleJob = {
      id: jobId,
      skill: skill ?? "Mineria",
      name: jobId,
      startedAt,
      durationMs,
      endsAt: startedAt + durationMs,
    };

    logger.info(`Job detected: ${jobId} (skill: ${skill ?? "unknown"})`);
    sendMessage({ type: "JOB_DETECTED", job: idleJob }).catch((e: unknown) => {
      logger.error("Failed to send job event", e);
    });
  }
}

function handleCharacterSkillsXp(data: Record<string, unknown>): void {
  const skillsXp = data["skillsXp"];
  if (!isRecord(skillsXp)) return;

  for (const [apiSkill, currentXp] of Object.entries(skillsXp)) {
    if (typeof currentXp !== "number") continue;

    const previousXp = previousSkillsXp[apiSkill];
    if (previousXp === undefined || currentXp <= previousXp) continue;

    const skill = apiSkillToSkillName(apiSkill);
    if (!skill) continue;

    const delta = currentXp - previousXp;
    const event: SessionEvent = {
      type: "xp_gained",
      timestamp: Date.now(),
      data: { skill, xp: delta },
    };

    logger.info(`XP gained: ${skill} +${delta}`);
    sendMessage({ type: "XP_GAINED", event }).catch((e: unknown) => {
      logger.error("Failed to send XP event", e);
    });
  }

  previousSkillsXp = Object.fromEntries(
    Object.entries(skillsXp).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}

function handleCharacterCombat(data: Record<string, unknown>): void {
  const activeCombat = data["activeCombat"];
  if (!isRecord(activeCombat)) {
    previousCombatState = undefined;
    return;
  }

  const result = activeCombat["result"];
  if (typeof result !== "string") return;

  if (result === previousCombatState) return;
  previousCombatState = result;

  const eventType = result === "win" || result === "victory"
    ? "combat_kill"
    : "combat_death";

  const event: SessionEvent = {
    type: eventType,
    timestamp: Date.now(),
    data: { result },
  };

  logger.info(`Combat event: ${eventType}`);
  sendMessage({ type: "SESSION_EVENT", event }).catch((e: unknown) => {
    logger.error("Failed to send combat event", e);
  });
}

function handleRewardsResponse(data: unknown): void {
  if (!Array.isArray(data)) return;

  for (const reward of data) {
    if (!isRecord(reward)) continue;

    const itemName = reward["name"] ?? reward["itemName"];
    if (typeof itemName !== "string") continue;

    const event: SessionEvent = {
      type: "item_collected",
      timestamp: Date.now(),
      data: { itemName },
    };

    logger.info(`Reward collected: ${itemName}`);
    sendMessage({ type: "ITEM_COLLECTED", event }).catch((e: unknown) => {
      logger.error("Failed to send item event", e);
    });
  }
}

export function handleInterceptedResponse(response: InterceptedResponse): void {
  logger.debug(`Intercepted response: ${response.url} (status ${response.status})`);

  if (response.status < 200 || response.status >= 300) return;

  const data = tryParseJson(response.body);
  if (data === undefined) return;

  const { url } = response;

  if (API_PATTERNS.character.test(url)) {
    logger.debug("Matched pattern: character");
    handleCharacterResponse(data);
  } else if (API_PATTERNS.rewards.test(url)) {
    logger.debug("Matched pattern: rewards");
    handleRewardsResponse(data);
  } else if (API_PATTERNS.jobs.test(url)) {
    logger.debug("Matched pattern: jobs");
    handleCharacterJobs(isRecord(data) ? data : {});
  }
}

/** Reset internal state — for testing only. */
export function resetNetworkHandlerState(): void {
  previousSkillsXp = {};
  previousCombatState = undefined;
}
