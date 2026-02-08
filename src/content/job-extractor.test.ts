import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { extractActiveJobs, parseTimerText } from "./job-extractor.ts";

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
});

/**
 * Build a DOM structure mimicking a queued job on berrus.app:
 *   <div>                          (job container)
 *     <span>{name}</span>          (job name)
 *     <span>{progress}</span>      (progress %)
 *     <span>{timer}</span>         (countdown)
 *     <button>Cancel</button>
 *     [<a href="...skills/{skill}">+1 XP</a>]  (optional skill link)
 *   </div>
 */
function buildJobDom(
  name: string,
  timer: string,
  options?: {
    readonly progress?: string;
    readonly skillSlug?: string;
  },
): HTMLElement {
  const row = document.createElement("div");

  const nameEl = document.createElement("span");
  nameEl.textContent = name;
  row.appendChild(nameEl);

  if (options?.progress) {
    const progressEl = document.createElement("span");
    progressEl.textContent = options.progress;
    row.appendChild(progressEl);
  }

  const timerEl = document.createElement("span");
  timerEl.textContent = timer;
  row.appendChild(timerEl);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  row.appendChild(cancelBtn);

  if (options?.skillSlug) {
    const link = document.createElement("a");
    link.href = `/g/c/rsn/character/skills/${options.skillSlug}`;
    link.textContent = "+1 XP";
    row.appendChild(link);
  }

  return row;
}

describe("job-extractor", () => {
  describe("parseTimerText", () => {
    it("should parse MM:SS format", () => {
      expect(parseTimerText("14:01")).toBe(841_000);
    });

    it("should parse HH:MM:SS format", () => {
      expect(parseTimerText("1:00:00")).toBe(3_600_000);
    });

    it("should handle 'remaining' suffix", () => {
      expect(parseTimerText("14:01 remaining")).toBe(841_000);
    });

    it("should return undefined for invalid input", () => {
      expect(parseTimerText("not a timer")).toBeUndefined();
    });

    it("should parse short MM:SS", () => {
      expect(parseTimerText("05:00")).toBe(300_000);
    });
  });

  describe("extractActiveJobs", () => {
    it("should extract a single queued job", () => {
      container.appendChild(
        buildJobDom("Ayudante del Carnicero", "14:01 remaining", {
          progress: "80%",
          skillSlug: "cooking",
        }),
      );

      const result = extractActiveJobs();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.name).toBe("Ayudante del Carnicero");
        expect(result.value[0]?.skill).toBe("Cocina");
        expect(result.value[0]?.durationMs).toBe(841_000);
      }
    });

    it("should extract multiple queued jobs", () => {
      container.appendChild(
        buildJobDom("Mining Iron", "05:00", { skillSlug: "mining" }),
      );
      container.appendChild(
        buildJobDom("Smelting Bronze", "10:30", { skillSlug: "smithing" }),
      );

      const result = extractActiveJobs();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.name).toBe("Mining Iron");
        expect(result.value[0]?.skill).toBe("Mineria");
        expect(result.value[1]?.name).toBe("Smelting Bronze");
        expect(result.value[1]?.skill).toBe("Herreria");
      }
    });

    it("should default to Mineria when no skill link exists", () => {
      container.appendChild(
        buildJobDom("Unknown Job", "03:00"),
      );

      const result = extractActiveJobs();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.skill).toBe("Mineria");
      }
    });

    it("should return empty array when no timer elements exist", () => {
      const noTimerDiv = document.createElement("div");
      noTimerDiv.textContent = "No jobs here";
      container.appendChild(noTimerDiv);

      const result = extractActiveJobs();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should return empty array on empty page", () => {
      const result = extractActiveJobs();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should deduplicate containers with multiple timer-like text", () => {
      const row = document.createElement("div");

      const nameEl = document.createElement("span");
      nameEl.textContent = "Fishing";
      row.appendChild(nameEl);

      const timerEl = document.createElement("span");
      timerEl.textContent = "10:00";
      row.appendChild(timerEl);

      container.appendChild(row);

      const result = extractActiveJobs();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
      }
    });

    it("should detect skill from nested link in container", () => {
      const row = document.createElement("div");

      const nameEl = document.createElement("span");
      nameEl.textContent = "Catch Fish";
      row.appendChild(nameEl);

      const timerEl = document.createElement("span");
      timerEl.textContent = "2:30";
      row.appendChild(timerEl);

      const linkWrapper = document.createElement("div");
      const link = document.createElement("a");
      link.href = "/g/c/rsn/character/skills/fishing";
      link.textContent = "+5 XP";
      linkWrapper.appendChild(link);
      row.appendChild(linkWrapper);

      container.appendChild(row);

      const result = extractActiveJobs();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.skill).toBe("Pesca");
      }
    });
  });
});
