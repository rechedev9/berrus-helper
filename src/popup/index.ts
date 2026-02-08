import { renderTimersPanel, stopTimerUpdates } from "./timers-panel.ts";
import { renderPricesPanel } from "./prices-panel.ts";
import { renderHiscoresPanel } from "./hiscores-panel.ts";
import { renderSessionPanel } from "./session-panel.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger("popup");

type TabName = "timers" | "prices" | "hiscores" | "session";

const TAB_NAMES: readonly TabName[] = [
  "timers",
  "prices",
  "hiscores",
  "session",
] as const;

function getPanel(name: TabName): HTMLElement | null {
  return document.getElementById(`panel-${name}`);
}

function isTabName(value: string): value is TabName {
  return (TAB_NAMES as readonly string[]).includes(value);
}

async function activateTab(name: TabName): Promise<void> {
  // Update tab buttons
  const buttons = document.querySelectorAll<HTMLElement>(".tabs__btn");
  for (const btn of buttons) {
    const isActive = btn.getAttribute("data-tab") === name;
    btn.classList.toggle("tabs__btn--active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  }

  // Update panels
  for (const tab of TAB_NAMES) {
    getPanel(tab)?.classList.toggle("panel--active", tab === name);
  }

  // Stop timer updates when switching away
  if (name !== "timers") {
    stopTimerUpdates();
  }

  // Render active panel content
  const panel = getPanel(name);
  if (!panel) return;

  switch (name) {
    case "timers":
      await renderTimersPanel(panel);
      break;
    case "prices":
      await renderPricesPanel(panel);
      break;
    case "hiscores":
      renderHiscoresPanel(panel);
      break;
    case "session":
      await renderSessionPanel(panel);
      break;
  }
}

function initTabs(): void {
  const buttons = document.querySelectorAll<HTMLElement>(".tabs__btn");
  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");
      if (tabName && isTabName(tabName)) {
        activateTab(tabName).catch((e: unknown) => {
          logger.error("Tab activation failed", e);
        });
      }
    });
  }
}

async function init(): Promise<void> {
  initTabs();

  // Load initial tab
  await activateTab("timers");

  // Update connection status
  const statusEl = document.getElementById("connection-status");
  if (!statusEl) return;

  try {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const isOnBerrus = tabs[0]?.url?.includes("berrus.app");

    if (isOnBerrus) {
      statusEl.textContent = "Connected to Berrus";
      statusEl.classList.add("footer__status--connected");
    } else {
      statusEl.textContent = "Not on berrus.app";
    }
  } catch {
    statusEl.textContent = "Disconnected";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((e: unknown) => {
    logger.error("Popup init failed", e);
  });
});
