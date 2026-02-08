import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  extractPrices,
  parsePriceText,
  detectSource,
} from "./price-extractor.ts";

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
});

/**
 * Build a DOM triplet mimicking berrus.app shop item:
 *   <img alt="{itemName}">        (item image)
 *   <img alt="pesetas">           (currency icon)
 *   <span>{price}</span>          (price text)
 */
function buildShopTriplet(itemName: string, price: string): HTMLElement {
  const wrapper = document.createElement("div");

  const itemImg = document.createElement("img");
  itemImg.alt = itemName;
  itemImg.src = `/images/${itemName.toLowerCase().replace(/\s+/g, "-")}.png`;
  wrapper.appendChild(itemImg);

  const pesetasImg = document.createElement("img");
  pesetasImg.alt = "pesetas";
  pesetasImg.src = "/images/pesetas.png";
  wrapper.appendChild(pesetasImg);

  const priceEl = document.createElement("span");
  priceEl.textContent = price;
  wrapper.appendChild(priceEl);

  return wrapper;
}

describe("price-extractor", () => {
  describe("parsePriceText", () => {
    it("should parse simple price", () => {
      expect(parsePriceText("149")).toBe(149);
    });

    it("should parse European thousands separator", () => {
      expect(parsePriceText("298.200")).toBe(298200);
    });

    it("should parse multiple thousands separators", () => {
      expect(parsePriceText("1.500.000")).toBe(1500000);
    });

    it("should return undefined for empty string", () => {
      expect(parsePriceText("")).toBeUndefined();
    });

    it("should return undefined for non-numeric string", () => {
      expect(parsePriceText("abc")).toBeUndefined();
    });

    it("should strip currency symbols", () => {
      expect(parsePriceText("$1.500")).toBe(1500);
    });
  });

  describe("detectSource", () => {
    it("should detect mercadillo from URL path", () => {
      // happy-dom allows setting location
      const original = window.location.pathname;
      Object.defineProperty(window, "location", {
        value: { ...window.location, pathname: "/g/c/rsn/mercadillo" },
        writable: true,
        configurable: true,
      });

      expect(detectSource()).toBe("mercadillo");

      Object.defineProperty(window, "location", {
        value: { ...window.location, pathname: original },
        writable: true,
        configurable: true,
      });
    });

    it("should detect shop as default", () => {
      Object.defineProperty(window, "location", {
        value: { ...window.location, pathname: "/g/c/rsn/shop" },
        writable: true,
        configurable: true,
      });

      expect(detectSource()).toBe("shop");
    });
  });

  describe("extractPrices", () => {
    it("should extract a single item triplet", () => {
      container.appendChild(buildShopTriplet("light-source", "149"));

      const result = extractPrices();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.itemName).toBe("light-source");
        expect(result.value[0]?.price).toBe(149);
      }
    });

    it("should extract European-formatted price", () => {
      container.appendChild(buildShopTriplet("gold-bar", "298.200"));

      const result = extractPrices();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.price).toBe(298200);
      }
    });

    it("should extract multiple shop items", () => {
      container.appendChild(buildShopTriplet("iron-ore", "50"));
      container.appendChild(buildShopTriplet("coal", "75"));

      const result = extractPrices();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.itemName).toBe("iron-ore");
        expect(result.value[1]?.itemName).toBe("coal");
      }
    });

    it("should generate itemId from item name", () => {
      container.appendChild(buildShopTriplet("Iron Sword", "500"));

      const result = extractPrices();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0]?.itemId).toBe("iron-sword");
      }
    });

    it("should return empty array when no pesetas images exist", () => {
      const div = document.createElement("div");
      div.textContent = "No shop items here";
      container.appendChild(div);

      const result = extractPrices();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should return empty array on empty page", () => {
      const result = extractPrices();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should skip pesetas images without a preceding item image", () => {
      // Only pesetas image, no item image before it
      const pesetasImg = document.createElement("img");
      pesetasImg.alt = "pesetas";
      pesetasImg.src = "/images/pesetas.png";
      const priceSpan = document.createElement("span");
      priceSpan.textContent = "100";
      container.appendChild(pesetasImg);
      container.appendChild(priceSpan);

      const result = extractPrices();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
});
