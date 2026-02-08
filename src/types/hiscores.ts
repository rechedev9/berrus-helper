import type { SkillName } from "./skills.ts";

export const HISCORE_CATEGORIES = ["total", "combat", ...[] as SkillName[]] as const;

export type HiscoreCategory = "total" | "combat" | SkillName;

export interface HiscoreEntry {
  readonly rank: number;
  readonly playerName: string;
  readonly level: number;
  readonly xp: number;
  readonly category: HiscoreCategory;
}

export interface HiscoreSearchResult {
  readonly query: string;
  readonly category: HiscoreCategory;
  readonly entries: readonly HiscoreEntry[];
  readonly fetchedAt: number;
}
