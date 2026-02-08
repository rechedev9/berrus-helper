import type { SessionEvent } from "../types/session.ts";
import { sendMessage } from "../utils/messages.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("session-tracker");

// Placeholder selectors for detecting in-game events via DOM changes
const XP_NOTIFICATION_SELECTOR = ".xp-gain, .xp-notification, [data-xp-gain]";
const ITEM_PICKUP_SELECTOR = ".item-pickup, .loot-notification, [data-item-pickup]";
const COMBAT_RESULT_SELECTOR = ".combat-result, .battle-result, [data-combat-result]";

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

  const isWin = text.includes("victory") || text.includes("win") || text.includes("defeated");
  return {
    type: isWin ? "combat_kill" : "combat_death",
    timestamp: Date.now(),
    data: { result: text },
  };
}

export function processAddedNode(node: Node): void {
  if (!(node instanceof Element)) return;

  const xpEls = [
    ...(node.matches(XP_NOTIFICATION_SELECTOR) ? [node] : []),
    ...Array.from(node.querySelectorAll(XP_NOTIFICATION_SELECTOR)),
  ];

  for (const el of xpEls) {
    const event = parseXpGainFromDom(el);
    if (event) {
      sendMessage({ type: "XP_GAINED", event }).catch((e: unknown) => {
        logger.error("Failed to send XP event", e);
      });
    }
  }

  const itemEls = [
    ...(node.matches(ITEM_PICKUP_SELECTOR) ? [node] : []),
    ...Array.from(node.querySelectorAll(ITEM_PICKUP_SELECTOR)),
  ];

  for (const el of itemEls) {
    const event = parseItemPickupFromDom(el);
    if (event) {
      sendMessage({ type: "ITEM_COLLECTED", event }).catch((e: unknown) => {
        logger.error("Failed to send item event", e);
      });
    }
  }

  const combatEls = [
    ...(node.matches(COMBAT_RESULT_SELECTOR) ? [node] : []),
    ...Array.from(node.querySelectorAll(COMBAT_RESULT_SELECTOR)),
  ];

  for (const el of combatEls) {
    const event = parseCombatResultFromDom(el);
    if (event) {
      sendMessage({ type: "SESSION_EVENT", event }).catch((e: unknown) => {
        logger.error("Failed to send combat event", e);
      });
    }
  }
}
