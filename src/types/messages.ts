import type { IdleJob, JobTimerState } from "./jobs.ts";
import type { PriceSnapshot, PriceHistory } from "./items.ts";
import type { SessionEvent, SessionStats } from "./session.ts";
import type { HiscoreCategory, HiscoreSearchResult } from "./hiscores.ts";

// Content → Background messages
export interface JobDetectedMessage {
  readonly type: "JOB_DETECTED";
  readonly job: IdleJob;
}

export interface JobCompletedMessage {
  readonly type: "JOB_COMPLETED";
  readonly jobId: string;
}

export interface PriceSnapshotMessage {
  readonly type: "PRICE_SNAPSHOT";
  readonly snapshot: PriceSnapshot;
}

export interface XpGainedMessage {
  readonly type: "XP_GAINED";
  readonly event: SessionEvent;
}

export interface ItemCollectedMessage {
  readonly type: "ITEM_COLLECTED";
  readonly event: SessionEvent;
}

export interface SessionEventMessage {
  readonly type: "SESSION_EVENT";
  readonly event: SessionEvent;
}

export interface ContentScriptReadyMessage {
  readonly type: "CONTENT_SCRIPT_READY";
}

// Popup → Background messages
export interface GetTimersMessage {
  readonly type: "GET_TIMERS";
}

export interface GetPricesMessage {
  readonly type: "GET_PRICES";
  readonly itemId?: string;
}

export interface GetSessionStatsMessage {
  readonly type: "GET_SESSION_STATS";
}

export interface SearchHiscoresMessage {
  readonly type: "SEARCH_HISCORES";
  readonly playerName: string;
  readonly category: HiscoreCategory;
}

export type ExtensionMessage =
  | JobDetectedMessage
  | JobCompletedMessage
  | PriceSnapshotMessage
  | XpGainedMessage
  | ItemCollectedMessage
  | SessionEventMessage
  | ContentScriptReadyMessage
  | GetTimersMessage
  | GetPricesMessage
  | GetSessionStatsMessage
  | SearchHiscoresMessage;

export interface MessageResponseMap {
  readonly JOB_DETECTED: { readonly success: boolean };
  readonly JOB_COMPLETED: { readonly success: boolean };
  readonly PRICE_SNAPSHOT: { readonly success: boolean };
  readonly XP_GAINED: { readonly success: boolean };
  readonly ITEM_COLLECTED: { readonly success: boolean };
  readonly SESSION_EVENT: { readonly success: boolean };
  readonly CONTENT_SCRIPT_READY: { readonly success: boolean };
  readonly GET_TIMERS: JobTimerState;
  readonly GET_PRICES: readonly PriceHistory[];
  readonly GET_SESSION_STATS: SessionStats | null;
  readonly SEARCH_HISCORES: HiscoreSearchResult;
}
