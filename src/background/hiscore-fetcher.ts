import type { HiscoreCategory, HiscoreEntry, HiscoreSearchResult } from "../types/hiscores.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("hiscore-fetcher");

const BERRUS_HISCORE_URL = "https://www.berrus.app/hiscores";

function parseHiscoreHtml(html: string, category: HiscoreCategory): readonly HiscoreEntry[] {
  const entries: HiscoreEntry[] = [];

  // Look for player data patterns in the HTML/RSC payload
  // Pattern: rank, name, level, xp in table rows or JSON-like structures
  const rowPattern = /(\d+)\s*[.\-)\s]+([A-Za-z0-9_]+)\s+(\d+)\s+([\d,]+)/g;
  let match = rowPattern.exec(html);

  while (match) {
    const rank = parseInt(match[1] ?? "0", 10);
    const playerName = match[2] ?? "";
    const level = parseInt(match[3] ?? "0", 10);
    const xp = parseInt((match[4] ?? "0").replace(/,/g, ""), 10);

    if (rank > 0 && playerName.length > 0) {
      entries.push({ rank, playerName, level, xp, category });
    }

    match = rowPattern.exec(html);
  }

  return entries;
}

export async function searchHiscores(
  playerName: string,
  category: HiscoreCategory,
): Promise<Result<HiscoreSearchResult, string>> {
  try {
    const url = `${BERRUS_HISCORE_URL}?player=${encodeURIComponent(playerName)}&category=${encodeURIComponent(category)}`;
    logger.info("Fetching hiscores", { url });

    const response = await fetch(url);
    if (!response.ok) {
      return err(`Hiscore fetch failed: HTTP ${String(response.status)}`);
    }

    const html = await response.text();
    const entries = parseHiscoreHtml(html, category);

    // Filter for the searched player if entries were found
    const filtered = entries.length > 0
      ? entries.filter(
          (e) => e.playerName.toLowerCase().includes(playerName.toLowerCase()),
        )
      : entries;

    return ok({
      query: playerName,
      category,
      entries: filtered.length > 0 ? filtered : entries,
      fetchedAt: Date.now(),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("Hiscore search failed", { playerName, category, error: message });
    return err(`Hiscore search failed: ${message}`);
  }
}
