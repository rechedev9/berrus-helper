import type { PriceSnapshot } from "../types/items.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";
import {
  findImagesByAttribute,
  findNextTextContent,
  findPreviousElementByTag,
} from "../utils/dom-walker.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("price-extractor");

const PESETAS_PATTERN = /pesetas/i;
const PRICE_NUMBER_PATTERN = /^\d[\d.]*$/;

/**
 * Parse price text using integer-only parsing.
 * Dots are thousands separators in this game (European format),
 * e.g. "298.200" → 298200, "1.500.000" → 1500000.
 */
export function parsePriceText(text: string): number | undefined {
  const cleaned = text.replace(/[^\d]/g, "");
  if (cleaned.length === 0) return undefined;
  const price = parseInt(cleaned, 10);
  return isNaN(price) ? undefined : price;
}

/**
 * Detect shop source from the current URL path instead of CSS selectors.
 */
export function detectSource(): "shop" | "mercadillo" {
  const path = window.location.pathname.toLowerCase();
  return path.includes("mercadillo") || path.includes("market")
    ? "mercadillo"
    : "shop";
}

function extractItemName(img: HTMLImageElement): string | undefined {
  const alt = img.alt?.trim();
  if (alt && alt.length > 0) return alt;

  // Fallback: parse from src filename
  const src = img.src ?? "";
  const filename = src.split("/").pop()?.split(".")[0];
  return filename && filename.length > 0 ? filename : undefined;
}

function extractPriceFromTriplet(
  pesetasImg: HTMLImageElement,
  source: "shop" | "mercadillo",
): PriceSnapshot | undefined {
  // Walk backward to find item image
  const itemImg = findPreviousElementByTag(pesetasImg, "IMG");
  if (!itemImg || !(itemImg instanceof HTMLImageElement)) return undefined;

  // Skip if the "item" image is itself a pesetas icon
  if (PESETAS_PATTERN.test(itemImg.alt ?? "") || PESETAS_PATTERN.test(itemImg.src ?? "")) {
    return undefined;
  }

  // Walk forward to find price text
  const priceText = findNextTextContent(pesetasImg);
  if (!priceText || !PRICE_NUMBER_PATTERN.test(priceText)) return undefined;

  const itemName = extractItemName(itemImg);
  if (!itemName) return undefined;

  const price = parsePriceText(priceText);
  if (price === undefined) return undefined;

  const itemId = itemName.toLowerCase().replace(/\s+/g, "-");

  return {
    itemId,
    itemName,
    price,
    timestamp: Date.now(),
    source,
  };
}

export function extractPrices(): Result<readonly PriceSnapshot[], string> {
  logger.debug("Attempting price extraction via pesetas image anchoring");

  const pesetasImages = findImagesByAttribute(PESETAS_PATTERN);
  logger.debug("Pesetas images found", { count: pesetasImages.length });

  if (pesetasImages.length === 0) {
    return ok([]);
  }

  const source = detectSource();
  const snapshots: PriceSnapshot[] = [];

  for (const pesetasImg of pesetasImages) {
    const snapshot = extractPriceFromTriplet(pesetasImg, source);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  const failedCount = pesetasImages.length - snapshots.length;
  if (failedCount > 0) {
    logger.debug("Some pesetas images failed triplet extraction", {
      total: pesetasImages.length,
      extracted: snapshots.length,
      failed: failedCount,
    });
  }

  if (snapshots.length > 0) {
    logger.debug("Successfully extracted prices", {
      count: snapshots.length,
      items: snapshots.map((s) => ({ item: s.itemName, price: s.price })),
    });
  }

  return ok(snapshots);
}
