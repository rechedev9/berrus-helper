import type { SessionStats, SessionEvent, SkillGain } from "../types/session.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";
import { getStorage, setStorage } from "../utils/storage.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("session-manager");

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

function updateSkillGains(
  existing: readonly SkillGain[],
  event: SessionEvent,
): readonly SkillGain[] {
  if (event.type !== "xp_gained") return existing;

  const skill = event.data["skill"];
  const xp = event.data["xp"];
  const levels = event.data["levels"];

  if (typeof skill !== "string" || typeof xp !== "number") return existing;

  const gains = [...existing];
  const idx = gains.findIndex((g) => g.skill === skill);

  if (idx >= 0) {
    const current = gains[idx];
    if (!current) return existing;
    gains[idx] = {
      skill: current.skill,
      xpGained: current.xpGained + xp,
      levelsGained: current.levelsGained + (typeof levels === "number" ? levels : 0),
    };
  } else {
    gains.push({
      skill: skill as SkillGain["skill"],
      xpGained: xp,
      levelsGained: typeof levels === "number" ? levels : 0,
    });
  }

  return gains;
}

export async function startSession(): Promise<Result<SessionStats, string>> {
  const session = createEmptySession();
  await setStorage({ currentSession: session });
  logger.info("Session started");
  return ok(session);
}

export async function addSessionEvent(event: SessionEvent): Promise<Result<void, string>> {
  const result = await getStorage(["currentSession"]);
  if (!result.ok) return result;

  let session = result.value.currentSession;
  if (!session) {
    const startResult = await startSession();
    if (!startResult.ok) return startResult;
    session = startResult.value;
  }

  const now = Date.now();
  const xpFromEvent = event.type === "xp_gained" && typeof event.data["xp"] === "number"
    ? event.data["xp"]
    : 0;

  const updated: SessionStats = {
    ...session,
    lastActivityAt: now,
    durationMs: now - session.startedAt,
    skillGains: updateSkillGains(session.skillGains, event),
    totalXpGained: session.totalXpGained + xpFromEvent,
    itemsCollected: session.itemsCollected + (event.type === "item_collected" ? 1 : 0),
    pesetasEarned: session.pesetasEarned + (
      event.type === "item_sold" && typeof event.data["amount"] === "number"
        ? event.data["amount"]
        : 0
    ),
    pesetasSpent: session.pesetasSpent + (
      event.type === "item_bought" && typeof event.data["amount"] === "number"
        ? event.data["amount"]
        : 0
    ),
    combatKills: session.combatKills + (event.type === "combat_kill" ? 1 : 0),
    combatDeaths: session.combatDeaths + (event.type === "combat_death" ? 1 : 0),
    jobsCompleted: session.jobsCompleted + (event.type === "job_completed" ? 1 : 0),
    events: [...session.events, event],
  };

  await setStorage({ currentSession: updated });
  return ok(undefined);
}

export async function getSessionStats(): Promise<Result<SessionStats | null, string>> {
  const result = await getStorage(["currentSession"]);
  if (!result.ok) return result;
  return ok(result.value.currentSession ?? null);
}
