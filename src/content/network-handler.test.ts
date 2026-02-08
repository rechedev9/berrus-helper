import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  installMockChrome,
  type ChromeMockHandle,
} from "../test-utils/chrome-mock.ts";
import {
  handleInterceptedResponse,
  resetNetworkHandlerState,
} from "./network-handler.ts";
import type { InterceptedResponse } from "../utils/network-interceptor.ts";

let handle: ChromeMockHandle;
let sentMessages: unknown[];

beforeEach(() => {
  handle = installMockChrome();
  sentMessages = [];
  resetNetworkHandlerState();
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

function buildResponse(
  overrides: Partial<InterceptedResponse>,
): InterceptedResponse {
  return {
    type: "fetch",
    url: "https://www.berrus.app/api/test",
    status: 200,
    body: "{}",
    ...overrides,
  };
}

describe("network-handler", () => {
  describe("character endpoint", () => {
    it("should send JOB_DETECTED for active jobs", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/protected/character/my-char",
        body: JSON.stringify({
          jobs: [
            {
              jobId: "mine-copper",
              status: "active",
              skill: "mining",
              startedAt: 1000,
              durationMs: 5000,
            },
          ],
        }),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("JOB_DETECTED");
    });

    it("should skip jobs that are not active", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/protected/character/my-char",
        body: JSON.stringify({
          jobs: [{ jobId: "mine-copper", status: "completed", skill: "mining" }],
        }),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(0);
    });

    it("should detect XP gains on second call", () => {
      const url = "https://www.berrus.app/api/protected/character/my-char";

      // First call — seeds the snapshot
      handleInterceptedResponse(
        buildResponse({
          url,
          body: JSON.stringify({ skillsXp: { mining: 100, fishing: 50 } }),
        }),
      );

      expect(sentMessages).toHaveLength(0);

      // Second call — mining increased by 25
      handleInterceptedResponse(
        buildResponse({
          url,
          body: JSON.stringify({ skillsXp: { mining: 125, fishing: 50 } }),
        }),
      );

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("XP_GAINED");

      const event = msg["event"] as Record<string, unknown>;
      const data = event["data"] as Record<string, unknown>;
      expect(data["xp"]).toBe(25);
      expect(data["skill"]).toBe("Mineria");
    });

    it("should send SESSION_EVENT for combat result", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/protected/character/my-char",
        body: JSON.stringify({
          activeCombat: { result: "win" },
        }),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("SESSION_EVENT");
    });

    it("should not re-send the same combat result", () => {
      const url = "https://www.berrus.app/api/protected/character/my-char";
      const body = JSON.stringify({ activeCombat: { result: "win" } });

      handleInterceptedResponse(buildResponse({ url, body }));
      handleInterceptedResponse(buildResponse({ url, body }));

      expect(sentMessages).toHaveLength(1);
    });
  });

  describe("rewards endpoint", () => {
    it("should send ITEM_COLLECTED for each reward", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/protected/character/my-char/protected/rewards",
        body: JSON.stringify([
          { name: "Copper Ore" },
          { name: "Iron Ore" },
        ]),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(2);
      const msg0 = sentMessages[0] as Record<string, unknown>;
      const msg1 = sentMessages[1] as Record<string, unknown>;
      expect(msg0["type"]).toBe("ITEM_COLLECTED");
      expect(msg1["type"]).toBe("ITEM_COLLECTED");
    });
  });

  describe("edge cases", () => {
    it("should ignore non-2xx responses", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/protected/character/my-char",
        status: 404,
        body: JSON.stringify({ jobs: [{ jobId: "x", status: "active" }] }),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(0);
    });

    it("should ignore unparseable JSON bodies", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/protected/character/my-char",
        body: "not json at all",
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(0);
    });

    it("should ignore /character/all endpoint", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/protected/character/all",
        body: JSON.stringify([{ name: "char1" }, { name: "char2" }]),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(0);
    });

    it("should match character URL with query string", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/protected/character/my-char?include=stats",
        body: JSON.stringify({
          jobs: [
            {
              jobId: "mine-copper",
              status: "active",
              skill: "mining",
              startedAt: 1000,
              durationMs: 5000,
            },
          ],
        }),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(1);
      const msg = sentMessages[0] as Record<string, unknown>;
      expect(msg["type"]).toBe("JOB_DETECTED");
    });

    it("should ignore non-matching URLs", () => {
      const response = buildResponse({
        url: "https://www.berrus.app/api/some-other-endpoint",
        body: JSON.stringify({ jobs: [{ jobId: "x", status: "active" }] }),
      });

      handleInterceptedResponse(response);

      expect(sentMessages).toHaveLength(0);
    });
  });
});
