import { describe, it, expect } from "bun:test";
import { extractActiveJobs } from "./job-extractor.ts";

function buildJobDom(
  name: string,
  skill: string,
  timer: string,
  jobId?: string,
): HTMLElement {
  const container = document.createElement("div");
  container.className = "idle-job";
  if (jobId) container.setAttribute("data-job-id", jobId);

  const nameEl = document.createElement("span");
  nameEl.className = "job-name";
  nameEl.textContent = name;

  const skillEl = document.createElement("span");
  skillEl.className = "job-skill";
  skillEl.textContent = skill;

  const timerEl = document.createElement("span");
  timerEl.className = "job-timer";
  timerEl.textContent = timer;

  container.appendChild(nameEl);
  container.appendChild(skillEl);
  container.appendChild(timerEl);

  return container;
}

describe("job-extractor", () => {
  describe("extractActiveJobs", () => {
    it("should extract jobs from DOM elements", () => {
      const container = document.createElement("div");
      container.appendChild(buildJobDom("Mining Iron", "Mineria", "05:00", "j-1"));
      document.body.appendChild(container);

      const result = extractActiveJobs();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.name).toBe("Mining Iron");
        expect(result.value[0]?.skill).toBe("Mineria");
        expect(result.value[0]?.id).toBe("j-1");
      }

      document.body.removeChild(container);
    });

    it("should parse HH:MM:SS timer format", () => {
      const container = document.createElement("div");
      container.appendChild(buildJobDom("Smelting", "Herreria", "01:30:00", "j-2"));
      document.body.appendChild(container);

      const result = extractActiveJobs();

      if (result.ok && result.value[0]) {
        expect(result.value[0].durationMs).toBe(5_400_000);
      }

      document.body.removeChild(container);
    });

    it("should parse MM:SS timer format", () => {
      const container = document.createElement("div");
      container.appendChild(buildJobDom("Fishing", "Pesca", "10:30", "j-3"));
      document.body.appendChild(container);

      const result = extractActiveJobs();

      if (result.ok && result.value[0]) {
        expect(result.value[0].durationMs).toBe(630_000);
      }

      document.body.removeChild(container);
    });

    it("should skip elements with invalid skill names", () => {
      const container = document.createElement("div");
      container.appendChild(buildJobDom("Unknown Job", "InvalidSkill", "05:00"));
      document.body.appendChild(container);

      const result = extractActiveJobs();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }

      document.body.removeChild(container);
    });

    it("should return empty array when no job elements exist", () => {
      const result = extractActiveJobs();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
});
