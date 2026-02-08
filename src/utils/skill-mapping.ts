import type { SkillName } from "../types/skills.ts";

const API_SKILL_MAP: Readonly<Record<string, SkillName>> = {
  mining: "Mineria",
  smithing: "Herreria",
  fishing: "Pesca",
  cooking: "Cocina",
  woodcutting: "Tala",
  carpentry: "Carpinteria",
  farming: "Agricultura",
  alchemy: "Alquimia",
  combat: "Combate",
  defense: "Defensa",
  magic: "Magia",
  stealth: "Sigilo",
  crafting: "Artesania",
  enchanting: "Encantamiento",
};

export function apiSkillToSkillName(apiSkill: string): SkillName | undefined {
  return API_SKILL_MAP[apiSkill.toLowerCase()];
}
