import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  installMockChrome,
  type ChromeMockHandle,
} from "../test-utils/chrome-mock.ts";
import { processAddedNode } from "./session-tracker.ts";

let handle: ChromeMockHandle;
let sentMessages: unknown[];

beforeEach(() => {
  handle = installMockChrome();
  sentMessages = [];
  (chrome.runtime as Record<string, unknown>)["sendMessage"] = mock(
    async (message: unknown) => {
      sentMessages.push(message);
      return { success: true };
    },
  );
});

afterEach(() => {
  handle.reset();
});

describe("session-tracker", () => {
  describe("processAddedNode", () => {
    it("should detect XP gain notifications", () => {
      const node = document.createElement("div");
      node.className = "xp-gain";
      node.textContent = "+150 XP (Mineria)";

      processAddedNode(node);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("XP_GAINED");
    });

    it("should detect item pickup notifications", () => {
      const node = document.createElement("div");
      node.className = "item-pickup";
      node.textContent = "Iron Ore";

      processAddedNode(node);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("ITEM_COLLECTED");
    });

    it("should detect combat result notifications", () => {
      const node = document.createElement("div");
      node.className = "combat-result";
      node.textContent = "Victory!";

      processAddedNode(node);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("SESSION_EVENT");
    });

    it("should ignore non-Element nodes", () => {
      const textNode = document.createTextNode("just text");

      processAddedNode(textNode);

      expect(sentMessages).toHaveLength(0);
    });

    it("should detect notifications in child elements", () => {
      const parent = document.createElement("div");
      const child = document.createElement("span");
      child.className = "xp-notification";
      child.textContent = "+500 exp (Pesca)";
      parent.appendChild(child);

      processAddedNode(parent);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("XP_GAINED");
    });
  });
});
