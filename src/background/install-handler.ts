import { DEFAULT_STORAGE } from "../types/storage.ts";
import { setStorage } from "../utils/storage.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("install-handler");

interface InstallDetails {
  readonly reason: string;
  readonly previousVersion?: string;
}

export function handleInstall(details: InstallDetails): void {
  if (details.reason === "install") {
    logger.info("Extension installed, setting defaults");
    setStorage(DEFAULT_STORAGE).then((result) => {
      if (result.ok) {
        logger.info("Default storage values set");
      } else {
        logger.error("Failed to set defaults", result.error);
      }
    });
  } else if (details.reason === "update") {
    logger.info("Extension updated", { previousVersion: details.previousVersion });
  }
}
