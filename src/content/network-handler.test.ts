import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  installMockChrome,
  type ChromeMockHandle,
} from "../test-utils/chrome-mock.ts";
import { handleInterceptedResponse } from "./network-handler.ts";
import type { InterceptedResponse } from "../utils/network-interceptor.ts";

let handle: ChromeMockHandle;
let sentMessages: unknown[];

beforeEach(() => {
  handle = installMockChrome();
  sentMessages = [];
  // Capture messages sent via chrome.runtime.sendMessage
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

function buildResponse(overrides: Partial<InterceptedResponse>): InterceptedResponse {
  return {
    type: "fetch",
    url: "https://www.berrus.app/api/test",
    status: 200,
    body: "{}",
    ...overrides,
  };
}

describe("network-handler", () => {
  describe("handleInterceptedResponse", () => {
    it("should send XP_GAINED for skill API responses", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/skills/update",
        body: JSON.stringify({ skill: "Mineria", xp: 150, level: 42 }),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("XP_GAINED");
    });

    it("should send SESSION_EVENT for combat API responses", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/combat/result",
        body: JSON.stringify({ result: "win" }),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("SESSION_EVENT");
    });

    it("should send ITEM_COLLECTED for item API responses", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/items/pickup",
        body: JSON.stringify({ name: "Iron Ore" }),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("ITEM_COLLECTED");
    });

    it("should ignore non-2xx responses", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/skills/update",
        status: 404,
        body: JSON.stringify({ skill: "Mineria", xp: 150 }),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(0);
    });

    it("should ignore unparseable JSON bodies", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/skills/update",
        body: "not json at all",
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(0);
    });
  });
});
