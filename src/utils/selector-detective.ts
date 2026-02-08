import { createLogger } from "./logger.ts";

const logger = createLogger("selector-detective");

interface SelectorMatch {
  selector: string;
  count: number;
  sampleHtml?: string;
}

/**
 * Tries multiple selector patterns and reports which ones match elements.
 * Useful for debugging when placeholder selectors don't match the actual DOM structure.
 */
export function detectSelectors(
  selectorPatterns: readonly string[],
  options: {
    logResults?: boolean;
    includeSampleHtml?: boolean;
    maxSampleLength?: number;
  } = {},
): readonly SelectorMatch[] {
  const {
    logResults = true,
    includeSampleHtml = false,
    maxSampleLength = 200,
  } = options;

  const results: SelectorMatch[] = [];

  for (const selector of selectorPatterns) {
    try {
      const elements = document.querySelectorAll(selector);
      const match: SelectorMatch = {
        selector,
        count: elements.length,
      };

      if (includeSampleHtml && elements.length > 0) {
        const sampleEl = elements[0];
        if (sampleEl instanceof Element) {
          const html = sampleEl.outerHTML;
          match.sampleHtml =
            html.length > maxSampleLength
              ? `${html.slice(0, maxSampleLength)}...`
              : html;
        }
      }

      results.push(match);

      if (logResults && elements.length > 0) {
        logger.info("Selector matched", match);
      }
    } catch (e: unknown) {
      if (logResults) {
        logger.warn("Invalid selector", { selector, error: String(e) });
      }
    }
  }

  if (logResults) {
    const totalMatches = results.reduce((sum, r) => sum + r.count, 0);
    logger.info("Selector detection complete", {
      patternsChecked: selectorPatterns.length,
      matchingPatterns: results.filter((r) => r.count > 0).length,
      totalElements: totalMatches,
    });
  }

  return results;
}

/**
 * Suggests common selector patterns for job-related elements.
 * Returns array of selectors to try.
 */
export function suggestJobSelectors(): readonly string[] {
  return [
    // Data attribute patterns
    '[data-testid*="job"]',
    '[data-testid*="idle"]',
    '[data-testid*="task"]',
    '[data-job]',
    '[data-job-id]',
    '[data-skill]',

    // Class patterns
    '[class*="job"]',
    '[class*="idle"]',
    '[class*="task"]',
    '[class*="timer"]',
    '[class*="countdown"]',

    // Common game UI patterns
    ".job",
    ".job-item",
    ".idle-job",
    ".active-job",
    ".task",
    ".activity",

    // Generic container patterns
    '[role="listitem"]',
    'li[class*="job"]',
    'div[class*="job"]',
  ] as const;
}

/**
 * Suggests common selector patterns for shop/price elements.
 * Returns array of selectors to try.
 */
export function suggestPriceSelectors(): readonly string[] {
  return [
    // Data attribute patterns
    '[data-testid*="shop"]',
    '[data-testid*="item"]',
    '[data-testid*="market"]',
    '[data-item]',
    '[data-item-id]',
    '[data-price]',

    // Class patterns
    '[class*="shop"]',
    '[class*="item"]',
    '[class*="market"]',
    '[class*="price"]',
    '[class*="mercadillo"]',

    // Common shop UI patterns
    ".shop-item",
    ".market-item",
    ".item",
    ".product",
    ".listing",

    // Generic patterns
    '[role="listitem"]',
    'li[class*="item"]',
    'div[class*="item"]',
  ] as const;
}
