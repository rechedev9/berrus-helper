import type { JobTimerState, IdleJob } from "../types/jobs.ts";
import { sendMessage } from "../utils/messages.ts";
import { formatCountdown, getRemainingMs } from "../utils/time.ts";
import { el, clearChildren } from "./dom-builder.ts";

const TIMER_UPDATE_INTERVAL_MS = 1000;

let updateInterval: ReturnType<typeof setInterval> | null = null;
let currentState: JobTimerState | null = null;

function renderJobCard(job: IdleJob): HTMLElement {
  const remaining = getRemainingMs(job.endsAt);
  const isDone = remaining <= 0;
  const countdownClass = isDone ? "timer-countdown timer-countdown--done" : "timer-countdown";

  return el("div", {
    className: "card",
    attributes: { "data-job-id": job.id },
    children: [
      el("div", {
        className: "card__header",
        children: [
          el("span", { className: "card__title", textContent: job.name }),
          el("span", { className: "card__subtitle", textContent: job.skill }),
        ],
      }),
      el("div", {
        className: countdownClass,
        textContent: formatCountdown(remaining),
      }),
    ],
  });
}

function renderEmpty(): HTMLElement {
  return el("div", {
    className: "empty-state",
    children: [
      el("div", { className: "empty-state__text", textContent: "No active timers" }),
      el("p", {
        className: "empty-state__text",
        textContent: "Start an idle job in Berrus to see timers here.",
      }),
    ],
  });
}

function updateTimerDisplays(panel: HTMLElement): void {
  if (!currentState) return;

  for (const job of currentState.activeJobs) {
    const card = panel.querySelector(`[data-job-id="${job.id}"]`);
    if (!card) continue;

    const timerEl = card.querySelector(".timer-countdown");
    if (!timerEl) continue;

    const remaining = getRemainingMs(job.endsAt);
    timerEl.textContent = formatCountdown(remaining);

    if (remaining <= 0) {
      timerEl.classList.add("timer-countdown--done");
    }
  }
}

export async function renderTimersPanel(panel: HTMLElement): Promise<void> {
  clearChildren(panel);
  panel.appendChild(el("div", { className: "loading", textContent: "Loading timers..." }));

  const result = await sendMessage({ type: "GET_TIMERS" });
  clearChildren(panel);

  if (!result.ok) {
    panel.appendChild(el("div", { className: "empty-state", children: [
      el("div", { className: "empty-state__text", textContent: "Could not load timers" }),
    ]}));
    return;
  }

  currentState = result.value;

  if (currentState.activeJobs.length === 0) {
    panel.appendChild(renderEmpty());
    return;
  }

  for (const job of currentState.activeJobs) {
    panel.appendChild(renderJobCard(job));
  }

  // Start live updating
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(() => updateTimerDisplays(panel), TIMER_UPDATE_INTERVAL_MS);
}

export function stopTimerUpdates(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}
