import { describe, it, expect, afterEach, mock } from "bun:test";
import { searchHiscores } from "./hiscore-fetcher.ts";

const originalFetch = globalThis.fetch;

function mockFetch(
  response: { ok: boolean; status: number; text: string },
): void {
  globalThis.fetch = mock(() =>
    Promise.resolve({
      ok: response.ok,
      status: response.status,
      text: () => Promise.resolve(response.text),
    }),
  ) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("hiscore-fetcher", () => {
  describe("searchHiscores", () => {
    it("should parse hiscore HTML and return matching entries", async () => {
      const html = `
        <table>
          1. TestPlayer 99 1,234,567
          2. AnotherPlayer 85 500,000
          3. TestPlayer2 70 100,000
        </table>
      `;
      mockFetch({ ok: true, status: 200, text: html });

      const result = await searchHiscores("TestPlayer", "total");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.query).toBe("TestPlayer");
        expect(result.value.category).toBe("total");
        // Both TestPlayer and TestPlayer2 match the filter
        expect(result.value.entries.length).toBeGreaterThanOrEqual(1);
        const first = result.value.entries[0];
        expect(first?.playerName).toBe("TestPlayer");
        expect(first?.xp).toBe(1234567);
      }
    });

    it("should encode URL parameters correctly", async () => {
      mockFetch({ ok: true, status: 200, text: "" });

      await searchHiscores("Player Name", "Mineria");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://www.berrus.app/hiscores?player=Player%20Name&category=Mineria",
      );
    });

    it("should return error for non-ok HTTP responses", async () => {
      mockFetch({ ok: false, status: 500, text: "Server Error" });

      const result = await searchHiscores("Test", "total");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("HTTP 500");
      }
    });

    it("should return all entries when no player name matches", async () => {
      const html = `
        1. Alpha 80 400,000
        2. Beta 75 300,000
      `;
      mockFetch({ ok: true, status: 200, text: html });

      const result = await searchHiscores("NonExistent", "combat");

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Falls back to all entries when none match the filter
        expect(result.value.entries).toHaveLength(2);
      }
    });

    it("should handle network errors gracefully", async () => {
      globalThis.fetch = mock(() =>
        Promise.reject(new Error("Network failure")),
      ) as unknown as typeof fetch;

      const result = await searchHiscores("Test", "total");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Network failure");
      }
    });

    it("should handle case-insensitive player name matching", async () => {
      const html = `1. TESTPLAYER 99 999,999`;
      mockFetch({ ok: true, status: 200, text: html });

      const result = await searchHiscores("testplayer", "total");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.entries).toHaveLength(1);
        expect(result.value.entries[0]?.playerName).toBe("TESTPLAYER");
      }
    });
  });
});
