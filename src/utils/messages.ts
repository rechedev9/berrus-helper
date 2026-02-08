import type {
  ExtensionMessage,
  MessageResponseMap,
} from "../types/messages.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { isExtensionMessage } from "./type-guards.ts";
import { createLogger } from "./logger.ts";

const logger = createLogger("messages");

export async function sendMessage<T extends ExtensionMessage["type"]>(
  message: Extract<ExtensionMessage, { readonly type: T }>,
): Promise<Result<MessageResponseMap[T], string>> {
  try {
    // TS limitation: chrome.runtime.sendMessage returns untyped Promise
    const response = (await chrome.runtime.sendMessage(
      message,
    )) as MessageResponseMap[T];
    return ok(response);
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logger.error("Failed to send message", {
      type: message.type,
      error: errorMessage,
    });
    return err(`Message send failed: ${errorMessage}`);
  }
}

type MessageHandler<T extends ExtensionMessage["type"]> = (
  message: Extract<ExtensionMessage, { readonly type: T }>,
  sender: chrome.runtime.MessageSender,
) => Promise<MessageResponseMap[T]> | MessageResponseMap[T];

type HandlerMap = {
  readonly [T in ExtensionMessage["type"]]?: MessageHandler<T>;
};

export function onMessage(handlers: HandlerMap): void {
  chrome.runtime.onMessage.addListener(
    (
      rawMessage: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void,
    ): boolean => {
      if (!isExtensionMessage(rawMessage)) {
        logger.warn("Received invalid message", rawMessage);
        return false;
      }

      // TS limitation: indexed access on discriminated union loses type narrowing
      const handler = handlers[rawMessage.type] as
        | MessageHandler<typeof rawMessage.type>
        | undefined;

      if (!handler) {
        logger.warn("No handler for message type", rawMessage.type);
        return false;
      }

      // TS limitation: handler expects narrowed type but rawMessage is union
      const result = handler(rawMessage as never, sender);

      if (result instanceof Promise) {
        result.then(sendResponse).catch((e: unknown) => {
          logger.error("Handler error", { type: rawMessage.type, error: e });
          sendResponse({ success: false });
        });
        return true; // async response
      }

      sendResponse(result);
      return false;
    },
  );
}
