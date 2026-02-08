/**
 * Content-based DOM traversal utilities.
 *
 * berrus.app uses React + Tailwind with no semantic CSS classes,
 * so we locate elements by their text content, image attributes,
 * and structural relationships instead of class selectors.
 */

/**
 * Find all elements whose **direct** textContent matches `pattern`.
 * Uses TreeWalker for performance on large subtrees.
 */
export function findElementsByText(
  pattern: RegExp,
  root: Node = document.body,
): readonly Element[] {
  const results: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let current = walker.nextNode();
  while (current) {
    if (current instanceof Element) {
      const text = current.textContent?.trim();
      if (text && pattern.test(text)) {
        results.push(current);
      }
    }
    current = walker.nextNode();
  }

  return results;
}

/**
 * Find `<img>` elements whose `alt` or `src` attribute matches `pattern`.
 */
export function findImagesByAttribute(
  pattern: RegExp,
  root: Node = document.body,
): readonly HTMLImageElement[] {
  const results: HTMLImageElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let current = walker.nextNode();
  while (current) {
    if (current instanceof HTMLImageElement) {
      const alt = current.alt ?? "";
      const src = current.src ?? "";
      if (pattern.test(alt) || pattern.test(src)) {
        results.push(current);
      }
    }
    current = walker.nextNode();
  }

  return results;
}

const DEFAULT_MAX_DEPTH = 8;

/**
 * Walk up from `el` through ancestors until `predicate` matches.
 * Returns `undefined` if no match is found within `maxDepth` levels.
 */
export function findAncestor(
  el: Element,
  predicate: (ancestor: Element) => boolean,
  maxDepth: number = DEFAULT_MAX_DEPTH,
): Element | undefined {
  let current: Element | null = el.parentElement;
  let depth = 0;

  while (current && depth < maxDepth) {
    if (predicate(current)) return current;
    current = current.parentElement;
    depth += 1;
  }

  return undefined;
}

/**
 * Walk forward from `el` through its **next siblings** (and their first text
 * child) to find the next node that contains non-empty text.
 * Returns the trimmed text content, or `undefined` if nothing is found.
 */
export function findNextTextContent(el: Node): string | undefined {
  let sibling = el.nextSibling;

  while (sibling) {
    if (sibling instanceof Text) {
      const text = sibling.textContent?.trim();
      if (text) return text;
    }
    if (sibling instanceof Element) {
      const text = sibling.textContent?.trim();
      if (text) return text;
    }
    sibling = sibling.nextSibling;
  }

  // Also check parent's next sibling (pesetas img may be wrapped in a span)
  if (el.parentElement) {
    let parentSibling = el.parentElement.nextSibling;
    while (parentSibling) {
      if (parentSibling instanceof Text) {
        const text = parentSibling.textContent?.trim();
        if (text) return text;
      }
      if (parentSibling instanceof Element) {
        const text = parentSibling.textContent?.trim();
        if (text) return text;
      }
      parentSibling = parentSibling.nextSibling;
    }
  }

  return undefined;
}

/**
 * Walk backward through `el`'s preceding siblings to find the closest
 * element with the given `tagName`.
 */
export function findPreviousElementByTag(
  el: Node,
  tagName: string,
): Element | undefined {
  const upperTag = tagName.toUpperCase();
  let sibling = el.previousSibling;

  while (sibling) {
    if (
      sibling instanceof Element &&
      sibling.tagName.toUpperCase() === upperTag
    ) {
      return sibling;
    }
    sibling = sibling.previousSibling;
  }

  // Also check parent's previous sibling (in case of wrapper elements)
  if (el.parentElement) {
    let parentSibling = el.parentElement.previousSibling;
    while (parentSibling) {
      if (parentSibling instanceof Element) {
        if (parentSibling.tagName.toUpperCase() === upperTag) {
          return parentSibling;
        }
        // Check last child of preceding element
        const nested = parentSibling.querySelector(tagName);
        if (nested) return nested;
      }
      parentSibling = parentSibling.previousSibling;
    }
  }

  return undefined;
}
