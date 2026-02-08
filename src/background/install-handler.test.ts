import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  installMockChrome,
  type ChromeMockHandle,
} from "../test-utils/chrome-mock.ts";
import { handleInstall } from "./install-handler.ts";
import { DEFAULT_STORAGE } from "../types/storage.ts";

let handle: ChromeMockHandle;

beforeEach(() => {
  handle = installMockChrome();
});

afterEach(() => {
  handle.reset();
});

describe("install-handler", () => {
  describe("handleInstall", () => {
    it("should set DEFAULT_STORAGE on install", async () => {
      handleInstall({ reason: "install" });

      // setStorage is async inside handleInstall (fire-and-forget .then)
      // Give it a tick to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      const data = handle.getStorageData();
      expect(data["settings"]).toEqual(DEFAULT_STORAGE.settings);
      expect(data["jobTimers"]).toEqual(DEFAULT_STORAGE.jobTimers);
      expect(data["priceHistories"]).toEqual(DEFAULT_STORAGE.priceHistories);
      expect(data["currentSession"]).toBeNull();
    });

    it("should not set storage on update", async () => {
      handleInstall({ reason: "update", previousVersion: "1.0.0" });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const data = handle.getStorageData();
      expect(Object.keys(data)).toHaveLength(0);
    });
  });
});
