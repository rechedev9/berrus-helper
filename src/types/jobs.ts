import type { SkillName } from "./skills.ts";

export interface IdleJob {
  readonly id: string;
  readonly skill: SkillName;
  readonly name: string;
  readonly startedAt: number;
  readonly durationMs: number;
  readonly endsAt: number;
}

export interface JobTimerState {
  readonly activeJobs: readonly IdleJob[];
  readonly completedJobIds: readonly string[];
}
