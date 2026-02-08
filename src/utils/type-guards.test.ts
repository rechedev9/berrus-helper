import { describe, it, expect } from "bun:test";
import {
  isSkillName,
  isIdleJobData,
  isPriceSnapshotData,
  isSessionEventData,
  isExtensionMessage,
  isInterceptedMessage,
} from "./type-guards.ts";

describe("isSkillName", () => {
  it("should return true for valid skill names", () => {
    expect(isSkillName("Mineria")).toBe(true);
    expect(isSkillName("Combate")).toBe(true);
    expect(isSkillName("Pesca")).toBe(true);
  });

  it("should return false for invalid skill names", () => {
    expect(isSkillName("InvalidSkill")).toBe(false);
    expect(isSkillName("")).toBe(false);
    expect(isSkillName(42)).toBe(false);
    expect(isSkillName(null)).toBe(false);
  });
});

describe("isIdleJobData", () => {
  it("should return true for valid idle job data", () => {
    expect(
      isIdleJobData({
        id: "job-1",
        skill: "Mineria",
        name: "Mine Iron",
        startedAt: 1000,
        durationMs: 5000,
        endsAt: 6000,
      }),
    ).toBe(true);
  });

  it("should return false for missing fields", () => {
    expect(isIdleJobData({ id: "job-1" })).toBe(false);
    expect(isIdleJobData(null)).toBe(false);
    expect(isIdleJobData("not an object")).toBe(false);
  });

  it("should return false for invalid skill name", () => {
    expect(
      isIdleJobData({
        id: "job-1",
        skill: "NotASkill",
        name: "Mine Iron",
        startedAt: 1000,
        durationMs: 5000,
        endsAt: 6000,
      }),
    ).toBe(false);
  });
});

describe("isPriceSnapshotData", () => {
  it("should return true for valid shop snapshot", () => {
    expect(
      isPriceSnapshotData({
        itemId: "iron-ore",
        itemName: "Iron Ore",
        price: 150,
        timestamp: Date.now(),
        source: "shop",
      }),
    ).toBe(true);
  });

  it("should return true for valid mercadillo snapshot", () => {
    expect(
      isPriceSnapshotData({
        itemId: "iron-ore",
        itemName: "Iron Ore",
        price: 150,
        timestamp: Date.now(),
        source: "mercadillo",
      }),
    ).toBe(true);
  });

  it("should return false for invalid source", () => {
    expect(
      isPriceSnapshotData({
        itemId: "iron-ore",
        itemName: "Iron Ore",
        price: 150,
        timestamp: Date.now(),
        source: "invalid",
      }),
    ).toBe(false);
  });
});

describe("isSessionEventData", () => {
  it("should return true for valid session event", () => {
    expect(
      isSessionEventData({
        type: "xp_gained",
        timestamp: Date.now(),
        data: { skill: "Mineria", xp: 100 },
      }),
    ).toBe(true);
  });

  it("should return false for invalid event type", () => {
    expect(
      isSessionEventData({
        type: "invalid_type",
        timestamp: Date.now(),
        data: {},
      }),
    ).toBe(false);
  });
});

describe("isExtensionMessage", () => {
  it("should return true for valid extension messages", () => {
    expect(isExtensionMessage({ type: "GET_TIMERS" })).toBe(true);
    expect(isExtensionMessage({ type: "CONTENT_SCRIPT_READY" })).toBe(true);
  });

  it("should return false for invalid messages", () => {
    expect(isExtensionMessage({ type: "INVALID_TYPE" })).toBe(false);
    expect(isExtensionMessage(null)).toBe(false);
    expect(isExtensionMessage(42)).toBe(false);
  });
});

describe("isInterceptedMessage", () => {
  it("should return true for intercepted messages", () => {
    expect(
      isInterceptedMessage({
        source: "berrus-helper",
        payload: { type: "fetch", url: "/api/test", status: 200, body: "{}" },
      }),
    ).toBe(true);
  });

  it("should return false for non-intercepted messages", () => {
    expect(isInterceptedMessage({ source: "other", payload: {} })).toBe(false);
    expect(isInterceptedMessage(null)).toBe(false);
  });
});
