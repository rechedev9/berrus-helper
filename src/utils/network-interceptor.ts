import { isRecord } from "./type-guards.ts";

export interface InterceptedResponse {
  readonly type: "fetch" | "xhr";
  readonly url: string;
  readonly status: number;
  readonly body: string;
}

export function isInterceptedPayload(
  value: unknown,
): value is InterceptedResponse {
  if (!isRecord(value)) return false;
  return (
    (value["type"] === "fetch" || value["type"] === "xhr") &&
    typeof value["url"] === "string" &&
    typeof value["status"] === "number" &&
    typeof value["body"] === "string"
  );
}

export type ResponseHandler = (response: InterceptedResponse) => void;

export function onInterceptedResponse(handler: ResponseHandler): void {
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== window) return;

    const data = event.data;
    if (!isRecord(data)) return;
    if (data["source"] !== "berrus-helper") return;

    const payload = data["payload"];
    if (isInterceptedPayload(payload)) {
      handler(payload);
    }
  });
}
