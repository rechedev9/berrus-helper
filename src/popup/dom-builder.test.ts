import { describe, it, expect } from "bun:test";
import { el, clearChildren } from "./dom-builder.ts";

describe("el", () => {
  it("should create an element with the given tag", () => {
    const div = el("div");
    expect(div.tagName).toBe("DIV");
  });

  it("should set className", () => {
    const div = el("div", { className: "test-class" });
    expect(div.className).toBe("test-class");
  });

  it("should set id", () => {
    const div = el("div", { id: "test-id" });
    expect(div.id).toBe("test-id");
  });

  it("should set textContent", () => {
    const span = el("span", { textContent: "hello" });
    expect(span.textContent).toBe("hello");
  });

  it("should set attributes", () => {
    const input = el("input", { attributes: { type: "text", placeholder: "name" } });
    expect(input.getAttribute("type")).toBe("text");
    expect(input.getAttribute("placeholder")).toBe("name");
  });

  it("should append child elements", () => {
    const parent = el("div", {
      children: [el("span", { textContent: "child" })],
    });
    expect(parent.children.length).toBe(1);
    expect(parent.children[0]?.tagName).toBe("SPAN");
  });

  it("should append text children", () => {
    const parent = el("p", { children: ["hello world"] });
    expect(parent.textContent).toBe("hello world");
  });
});

describe("clearChildren", () => {
  it("should remove all children from an element", () => {
    const parent = el("div", {
      children: [
        el("span", { textContent: "a" }),
        el("span", { textContent: "b" }),
      ],
    });
    expect(parent.children.length).toBe(2);

    clearChildren(parent);
    expect(parent.children.length).toBe(0);
  });
});
