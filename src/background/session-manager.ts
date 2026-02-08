import type {
  SessionStats,
  SessionEvent,
  SkillGain,
} from "../types/session.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";
import { getStorage, setStorage, updateStorage } from "../utils/storage.ts";
import { isSkillName } from "../utils/type-guards.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("session-manager");

const MAX_SESSION_EVENTS = 1000;

function createEmptySession(): SessionStats {
  const now = Date.now();
  return {
    startedAt: now,
    lastActivityAt: now,
    durationMs: 0,
    skillGains: [],
    totalXpGained: 0,
    itemsCollected: 0,
    pesetasEarned: 0,
    pesetasSpent: 0,
    combatKills: 0,
    combatDeaths: 0,
    jobsCompleted: 0,
    events: [],
  };
}

function numericField(event: SessionEvent, field: string): number {
  const value = event.data[field];
  return typeof value === "number" ? value : 0;
}

function countIf(event: SessionEvent, type: SessionEvent["type"]): number {
  return event.type === type ? 1 : 0;
}

function updateSkillGains(
  existing: readonly SkillGain[],
  event: SessionEvent,
): readonly SkillGain[] {
  if (event.type !== "xp_gained") return existing;

  const skill = event.data["skill"];
  const xp = event.data["xp"];

  if (!isSkillName(skill) || typeof xp !== "number") return existing;

  const levelDelta = numericField(event, "levels");
  const gains = [...existing];
  const idx = gains.findIndex((g) => g.skill === skill);
  const current = idx >= 0 ? gains[idx] : undefined;

  if (current) {
    gains[idx] = {
      skill: current.skill,
      xpGained: current.xpGained + xp,
      levelsGained: current.levelsGained + levelDelta,
    };
  } else {
    gains.push({ skill, xpGained: xp, levelsGained: levelDelta });
  }

  return gains;
}

export async function startSession(): Promise<Result<SessionStats, string>> {
  const session = createEmptySession();
  await setStorage({ currentSession: session });
  logger.info("Session started");
  return ok(session);
}

export async function addSessionEvent(
  event: SessionEvent,
): Promise<Result<void, string>> {
  const result = await updateStorage("currentSession", (current) => {
    const session = current ?? createEmptySession();
    const now = Date.now();

    return {
      ...session,
      lastActivityAt: now,
      durationMs: now - session.startedAt,
      skillGains: updateSkillGains(session.skillGains, event),
      totalXpGained:
        session.totalXpGained +
        (event.type === "xp_gained" ? numericField(event, "xp") : 0),
      itemsCollected:
        session.itemsCollected + countIf(event, "item_collected"),
      pesetasEarned:
        session.pesetasEarned +
        (event.type === "item_sold" ? numericField(event, "amount") : 0),
      pesetasSpent:
        session.pesetasSpent +
        (event.type === "item_bought" ? numericField(event, "amount") : 0),
      combatKills: session.combatKills + countIf(event, "combat_kill"),
      combatDeaths: session.combatDeaths + countIf(event, "combat_death"),
      jobsCompleted: session.jobsCompleted + countIf(event, "job_completed"),
      events: [...session.events, event].slice(-MAX_SESSION_EVENTS),
    };
  });

  if (!result.ok) return result;
  return ok(undefined);
}

export async function getSessionStats(): Promise<
  Result<SessionStats | null, string>
> {
  const result = await getStorage(["currentSession"]);
  if (!result.ok) return result;
  return ok(result.value.currentSession ?? null);
}
