import { findElementsByText, findImagesByAttribute } from "./dom-walker.ts";
import { createLogger } from "./logger.ts";

const logger = createLogger("selector-detective");

interface SelectorMatch {
  selector: string;
  count: number;
  sampleHtml?: string;
}

interface TextPatternMatch {
  readonly label: string;
  readonly pattern: string;
  readonly count: number;
  readonly sampleText?: string;
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
 * Detects content-based patterns (text, images) used by the rewritten extractors.
 * Reports which patterns currently match elements on the page.
 */
export function detectTextPatterns(): readonly TextPatternMatch[] {
  const results: TextPatternMatch[] = [];

  const patterns: readonly {
    readonly label: string;
    readonly pattern: RegExp;
    readonly type: "text" | "image";
  }[] = [
    { label: "Timer (MM:SS / HH:MM:SS)", pattern: /(\d+:)?\d+:\d{2}(?:\s*remaining)?/, type: "text" },
    { label: "Progress (%)", pattern: /^\d{1,3}%$/, type: "text" },
    { label: "XP gain (+N XP)", pattern: /\+?([\d,]+)\s*(?:xp|exp)/i, type: "text" },
    { label: "Item received", pattern: /received\s+.+/i, type: "text" },
    { label: "Item collected", pattern: /collected\s+.+/i, type: "text" },
    { label: "Combat (victory/defeated)", pattern: /victory|defeated/i, type: "text" },
    { label: "Combat (death/died)", pattern: /death|died/i, type: "text" },
    { label: "Pesetas currency image", pattern: /pesetas/i, type: "image" },
    { label: "Skill link", pattern: /\/character\/skills\/[a-z]+/i, type: "text" },
  ];

  for (const { label, pattern, type } of patterns) {
    if (type === "text") {
      const elements = findElementsByText(pattern);
      const sampleText =
        elements.length > 0
          ? elements[0]?.textContent?.trim()?.slice(0, 100)
          : undefined;
      const match: TextPatternMatch = {
        label,
        pattern: pattern.source,
        count: elements.length,
        sampleText,
      };
      results.push(match);

      if (elements.length > 0) {
        logger.info("Text pattern matched", match);
      }
    } else {
      const images = findImagesByAttribute(pattern);
      const img = images.length > 0 ? images[0] : undefined;
      const sampleText = img
        ? `alt="${img.alt ?? ""}" src="${img.src ?? ""}"`
        : undefined;
      const match: TextPatternMatch = {
        label,
        pattern: pattern.source,
        count: images.length,
        sampleText,
      };
      results.push(match);

      if (images.length > 0) {
        logger.info("Image pattern matched", match);
      }
    }
  }

  const totalMatches = results.reduce((sum, r) => sum + r.count, 0);
  logger.info("Text pattern detection complete", {
    patternsChecked: results.length,
    matchingPatterns: results.filter((r) => r.count > 0).length,
    totalElements: totalMatches,
  });

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

    // Skill links (content-based approach)
    'a[href*="/character/skills/"]',

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

    // Image-based patterns (content-based approach)
    'img[alt*="pesetas"]',
    'img[src*="pesetas"]',

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
