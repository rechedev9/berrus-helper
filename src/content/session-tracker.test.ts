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
    it("should detect XP gain from text content", () => {
      const node = document.createElement("div");
      node.textContent = "+150 XP (Mineria)";

      processAddedNode(node);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("XP_GAINED");
    });

    it("should detect XP gain with exp keyword", () => {
      const node = document.createElement("div");
      node.textContent = "+500 exp (Pesca)";

      processAddedNode(node);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("XP_GAINED");
    });

    it("should extract skill from link href", () => {
      const node = document.createElement("div");
      const link = document.createElement("a");
      link.href = "/g/c/rsn/character/skills/cooking";
      link.textContent = "+1 XP";
      node.appendChild(link);

      processAddedNode(node);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("XP_GAINED");
      const event = msg["event"] as Record<string, unknown>;
      const data = event["data"] as Record<string, unknown>;
      expect(data["skill"]).toBe("Cocina");
    });

    it("should detect item received events", () => {
      const node = document.createElement("div");
      node.textContent = "received Iron Ore";

      processAddedNode(node);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("ITEM_COLLECTED");
    });

    it("should detect item collected events", () => {
      const node = document.createElement("div");
      node.textContent = "collected Gold Bar";

      processAddedNode(node);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("ITEM_COLLECTED");
    });

    it("should detect combat victory events", () => {
      const node = document.createElement("div");
      node.textContent = "Victory!";

      processAddedNode(node);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("SESSION_EVENT");
    });

    it("should detect combat death events", () => {
      const node = document.createElement("div");
      node.textContent = "You died!";

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

    it("should ignore elements with empty text", () => {
      const node = document.createElement("div");
      node.textContent = "";

      processAddedNode(node);

      expect(sentMessages).toHaveLength(0);
    });

    it("should ignore elements with text longer than 150 characters", () => {
      const node = document.createElement("div");
      node.textContent = "+100 XP " + "a".repeat(200);

      processAddedNode(node);

      expect(sentMessages).toHaveLength(0);
    });

    it("should ignore unrelated text content", () => {
      const node = document.createElement("div");
      node.textContent = "Welcome to the game!";

      processAddedNode(node);

      expect(sentMessages).toHaveLength(0);
    });
  });
});
