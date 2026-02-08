import { describe, it, expect } from "bun:test";
import { ok, err, isOk, isErr, unwrap, mapResult } from "./result.ts";

describe("Result", () => {
  describe("ok", () => {
    it("should create an Ok result", () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect((result as { ok: true; value: number }).value).toBe(42);
    });
  });

  describe("err", () => {
    it("should create an Err result", () => {
      const result = err("something failed");
      expect(result.ok).toBe(false);
      expect((result as { ok: false; error: string }).error).toBe("something failed");
    });
  });

  describe("isOk", () => {
    it("should return true for Ok results", () => {
      expect(isOk(ok(1))).toBe(true);
    });

    it("should return false for Err results", () => {
      expect(isOk(err("fail"))).toBe(false);
    });
  });

  describe("isErr", () => {
    it("should return true for Err results", () => {
      expect(isErr(err("fail"))).toBe(true);
    });

    it("should return false for Ok results", () => {
      expect(isErr(ok(1))).toBe(false);
    });
  });

  describe("unwrap", () => {
    it("should return the value for Ok results", () => {
      expect(unwrap(ok("hello"))).toBe("hello");
    });

    it("should throw for Err results", () => {
      expect(() => unwrap(err("oops"))).toThrow();
    });
  });

  describe("mapResult", () => {
    it("should transform the value of an Ok result", () => {
      const result = mapResult(ok(5), (n) => n * 2);
      expect(result.ok).toBe(true);
      expect((result as { ok: true; value: number }).value).toBe(10);
    });

    it("should pass through Err results unchanged", () => {
      const result = mapResult(err("fail"), (n: number) => n * 2);
      expect(result.ok).toBe(false);
      expect((result as { ok: false; error: string }).error).toBe("fail");
    });
  });
});
