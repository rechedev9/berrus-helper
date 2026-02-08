import type { InterceptedResponse } from "../utils/network-interceptor.ts";
import type { SessionEvent } from "../types/session.ts";
import { sendMessage } from "../utils/messages.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("network-handler");

// URL patterns for different game API endpoints
const API_PATTERNS = {
  jobs: /\/api\/.*jobs|\/api\/.*idle/i,
  items: /\/api\/.*items|\/api\/.*inventory/i,
  combat: /\/api\/.*combat|\/api\/.*battle/i,
  skills: /\/api\/.*skills|\/api\/.*xp/i,
  market: /\/api\/.*market|\/api\/.*shop|\/api\/.*mercadillo/i,
} as const;

function tryParseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function handleJobResponse(data: unknown): void {
  if (!isRecord(data)) return;

  // Look for job-related data in the response
  // The exact shape depends on the Berrus API — this handles common patterns
  logger.info("Job-related API response detected", { data });
}

function handleXpResponse(data: unknown): void {
  if (!isRecord(data)) return;

  const skill = data["skill"];
  const xp = data["xp"] ?? data["experience"];
  const level = data["level"];

  if (typeof skill === "string" && typeof xp === "number") {
    const event: SessionEvent = {
      type: "xp_gained",
      timestamp: Date.now(),
      data: {
        skill,
        xp,
        levels: typeof level === "number" ? level : 0,
      },
    };

    sendMessage({ type: "XP_GAINED", event }).catch((e: unknown) => {
      logger.error("Failed to send XP event", e);
    });
  }
}

function handleCombatResponse(data: unknown): void {
  if (!isRecord(data)) return;

  const result = data["result"] ?? data["outcome"];
  if (typeof result !== "string") return;

  const eventType = result === "win" || result === "victory" ? "combat_kill" : "combat_death";
  const event: SessionEvent = {
    type: eventType,
    timestamp: Date.now(),
    data: { result },
  };

  sendMessage({ type: "SESSION_EVENT", event }).catch((e: unknown) => {
    logger.error("Failed to send combat event", e);
  });
}

function handleItemResponse(data: unknown): void {
  if (!isRecord(data)) return;

  const itemName = data["name"] ?? data["itemName"];
  if (typeof itemName !== "string") return;

  const event: SessionEvent = {
    type: "item_collected",
    timestamp: Date.now(),
    data: { itemName },
  };

  sendMessage({ type: "ITEM_COLLECTED", event }).catch((e: unknown) => {
    logger.error("Failed to send item event", e);
  });
}

export function handleInterceptedResponse(response: InterceptedResponse): void {
  if (response.status < 200 || response.status >= 300) return;

  const data = tryParseJson(response.body);
  if (!data) return;

  const { url } = response;

  if (API_PATTERNS.skills.test(url)) {
    handleXpResponse(data);
  } else if (API_PATTERNS.combat.test(url)) {
    handleCombatResponse(data);
  } else if (API_PATTERNS.items.test(url)) {
    handleItemResponse(data);
  } else if (API_PATTERNS.jobs.test(url)) {
    handleJobResponse(data);
  }
}
