import { handleInstall } from "./install-handler.ts";
import { handleAlarm } from "./alarm-handler.ts";
import { registerMessageHandlers } from "./message-handler.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("background");

chrome.runtime.onInstalled.addListener(handleInstall);
chrome.alarms.onAlarm.addListener((alarm) => {
  handleAlarm(alarm).catch((e: unknown) => {
    logger.error("Alarm handler error", e);
  });
});

registerMessageHandlers();

logger.info("Background service worker started");
