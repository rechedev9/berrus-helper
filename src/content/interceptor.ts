/**
 * Main-world interceptor script.
 * Runs in the page context via manifest "world": "MAIN" to intercept
 * fetch and XHR responses from the Berrus API.
 */
const SOURCE_ID = "berrus-helper";
const ALLOWED_ORIGIN = "https://www.berrus.app";

function isAllowedUrl(url: string): boolean {
  try {
    return new URL(url, window.location.origin).origin === ALLOWED_ORIGIN;
  } catch {
    return false;
  }
}

function postIntercepted(
  type: "fetch" | "xhr",
  url: string,
  status: number,
  body: string,
): void {
  if (!isAllowedUrl(url)) return;
  window.postMessage(
    { source: SOURCE_ID, payload: { type, url, status, body } },
    window.location.origin,
  );
}

// --- Fetch monkey-patch ---
const originalFetch = window.fetch;

// TS limitation: newer DOM types add static methods (preconnect) to fetch,
// making direct reassignment fail. Object.defineProperty bypasses this.
Object.defineProperty(window, "fetch", {
  configurable: true,
  writable: true,
  value: async function patchedFetch(
    ...args: Parameters<typeof fetch>
  ): Promise<Response> {
    const response = await originalFetch.apply(window, args);
    try {
      const input = args[0];
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input instanceof Request
              ? input.url
              : String(input);
      const clone = response.clone();
      clone
        .text()
        .then((body) => {
          postIntercepted("fetch", url, response.status, body);
        })
        .catch(() => {});
    } catch {
      // Swallow — never break the page
    }
    return response;
  },
});

// --- XHR monkey-patch ---
const XHROpen = XMLHttpRequest.prototype.open;
const XHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function patchedOpen(
  method: string,
  url: string | URL,
  ...rest: [boolean?, string?, string?]
): void {
  (this as XMLHttpRequest & { _berrusUrl: string })._berrusUrl =
    typeof url === "string" ? url : url.toString();
  XHROpen.apply(this, [method, url, ...rest] as Parameters<typeof XHROpen>);
};

XMLHttpRequest.prototype.send = function patchedSend(
  ...args: Parameters<typeof XHRSend>
): void {
  this.addEventListener("load", function onLoad(this: XMLHttpRequest) {
    try {
      const storedUrl =
        (this as XMLHttpRequest & { _berrusUrl?: string })._berrusUrl ?? "";
      postIntercepted("xhr", storedUrl, this.status, this.responseText);
    } catch {
      // Swallow
    }
  });
  XHRSend.apply(this, args);
};
