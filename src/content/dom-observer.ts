import { extractActiveJobs } from "./job-extractor.ts";
import { extractPrices } from "./price-extractor.ts";
import { processAddedNode } from "./session-tracker.ts";
import { checkUrlChange, isModuleActive, onRouteChange } from "./page-router.ts";
import { sendMessage } from "../utils/messages.ts";
import { createLogger } from "../utils/logger.ts";
import {
  detectSelectors,
  detectTextPatterns,
  suggestJobSelectors,
  suggestPriceSelectors,
} from "../utils/selector-detective.ts";

const logger = createLogger("dom-observer");

const NORMAL_DEBOUNCE_MS = 500;
const BACKOFF_DEBOUNCE_MS = 10_000;
const BACKOFF_THRESHOLD = 3;

let jobDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let priceDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let activeObserver: MutationObserver | null = null;
let routeUnsubscribe: (() => void) | null = null;

const knownJobIds = new Set<string>();
const lastKnownPrices = new Map<string, number>();

let jobEmptyCount = 0;
let priceEmptyCount = 0;
let jobDebounceMs = NORMAL_DEBOUNCE_MS;
let priceDebounceMs = NORMAL_DEBOUNCE_MS;

let jobHasLoggedFirstSuccess = false;
let jobHasLoggedFirstEmpty = false;
let priceHasLoggedFirstSuccess = false;
let priceHasLoggedFirstEmpty = false;

function resetExtractionState(): void {
  jobEmptyCount = 0;
  priceEmptyCount = 0;
  jobDebounceMs = NORMAL_DEBOUNCE_MS;
  priceDebounceMs = NORMAL_DEBOUNCE_MS;

  jobHasLoggedFirstSuccess = false;
  jobHasLoggedFirstEmpty = false;
  priceHasLoggedFirstSuccess = false;
  priceHasLoggedFirstEmpty = false;

  knownJobIds.clear();
  lastKnownPrices.clear();

  if (jobDebounceTimer) {
    clearTimeout(jobDebounceTimer);
    jobDebounceTimer = null;
  }
  if (priceDebounceTimer) {
    clearTimeout(priceDebounceTimer);
    priceDebounceTimer = null;
  }
}

function processJobChanges(): void {
  if (!isModuleActive("jobs")) return;

  const result = extractActiveJobs();
  if (!result.ok) return;

  if (result.value.length === 0) {
    jobEmptyCount += 1;
    if (!jobHasLoggedFirstEmpty) {
      jobHasLoggedFirstEmpty = true;
      logger.info("No jobs found on page");
    }
    if (jobEmptyCount >= BACKOFF_THRESHOLD) {
      jobDebounceMs = BACKOFF_DEBOUNCE_MS;
    }
    return;
  }

  jobEmptyCount = 0;
  jobDebounceMs = NORMAL_DEBOUNCE_MS;

  if (!jobHasLoggedFirstSuccess) {
    jobHasLoggedFirstSuccess = true;
    logger.info("Jobs detected", { count: result.value.length });
  } else {
    logger.debug("Jobs detected", { count: result.value.length });
  }

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
  if (!isModuleActive("prices")) return;

  const result = extractPrices();
  if (!result.ok) return;

  if (result.value.length === 0) {
    priceEmptyCount += 1;
    if (!priceHasLoggedFirstEmpty) {
      priceHasLoggedFirstEmpty = true;
      logger.info("No prices found on page");
    }
    if (priceEmptyCount >= BACKOFF_THRESHOLD) {
      priceDebounceMs = BACKOFF_DEBOUNCE_MS;
    }
    return;
  }

  priceEmptyCount = 0;
  priceDebounceMs = NORMAL_DEBOUNCE_MS;

  const changedSnapshots = result.value.filter((snapshot) => {
    const previous = lastKnownPrices.get(snapshot.itemId);
    return previous !== snapshot.price;
  });

  for (const snapshot of result.value) {
    lastKnownPrices.set(snapshot.itemId, snapshot.price);
  }

  if (changedSnapshots.length === 0) {
    logger.debug("Prices unchanged, skipping send");
    return;
  }

  if (!priceHasLoggedFirstSuccess) {
    priceHasLoggedFirstSuccess = true;
    logger.info("Prices detected", { count: changedSnapshots.length });
  } else {
    logger.debug("Prices detected", { count: changedSnapshots.length });
  }

  for (const snapshot of changedSnapshots) {
    sendMessage({ type: "PRICE_SNAPSHOT", snapshot }).catch((e: unknown) => {
      logger.error("Failed to send price snapshot", e);
    });
  }
}

function handleMutations(mutations: readonly MutationRecord[]): void {
  checkUrlChange();

  let hasNewNodes = false;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      hasNewNodes = true;
      processAddedNode(node);
    }
  }

  if (!hasNewNodes) return;

  if (isModuleActive("jobs")) {
    if (jobDebounceTimer) clearTimeout(jobDebounceTimer);
    jobDebounceTimer = setTimeout(processJobChanges, jobDebounceMs);
  }

  if (isModuleActive("prices")) {
    if (priceDebounceTimer) clearTimeout(priceDebounceTimer);
    priceDebounceTimer = setTimeout(processPriceChanges, priceDebounceMs);
  }
}

export function stopObserver(): void {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
    logger.info("DOM observer stopped");
  }
  if (routeUnsubscribe) {
    routeUnsubscribe();
    routeUnsubscribe = null;
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

  // Seed the initial route before subscribing to changes
  checkUrlChange();

  routeUnsubscribe = onRouteChange(() => {
    logger.debug("Route changed, resetting extraction state");
    resetExtractionState();
  });

  const observer = new MutationObserver(handleMutations);
  activeObserver = observer;

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  logger.info("DOM observer started");

  // Run initial extraction only for active modules
  if (isModuleActive("jobs")) {
    processJobChanges();
  }
  if (isModuleActive("prices")) {
    processPriceChanges();
  }

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
