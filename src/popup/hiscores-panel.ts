import type { HiscoreCategory, HiscoreEntry } from "../types/hiscores.ts";
import { SKILLS } from "../types/skills.ts";
import { sendMessage } from "../utils/messages.ts";
import { el, clearChildren } from "./dom-builder.ts";

function createCategoryOptions(): readonly HTMLElement[] {
  const options: HTMLElement[] = [
    el("option", { textContent: "Total", attributes: { value: "total" } }),
    el("option", { textContent: "Combat", attributes: { value: "combat" } }),
  ];

  for (const skill of SKILLS) {
    options.push(el("option", { textContent: skill, attributes: { value: skill } }));
  }

  return options;
}

function renderResultsTable(entries: readonly HiscoreEntry[]): HTMLElement {
  const headerRow = el("tr", {
    children: [
      el("th", { textContent: "#" }),
      el("th", { textContent: "Player" }),
      el("th", { textContent: "Level" }),
      el("th", { textContent: "XP" }),
    ],
  });

  const rows: HTMLElement[] = [headerRow];

  for (const entry of entries) {
    rows.push(
      el("tr", {
        children: [
          el("td", { textContent: String(entry.rank) }),
          el("td", { textContent: entry.playerName }),
          el("td", { textContent: String(entry.level) }),
          el("td", { textContent: entry.xp.toLocaleString() }),
        ],
      }),
    );
  }

  return el("table", {
    className: "table",
    children: [
      el("thead", { children: [headerRow] }),
      el("tbody", { children: rows.slice(1) }),
    ],
  });
}

export function renderHiscoresPanel(panel: HTMLElement): void {
  clearChildren(panel);

  const resultsContainer = el("div", { id: "hiscore-results" });

  const categorySelect = el("select", {
    className: "search-select",
    children: createCategoryOptions() as HTMLElement[],
  });

  const nameInput = el("input", {
    className: "search-input",
    attributes: {
      type: "text",
      placeholder: "Player name...",
    },
  });

  const searchBtn = el("button", {
    className: "search-btn",
    textContent: "Search",
    onclick: async () => {
      const playerName = (nameInput as HTMLInputElement).value.trim();
      if (!playerName) return;

      const category = (categorySelect as HTMLSelectElement).value as HiscoreCategory;

      clearChildren(resultsContainer);
      resultsContainer.appendChild(
        el("div", { className: "loading", textContent: "Searching..." }),
      );

      searchBtn.setAttribute("disabled", "");

      const result = await sendMessage({
        type: "SEARCH_HISCORES",
        playerName,
        category,
      });

      searchBtn.removeAttribute("disabled");
      clearChildren(resultsContainer);

      if (!result.ok) {
        resultsContainer.appendChild(
          el("div", {
            className: "empty-state",
            children: [
              el("div", { className: "empty-state__text", textContent: "Search failed. Try again." }),
            ],
          }),
        );
        return;
      }

      if (result.value.entries.length === 0) {
        resultsContainer.appendChild(
          el("div", {
            className: "empty-state",
            children: [
              el("div", { className: "empty-state__text", textContent: "No results found" }),
            ],
          }),
        );
        return;
      }

      resultsContainer.appendChild(renderResultsTable(result.value.entries));
    },
  });

  // Handle enter key
  nameInput.addEventListener("keydown", (e: Event) => {
    if ((e as KeyboardEvent).key === "Enter") {
      searchBtn.click();
    }
  });

  panel.appendChild(
    el("div", {
      className: "search-form",
      children: [nameInput, categorySelect, searchBtn],
    }),
  );

  panel.appendChild(resultsContainer);

  // Show initial empty state
  resultsContainer.appendChild(
    el("div", {
      className: "empty-state",
      children: [
        el("div", { className: "empty-state__text", textContent: "Search for a player" }),
      ],
    }),
  );
}
