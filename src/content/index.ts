import { installNetworkInterceptor, onInterceptedResponse } from "../utils/network-interceptor.ts";
import { handleInterceptedResponse } from "./network-handler.ts";
import { startObserver } from "./dom-observer.ts";
import { sendMessage } from "../utils/messages.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("content");

function init(): void {
  logger.info("Berrus Helper content script initializing");

  // Install network interceptor in the main world
  installNetworkInterceptor();

  // Listen for intercepted API responses
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
