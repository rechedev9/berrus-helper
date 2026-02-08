import { SKILLS } from "../types/skills.ts";
import { ITEM_RARITIES, ITEM_TYPES } from "../types/items.ts";
import type { SkillName } from "../types/skills.ts";
import type { IdleJob } from "../types/jobs.ts";
import type { PriceSnapshot } from "../types/items.ts";
import type { SessionEvent, SessionEventType } from "../types/session.ts";
import type { ExtensionMessage } from "../types/messages.ts";

const SKILL_SET: ReadonlySet<string> = new Set(SKILLS);
const RARITY_SET: ReadonlySet<string> = new Set(ITEM_RARITIES);
const ITEM_TYPE_SET: ReadonlySet<string> = new Set(ITEM_TYPES);

const MESSAGE_TYPES: ReadonlySet<string> = new Set([
  "JOB_DETECTED",
  "JOB_COMPLETED",
  "PRICE_SNAPSHOT",
  "XP_GAINED",
  "ITEM_COLLECTED",
  "SESSION_EVENT",
  "CONTENT_SCRIPT_READY",
  "GET_TIMERS",
  "GET_PRICES",
  "GET_SESSION_STATS",
  "SEARCH_HISCORES",
]);

const SESSION_EVENT_TYPES: ReadonlySet<string> = new Set([
  "xp_gained",
  "item_collected",
  "item_sold",
  "item_bought",
  "combat_kill",
  "combat_death",
  "job_started",
  "job_completed",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSkillName(value: unknown): value is SkillName {
  return typeof value === "string" && SKILL_SET.has(value);
}

export function isItemRarity(value: unknown): value is string {
  return typeof value === "string" && RARITY_SET.has(value);
}

export function isItemType(value: unknown): value is string {
  return typeof value === "string" && ITEM_TYPE_SET.has(value);
}

export function isSessionEventType(value: unknown): value is SessionEventType {
  return typeof value === "string" && SESSION_EVENT_TYPES.has(value);
}

export function isIdleJobData(value: unknown): value is IdleJob {
  if (!isRecord(value)) return false;
  return (
    typeof value["id"] === "string" &&
    isSkillName(value["skill"]) &&
    typeof value["name"] === "string" &&
    typeof value["startedAt"] === "number" &&
    typeof value["durationMs"] === "number" &&
    typeof value["endsAt"] === "number"
  );
}

export function isPriceSnapshotData(value: unknown): value is PriceSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value["itemId"] === "string" &&
    typeof value["itemName"] === "string" &&
    typeof value["price"] === "number" &&
    typeof value["timestamp"] === "number" &&
    (value["source"] === "shop" || value["source"] === "mercadillo")
  );
}

export function isSessionEventData(value: unknown): value is SessionEvent {
  if (!isRecord(value)) return false;
  return (
    isSessionEventType(value["type"]) &&
    typeof value["timestamp"] === "number" &&
    isRecord(value["data"])
  );
}

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!isRecord(value)) return false;
  return typeof value["type"] === "string" && MESSAGE_TYPES.has(value["type"]);
}

export function isInterceptedMessage(
  value: unknown,
): value is { readonly source: "berrus-helper"; readonly payload: unknown } {
  if (!isRecord(value)) return false;
  return value["source"] === "berrus-helper" && "payload" in value;
}
