import type { SessionEvent } from "../types/session.ts";
import { sendMessage } from "../utils/messages.ts";
import { apiSkillToSkillName } from "../utils/skill-mapping.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("session-tracker");

const XP_PATTERN = /\+?([\d,]+)\s*(?:xp|exp)/i;
const ITEM_RECEIVED_PATTERN = /received\s+(.+)/i;
const ITEM_COLLECTED_PATTERN = /collected\s+(.+)/i;
const COMBAT_WIN_PATTERN = /victory|defeated/i;
const COMBAT_LOSS_PATTERN = /death|died/i;
const SKILL_LINK_HREF = /\/character\/skills\/([a-z]+)/i;

const MAX_NOTIFICATION_LENGTH = 150;

function tryExtractSkillFromLinks(el: Element): string {
  const link = el.querySelector('a[href*="/character/skills/"]');
  if (link) {
    const href = link.getAttribute("href") ?? "";
    const match = SKILL_LINK_HREF.exec(href);
    if (match?.[1]) {
      const mapped = apiSkillToSkillName(match[1]);
      if (mapped) return mapped;
    }
  }

  // Fallback: parenthesized skill name e.g. "+5 XP (Mineria)"
  const text = el.textContent ?? "";
  const parenMatch = /\((\w+)\)/i.exec(text);
  return parenMatch?.[1] ?? "unknown";
}

function tryEmitXpEvent(el: Element, text: string): void {
  const match = XP_PATTERN.exec(text);
  if (!match?.[1]) return;

  const xp = parseInt(match[1].replace(/,/g, ""), 10);
  if (isNaN(xp)) return;

  const skill = tryExtractSkillFromLinks(el);

  const event: SessionEvent = {
    type: "xp_gained",
    timestamp: Date.now(),
    data: { xp, skill },
  };

  sendMessage({ type: "XP_GAINED", event }).catch((e: unknown) => {
    logger.error("Failed to send XP event", e);
  });
}

function tryEmitItemEvent(_el: Element, text: string): void {
  const receivedMatch = ITEM_RECEIVED_PATTERN.exec(text);
  const collectedMatch = ITEM_COLLECTED_PATTERN.exec(text);
  const itemName = receivedMatch?.[1]?.trim() ?? collectedMatch?.[1]?.trim();
  if (!itemName) return;

  const event: SessionEvent = {
    type: "item_collected",
    timestamp: Date.now(),
    data: { itemName },
  };

  sendMessage({ type: "ITEM_COLLECTED", event }).catch((e: unknown) => {
    logger.error("Failed to send item event", e);
  });
}

function tryEmitCombatEvent(_el: Element, text: string): void {
  const lowerText = text.toLowerCase();
  const isWin = COMBAT_WIN_PATTERN.test(lowerText);
  const isLoss = COMBAT_LOSS_PATTERN.test(lowerText);
  if (!isWin && !isLoss) return;

  const event: SessionEvent = {
    type: isWin ? "combat_kill" : "combat_death",
    timestamp: Date.now(),
    data: { result: lowerText },
  };

  sendMessage({ type: "SESSION_EVENT", event }).catch((e: unknown) => {
    logger.error("Failed to send combat event", e);
  });
}

export function processAddedNode(node: Node): void {
  if (!(node instanceof Element)) return;

  const text = node.textContent?.trim() ?? "";
  if (text.length === 0 || text.length > MAX_NOTIFICATION_LENGTH) return;

  tryEmitXpEvent(node, text);
  tryEmitItemEvent(node, text);
  tryEmitCombatEvent(node, text);
}
