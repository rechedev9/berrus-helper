import type { SkillName } from "./skills.ts";

export type SessionEventType =
  | "xp_gained"
  | "item_collected"
  | "item_sold"
  | "item_bought"
  | "combat_kill"
  | "combat_death"
  | "job_started"
  | "job_completed";

export interface SessionEvent {
  readonly type: SessionEventType;
  readonly timestamp: number;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface SkillGain {
  readonly skill: SkillName;
  readonly xpGained: number;
  readonly levelsGained: number;
}

export interface SessionStats {
  readonly startedAt: number;
  readonly lastActivityAt: number;
  readonly durationMs: number;
  readonly skillGains: readonly SkillGain[];
  readonly totalXpGained: number;
  readonly itemsCollected: number;
  readonly pesetasEarned: number;
  readonly pesetasSpent: number;
  readonly combatKills: number;
  readonly combatDeaths: number;
  readonly jobsCompleted: number;
  readonly events: readonly SessionEvent[];
}
