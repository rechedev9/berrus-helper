import { describe, it, expect } from "bun:test";
import { extractPrices } from "./price-extractor.ts";

function buildShopItem(
  name: string,
  price: string,
  itemId?: string,
): HTMLElement {
  const container = document.createElement("div");
  container.className = "shop-item";
  if (itemId) container.setAttribute("data-item-id", itemId);

  const nameEl = document.createElement("span");
  nameEl.className = "item-name";
  nameEl.textContent = name;

  const priceEl = document.createElement("span");
  priceEl.className = "item-price";
  priceEl.textContent = price;

  container.appendChild(nameEl);
  container.appendChild(priceEl);

  return container;
}

describe("price-extractor", () => {
  describe("extractPrices", () => {
    it("should extract item name and price from DOM", () => {
      const container = document.createElement("div");
      container.appendChild(buildShopItem("Iron Ore", "150", "iron-ore"));
      document.body.appendChild(container);

      const result = extractPrices();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.itemName).toBe("Iron Ore");
        expect(result.value[0]?.price).toBe(150);
        expect(result.value[0]?.itemId).toBe("iron-ore");
      }

      document.body.removeChild(container);
    });

    it("should detect mercadillo source when inside market container", () => {
      const market = document.createElement("div");
      market.className = "mercadillo";
      market.appendChild(buildShopItem("Gold Bar", "1000", "gold"));
      document.body.appendChild(market);

      const result = extractPrices();

      if (result.ok && result.value[0]) {
        expect(result.value[0].source).toBe("mercadillo");
      }

      document.body.removeChild(market);
    });

    it("should default to shop source", () => {
      const container = document.createElement("div");
      container.appendChild(buildShopItem("Potion", "50", "potion"));
      document.body.appendChild(container);

      const result = extractPrices();

      if (result.ok && result.value[0]) {
        expect(result.value[0].source).toBe("shop");
      }

      document.body.removeChild(container);
    });

    it("should generate itemId from name when data-item-id is missing", () => {
      const container = document.createElement("div");
      container.appendChild(buildShopItem("Iron Sword", "500"));
      document.body.appendChild(container);

      const result = extractPrices();

      if (result.ok && result.value[0]) {
        expect(result.value[0].itemId).toBe("iron-sword");
      }

      document.body.removeChild(container);
    });

    it("should return empty array when no shop items exist", () => {
      const result = extractPrices();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
});
