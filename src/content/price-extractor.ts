import type { PriceSnapshot } from "../types/items.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";
import { queryAll } from "../utils/dom.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("price-extractor");

// Placeholder selectors — must be refined by inspecting berrus.app DOM
const SHOP_ITEM_SELECTOR = '[data-testid="shop-item"], .shop-item, .market-item';
const ITEM_NAME_SELECTOR = ".item-name, [data-item-name]";
const ITEM_PRICE_SELECTOR = ".item-price, [data-price]";
const MERCADILLO_CONTAINER_SELECTOR = ".mercadillo, .market, .trading-post";

function parsePriceText(text: string): number | undefined {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const price = parseFloat(cleaned);
  return isNaN(price) ? undefined : price;
}

function detectSource(el: Element): "shop" | "mercadillo" {
  const closest = el.closest(MERCADILLO_CONTAINER_SELECTOR);
  return closest ? "mercadillo" : "shop";
}

function extractPriceFromElement(el: Element): PriceSnapshot | undefined {
  const nameEl = el.querySelector(ITEM_NAME_SELECTOR);
  const priceEl = el.querySelector(ITEM_PRICE_SELECTOR);

  const itemName = nameEl?.textContent?.trim();
  const priceText = priceEl?.textContent?.trim() ?? el.getAttribute("data-price");

  if (!itemName || !priceText) return undefined;

  const price = parsePriceText(priceText);
  if (price === undefined) return undefined;

  const itemId = el.getAttribute("data-item-id") ?? itemName.toLowerCase().replace(/\s+/g, "-");

  return {
    itemId,
    itemName,
    price,
    timestamp: Date.now(),
    source: detectSource(el),
  };
}

export function extractPrices(): Result<readonly PriceSnapshot[], string> {
  const itemElements = queryAll<Element>(SHOP_ITEM_SELECTOR);

  if (itemElements.length === 0) {
    return ok([]);
  }

  const snapshots: PriceSnapshot[] = [];
  for (const el of itemElements) {
    const snapshot = extractPriceFromElement(el);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  logger.info("Extracted prices", { count: snapshots.length });
  return ok(snapshots);
}
