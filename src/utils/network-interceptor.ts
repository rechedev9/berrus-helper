import { createLogger } from "./logger.ts";

const logger = createLogger("network-interceptor");

/**
 * The script injected into the main world to intercept fetch/XHR responses.
 * This is a static string — no eval or dynamic code generation.
 */
const INTERCEPTOR_SCRIPT = `
(function() {
  const SOURCE_ID = "berrus-helper";

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      const clone = response.clone();
      clone.text().then(function(body) {
        window.postMessage({
          source: SOURCE_ID,
          payload: {
            type: "fetch",
            url: url,
            status: response.status,
            body: body
          }
        }, "*");
      }).catch(function() {});
    } catch(e) {}
    return response;
  };

  const XHROpen = XMLHttpRequest.prototype.open;
  const XHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._berrusUrl = typeof url === "string" ? url : url?.toString() || "";
    return XHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener("load", function() {
      try {
        window.postMessage({
          source: SOURCE_ID,
          payload: {
            type: "xhr",
            url: this._berrusUrl || "",
            status: this.status,
            body: this.responseText
          }
        }, "*");
      } catch(e) {}
    });
    return XHRSend.apply(this, args);
  };
})();
`;

export interface InterceptedResponse {
  readonly type: "fetch" | "xhr";
  readonly url: string;
  readonly status: number;
  readonly body: string;
}

function isInterceptedPayload(value: unknown): value is InterceptedResponse {
  if (typeof value !== "object" || value === null) return false;
  const rec = value as Record<string, unknown>;
  return (
    (rec["type"] === "fetch" || rec["type"] === "xhr") &&
    typeof rec["url"] === "string" &&
    typeof rec["status"] === "number" &&
    typeof rec["body"] === "string"
  );
}

export function installNetworkInterceptor(): void {
  const script = document.createElement("script");
  script.textContent = INTERCEPTOR_SCRIPT;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
  logger.info("Network interceptor installed");
}

export type ResponseHandler = (response: InterceptedResponse) => void;

export function onInterceptedResponse(handler: ResponseHandler): void {
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== window) return;

    const data = event.data;
    if (typeof data !== "object" || data === null) return;

    const record = data as Record<string, unknown>;
    if (record["source"] !== "berrus-helper") return;

    const payload = record["payload"];
    if (isInterceptedPayload(payload)) {
      handler(payload);
    }
  });
}
