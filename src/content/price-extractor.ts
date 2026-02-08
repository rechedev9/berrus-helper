import type { PriceSnapshot } from "../types/items.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";
import { queryAll } from "../utils/dom.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("price-extractor");

// Placeholder selectors — must be refined by inspecting berrus.app DOM
const SHOP_ITEM_SELECTOR =
  '[data-testid="shop-item"], .shop-item, .market-item';
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
  const priceText =
    priceEl?.textContent?.trim() ?? el.getAttribute("data-price");

  if (!itemName || !priceText) return undefined;

  const price = parsePriceText(priceText);
  if (price === undefined) return undefined;

  const itemId =
    el.getAttribute("data-item-id") ??
    itemName.toLowerCase().replace(/\s+/g, "-");

  return {
    itemId,
    itemName,
    price,
    timestamp: Date.now(),
    source: detectSource(el),
  };
}

export function extractPrices(): Result<readonly PriceSnapshot[], string> {
  logger.info("Attempting price extraction", { selector: SHOP_ITEM_SELECTOR });

  const itemElements = queryAll<Element>(SHOP_ITEM_SELECTOR);
  logger.info("Price elements found", { count: itemElements.length });

  if (itemElements.length === 0) {
    logger.warn("No shop item elements matched selector", {
      selector: SHOP_ITEM_SELECTOR,
      hint: "DOM may not contain shop/market elements or selectors need updating",
    });
  }

  const snapshots = itemElements
    .map(extractPriceFromElement)
    .filter((s): s is PriceSnapshot => s !== undefined);

  const failedCount = itemElements.length - snapshots.length;
  if (failedCount > 0) {
    logger.warn("Some price elements failed extraction", {
      total: itemElements.length,
      extracted: snapshots.length,
      failed: failedCount,
    });
  }

  if (snapshots.length > 0) {
    logger.info("Successfully extracted prices", {
      count: snapshots.length,
      items: snapshots.map((s) => ({ item: s.itemName, price: s.price })),
    });
  }

  return ok(snapshots);
}
