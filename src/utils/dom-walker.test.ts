import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  findElementsByText,
  findImagesByAttribute,
  findAncestor,
  findNextTextContent,
  findPreviousElementByTag,
} from "./dom-walker.ts";

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
});

describe("dom-walker", () => {
  describe("findElementsByText", () => {
    it("should find elements matching a text pattern", () => {
      const span = document.createElement("span");
      span.textContent = "14:01 remaining";
      container.appendChild(span);

      const results = findElementsByText(/\d+:\d{2}\s*remaining/, container);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((el) => el.textContent === "14:01 remaining")).toBe(true);
    });

    it("should return empty array when nothing matches", () => {
      const span = document.createElement("span");
      span.textContent = "no timer here";
      container.appendChild(span);

      const results = findElementsByText(/\d+:\d{2}/, container);

      expect(results).toHaveLength(0);
    });

    it("should find nested elements", () => {
      const outer = document.createElement("div");
      const inner = document.createElement("span");
      inner.textContent = "5:30";
      outer.appendChild(inner);
      container.appendChild(outer);

      const results = findElementsByText(/\d+:\d{2}/, container);

      expect(results.some((el) => el.textContent === "5:30")).toBe(true);
    });

    it("should work with empty DOM", () => {
      const results = findElementsByText(/anything/, container);

      expect(results).toHaveLength(0);
    });
  });

  describe("findImagesByAttribute", () => {
    it("should find images by alt attribute", () => {
      const img = document.createElement("img");
      img.alt = "pesetas";
      img.src = "coin.png";
      container.appendChild(img);

      const results = findImagesByAttribute(/pesetas/i, container);

      expect(results).toHaveLength(1);
      expect(results[0]?.alt).toBe("pesetas");
    });

    it("should find images by src attribute", () => {
      const img = document.createElement("img");
      img.alt = "";
      img.src = "/images/pesetas-icon.png";
      container.appendChild(img);

      const results = findImagesByAttribute(/pesetas/i, container);

      expect(results).toHaveLength(1);
    });

    it("should return empty when no images match", () => {
      const img = document.createElement("img");
      img.alt = "sword";
      img.src = "sword.png";
      container.appendChild(img);

      const results = findImagesByAttribute(/pesetas/i, container);

      expect(results).toHaveLength(0);
    });
  });

  describe("findAncestor", () => {
    it("should find matching ancestor", () => {
      const grandparent = document.createElement("section");
      grandparent.setAttribute("data-type", "job");
      const parent = document.createElement("div");
      const child = document.createElement("span");

      grandparent.appendChild(parent);
      parent.appendChild(child);
      container.appendChild(grandparent);

      const result = findAncestor(
        child,
        (el) => el.getAttribute("data-type") === "job",
      );

      expect(result).toBe(grandparent);
    });

    it("should return undefined when no ancestor matches", () => {
      const parent = document.createElement("div");
      const child = document.createElement("span");
      parent.appendChild(child);
      container.appendChild(parent);

      const result = findAncestor(child, () => false);

      expect(result).toBeUndefined();
    });

    it("should respect maxDepth limit", () => {
      const deep = document.createElement("div");
      deep.id = "target";
      let current: HTMLElement = deep;
      for (let i = 0; i < 10; i++) {
        const wrapper = document.createElement("div");
        wrapper.appendChild(current);
        current = wrapper;
      }
      container.appendChild(current);

      const innermost = deep;
      const result = findAncestor(
        innermost,
        (el) => el.id === "target",
        3,
      );

      expect(result).toBeUndefined();
    });
  });

  describe("findNextTextContent", () => {
    it("should find text in next sibling element", () => {
      const first = document.createElement("img");
      first.alt = "pesetas";
      const second = document.createElement("span");
      second.textContent = "149";
      container.appendChild(first);
      container.appendChild(second);

      const result = findNextTextContent(first);

      expect(result).toBe("149");
    });

    it("should find text in next text node sibling", () => {
      const el = document.createElement("span");
      el.textContent = "icon";
      const textNode = document.createTextNode("250");
      container.appendChild(el);
      container.appendChild(textNode);

      const result = findNextTextContent(el);

      expect(result).toBe("250");
    });

    it("should return undefined when no next text exists", () => {
      const el = document.createElement("span");
      el.textContent = "alone";
      container.appendChild(el);

      const result = findNextTextContent(el);

      expect(result).toBeUndefined();
    });

    it("should skip empty text siblings", () => {
      const first = document.createElement("img");
      const emptySpan = document.createElement("span");
      emptySpan.textContent = "";
      const textSpan = document.createElement("span");
      textSpan.textContent = "500";
      container.appendChild(first);
      container.appendChild(emptySpan);
      container.appendChild(textSpan);

      const result = findNextTextContent(first);

      expect(result).toBe("500");
    });
  });

  describe("findPreviousElementByTag", () => {
    it("should find previous sibling IMG element", () => {
      const itemImg = document.createElement("img");
      itemImg.alt = "light-source";
      const pesetasImg = document.createElement("img");
      pesetasImg.alt = "pesetas";
      container.appendChild(itemImg);
      container.appendChild(pesetasImg);

      const result = findPreviousElementByTag(pesetasImg, "IMG");

      expect(result).toBe(itemImg);
    });

    it("should return undefined when no previous sibling of tag exists", () => {
      const span = document.createElement("span");
      span.textContent = "text";
      const img = document.createElement("img");
      img.alt = "pesetas";
      container.appendChild(span);
      container.appendChild(img);

      const result = findPreviousElementByTag(img, "IMG");

      expect(result).toBeUndefined();
    });

    it("should walk past non-matching siblings to find preceding IMG", () => {
      const itemImg = document.createElement("img");
      itemImg.alt = "sword";
      const span = document.createElement("span");
      span.textContent = "between";
      const pesetasImg = document.createElement("img");
      pesetasImg.alt = "pesetas";
      container.appendChild(itemImg);
      container.appendChild(span);
      container.appendChild(pesetasImg);

      const result = findPreviousElementByTag(pesetasImg, "IMG");

      expect(result).toBe(itemImg);
    });
  });
});
