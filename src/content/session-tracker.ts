import type { SessionEvent } from "../types/session.ts";
import { sendMessage } from "../utils/messages.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("session-tracker");

// Placeholder selectors for detecting in-game events via DOM changes
const XP_NOTIFICATION_SELECTOR = ".xp-gain, .xp-notification, [data-xp-gain]";
const ITEM_PICKUP_SELECTOR =
  ".item-pickup, .loot-notification, [data-item-pickup]";
const COMBAT_RESULT_SELECTOR =
  ".combat-result, .battle-result, [data-combat-result]";

function parseXpGainFromDom(el: Element): SessionEvent | undefined {
  const text = el.textContent?.trim();
  if (!text) return undefined;

  // Try to parse "+123 XP (Mineria)" pattern
  const match = /\+?([\d,]+)\s*(?:xp|exp)/i.exec(text);
  if (!match?.[1]) return undefined;

  const xp = parseInt(match[1].replace(/,/g, ""), 10);
  if (isNaN(xp)) return undefined;

  const skillMatch = /\((\w+)\)/i.exec(text);
  const skill = skillMatch?.[1] ?? "unknown";

  return {
    type: "xp_gained",
    timestamp: Date.now(),
    data: { xp, skill },
  };
}

function parseItemPickupFromDom(el: Element): SessionEvent | undefined {
  const itemName = el.textContent?.trim() ?? el.getAttribute("data-item-name");
  if (!itemName) return undefined;

  return {
    type: "item_collected",
    timestamp: Date.now(),
    data: { itemName },
  };
}

function parseCombatResultFromDom(el: Element): SessionEvent | undefined {
  const text = el.textContent?.trim()?.toLowerCase();
  if (!text) return undefined;

  const isWin =
    text.includes("victory") ||
    text.includes("win") ||
    text.includes("defeated");
  return {
    type: isWin ? "combat_kill" : "combat_death",
    timestamp: Date.now(),
    data: { result: text },
  };
}

function matchSelfAndChildren(
  node: Element,
  selector: string,
): readonly Element[] {
  return [
    ...(node.matches(selector) ? [node] : []),
    ...node.querySelectorAll(selector),
  ];
}

function emitParsedEvents(
  elements: readonly Element[],
  parser: (el: Element) => SessionEvent | undefined,
  messageType: "XP_GAINED" | "ITEM_COLLECTED" | "SESSION_EVENT",
  errorLabel: string,
): void {
  for (const el of elements) {
    const event = parser(el);
    if (event) {
      sendMessage({ type: messageType, event }).catch((e: unknown) => {
        logger.error(errorLabel, e);
      });
    }
  }
}

export function processAddedNode(node: Node): void {
  if (!(node instanceof Element)) return;

  emitParsedEvents(
    matchSelfAndChildren(node, XP_NOTIFICATION_SELECTOR),
    parseXpGainFromDom,
    "XP_GAINED",
    "Failed to send XP event",
  );
  emitParsedEvents(
    matchSelfAndChildren(node, ITEM_PICKUP_SELECTOR),
    parseItemPickupFromDom,
    "ITEM_COLLECTED",
    "Failed to send item event",
  );
  emitParsedEvents(
    matchSelfAndChildren(node, COMBAT_RESULT_SELECTOR),
    parseCombatResultFromDom,
    "SESSION_EVENT",
    "Failed to send combat event",
  );
}
