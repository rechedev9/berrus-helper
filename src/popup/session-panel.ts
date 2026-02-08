import type { SessionStats } from "../types/session.ts";
import { sendMessage } from "../utils/messages.ts";
import { formatDuration } from "../utils/time.ts";
import { el, clearChildren } from "./dom-builder.ts";

function renderStatCard(label: string, value: string): HTMLElement {
  return el("div", {
    className: "stat-item",
    children: [
      el("div", { className: "stat-item__label", textContent: label }),
      el("div", { className: "stat-item__value", textContent: value }),
    ],
  });
}

function renderSkillGains(stats: SessionStats): HTMLElement {
  if (stats.skillGains.length === 0) {
    return el("div", {
      className: "card",
      children: [
        el("div", { className: "card__title", textContent: "Skill Gains" }),
        el("div", {
          className: "card__subtitle",
          textContent: "No XP gained this session.",
        }),
      ],
    });
  }

  const items: HTMLElement[] = [];
  for (const gain of stats.skillGains) {
    items.push(
      el("li", {
        className: "skill-list__item",
        children: [
          el("span", { textContent: gain.skill }),
          el("span", {
            textContent: `+${gain.xpGained.toLocaleString()} XP${gain.levelsGained > 0 ? ` (+${String(gain.levelsGained)} lvl)` : ""}`,
          }),
        ],
      }),
    );
  }

  return el("div", {
    className: "card",
    children: [
      el("div", {
        className: "card__title",
        textContent: "Skill Gains",
      }),
      el("ul", {
        className: "skill-list",
        children: items,
      }),
    ],
  });
}

function renderSession(stats: SessionStats): HTMLElement {
  const duration = Date.now() - stats.startedAt;

  return el("div", {
    children: [
      el("div", {
        className: "stats-grid",
        children: [
          renderStatCard("Duration", formatDuration(duration)),
          renderStatCard("Total XP", stats.totalXpGained.toLocaleString()),
          renderStatCard("Items", String(stats.itemsCollected)),
          renderStatCard("Earned", `${stats.pesetasEarned.toLocaleString()} pts`),
          renderStatCard("Spent", `${stats.pesetasSpent.toLocaleString()} pts`),
          renderStatCard("Kills", String(stats.combatKills)),
          renderStatCard("Deaths", String(stats.combatDeaths)),
          renderStatCard("Jobs Done", String(stats.jobsCompleted)),
        ],
      }),
      renderSkillGains(stats),
    ],
  });
}

function renderEmpty(): HTMLElement {
  return el("div", {
    className: "empty-state",
    children: [
      el("div", { className: "empty-state__text", textContent: "No active session" }),
      el("p", {
        className: "empty-state__text",
        textContent: "Navigate to berrus.app to start tracking your session.",
      }),
    ],
  });
}

export async function renderSessionPanel(panel: HTMLElement): Promise<void> {
  clearChildren(panel);
  panel.appendChild(el("div", { className: "loading", textContent: "Loading session..." }));

  const result = await sendMessage({ type: "GET_SESSION_STATS" });
  clearChildren(panel);

  if (!result.ok || !result.value) {
    panel.appendChild(renderEmpty());
    return;
  }

  panel.appendChild(renderSession(result.value));
}
