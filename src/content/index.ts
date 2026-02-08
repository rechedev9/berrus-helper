import { onInterceptedResponse } from "../utils/network-interceptor.ts";
import { handleInterceptedResponse } from "./network-handler.ts";
import { startObserver, stopObserver } from "./dom-observer.ts";
import { sendMessage } from "../utils/messages.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("content");

let initialized = false;

function init(): void {
  if (initialized) {
    logger.info("Content script already initialized, re-initializing");
    stopObserver();
  }
  initialized = true;

  logger.info("Berrus Helper content script initializing");

  // Listen for intercepted API responses (interceptor runs via manifest "world": "MAIN")
  onInterceptedResponse(handleInterceptedResponse);

  // Start DOM observation for game events
  startObserver();

  // Notify background that content script is ready
  sendMessage({ type: "CONTENT_SCRIPT_READY" }).catch((e: unknown) => {
    logger.error("Failed to send ready message", e);
  });

  logger.info("Berrus Helper content script initialized");
}

init();
