import type { IdleJob } from "../types/jobs.ts";
import type { PriceSnapshot, PriceHistory } from "../types/items.ts";
import type { SessionEvent, SessionStats, SkillGain } from "../types/session.ts";
import type { SkillName } from "../types/skills.ts";

interface IdleJobOverrides {
  readonly id?: string;
  readonly skill?: SkillName;
  readonly name?: string;
  readonly startedAt?: number;
  readonly durationMs?: number;
  readonly endsAt?: number;
}

export function buildIdleJob(overrides?: IdleJobOverrides): IdleJob {
  const now = Date.now();
  const defaults: IdleJob = {
    id: "test-job-1",
    skill: "Mineria",
    name: "Mining Iron",
    startedAt: now,
    durationMs: 300_000,
    endsAt: now + 300_000,
  };
  return { ...defaults, ...overrides };
}

interface PriceSnapshotOverrides {
  readonly itemId?: string;
  readonly itemName?: string;
  readonly price?: number;
  readonly timestamp?: number;
  readonly source?: "shop" | "mercadillo";
}

export function buildPriceSnapshot(
  overrides?: PriceSnapshotOverrides,
): PriceSnapshot {
  return {
    itemId: "iron-ore",
    itemName: "Iron Ore",
    price: 150,
    timestamp: Date.now(),
    source: "shop",
    ...overrides,
  };
}

interface PriceHistoryOverrides {
  readonly itemId?: string;
  readonly itemName?: string;
  readonly snapshots?: readonly PriceSnapshot[];
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly currentPrice?: number;
}

export function buildPriceHistory(
  overrides?: PriceHistoryOverrides,
): PriceHistory {
  const snapshot = buildPriceSnapshot();
  return {
    itemId: "iron-ore",
    itemName: "Iron Ore",
    snapshots: [snapshot],
    minPrice: 150,
    maxPrice: 150,
    currentPrice: 150,
    ...overrides,
  };
}

interface SessionEventOverrides {
  readonly type?: SessionEvent["type"];
  readonly timestamp?: number;
  readonly data?: Readonly<Record<string, unknown>>;
}

export function buildSessionEvent(
  overrides?: SessionEventOverrides,
): SessionEvent {
  return {
    type: "xp_gained",
    timestamp: Date.now(),
    data: { skill: "Mineria", xp: 100, levels: 0 },
    ...overrides,
  };
}

interface SessionStatsOverrides {
  readonly startedAt?: number;
  readonly lastActivityAt?: number;
  readonly durationMs?: number;
  readonly skillGains?: readonly SkillGain[];
  readonly totalXpGained?: number;
  readonly itemsCollected?: number;
  readonly pesetasEarned?: number;
  readonly pesetasSpent?: number;
  readonly combatKills?: number;
  readonly combatDeaths?: number;
  readonly jobsCompleted?: number;
  readonly events?: readonly SessionEvent[];
}

export function buildSessionStats(
  overrides?: SessionStatsOverrides,
): SessionStats {
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
    ...overrides,
  };
}
