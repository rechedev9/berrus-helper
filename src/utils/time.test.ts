import { describe, it, expect } from "bun:test";
import { formatCountdown, formatDuration, getRemainingMs } from "./time.ts";

describe("formatCountdown", () => {
  it("should return 'Done!' for zero or negative values", () => {
    expect(formatCountdown(0)).toBe("Done!");
    expect(formatCountdown(-1000)).toBe("Done!");
  });

  it("should format seconds only", () => {
    expect(formatCountdown(5000)).toBe("5s");
    expect(formatCountdown(45000)).toBe("45s");
  });

  it("should format minutes and seconds", () => {
    expect(formatCountdown(90000)).toBe("1m 30s");
    expect(formatCountdown(601000)).toBe("10m 01s");
  });

  it("should format hours, minutes, and seconds", () => {
    expect(formatCountdown(3661000)).toBe("1h 01m 01s");
    expect(formatCountdown(7200000)).toBe("2h 00m 00s");
  });
});

describe("formatDuration", () => {
  it("should format minutes only for short durations", () => {
    expect(formatDuration(300000)).toBe("5m");
  });

  it("should format hours and minutes for long durations", () => {
    expect(formatDuration(5400000)).toBe("1h 30m");
  });
});

describe("getRemainingMs", () => {
  it("should return positive value for future timestamps", () => {
    const future = Date.now() + 10000;
    const result = getRemainingMs(future);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(10000);
  });

  it("should return 0 for past timestamps", () => {
    const past = Date.now() - 10000;
    expect(getRemainingMs(past)).toBe(0);
  });
});
