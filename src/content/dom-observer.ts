import { extractActiveJobs } from "./job-extractor.ts";
import { extractPrices } from "./price-extractor.ts";
import { processAddedNode } from "./session-tracker.ts";
import { sendMessage } from "../utils/messages.ts";
import { createLogger } from "../utils/logger.ts";
import {
  detectSelectors,
  detectTextPatterns,
  suggestJobSelectors,
  suggestPriceSelectors,
} from "../utils/selector-detective.ts";

const logger = createLogger("dom-observer");

const DEBOUNCE_MS = 500;

let jobDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let priceDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let activeObserver: MutationObserver | null = null;

const knownJobIds = new Set<string>();

function processJobChanges(): void {
  const result = extractActiveJobs();
  if (!result.ok) return;

  for (const job of result.value) {
    if (!knownJobIds.has(job.id)) {
      knownJobIds.add(job.id);
      sendMessage({ type: "JOB_DETECTED", job }).catch((e: unknown) => {
        logger.error("Failed to send job detected", e);
      });
    }
  }
}

function processPriceChanges(): void {
  const result = extractPrices();
  if (!result.ok) return;

  for (const snapshot of result.value) {
    sendMessage({ type: "PRICE_SNAPSHOT", snapshot }).catch((e: unknown) => {
      logger.error("Failed to send price snapshot", e);
    });
  }
}

function handleMutations(mutations: readonly MutationRecord[]): void {
  let hasNewNodes = false;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      hasNewNodes = true;
      processAddedNode(node);
    }
  }

  if (!hasNewNodes) return;

  // Debounce job extraction
  if (jobDebounceTimer) clearTimeout(jobDebounceTimer);
  jobDebounceTimer = setTimeout(processJobChanges, DEBOUNCE_MS);

  // Debounce price extraction
  if (priceDebounceTimer) clearTimeout(priceDebounceTimer);
  priceDebounceTimer = setTimeout(processPriceChanges, DEBOUNCE_MS);
}

export function stopObserver(): void {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
    logger.info("DOM observer stopped");
  }
  if (jobDebounceTimer) {
    clearTimeout(jobDebounceTimer);
    jobDebounceTimer = null;
  }
  if (priceDebounceTimer) {
    clearTimeout(priceDebounceTimer);
    priceDebounceTimer = null;
  }
}

export function startObserver(): MutationObserver {
  stopObserver();

  const observer = new MutationObserver(handleMutations);
  activeObserver = observer;

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  logger.info("DOM observer started");

  // Run initial extraction
  processJobChanges();
  processPriceChanges();

  return observer;
}

/**
 * Debug helper: Run selector detection to identify potential selectors.
 * Call this from browser console: `window.__debugSelectors()`
 */
export function runSelectorDetection(): void {
  logger.info("=== SELECTOR DETECTION STARTED ===");

  logger.info("--- Checking job selectors ---");
  detectSelectors(suggestJobSelectors(), { includeSampleHtml: true });

  logger.info("--- Checking price selectors ---");
  detectSelectors(suggestPriceSelectors(), { includeSampleHtml: true });

  logger.info("--- Checking content-based text patterns ---");
  detectTextPatterns();

  logger.info("=== SELECTOR DETECTION COMPLETE ===");
  logger.info(
    "Check console logs above to see which selectors and patterns matched elements",
  );
}
