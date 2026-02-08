export const SKILLS = [
  "Mineria",
  "Herreria",
  "Pesca",
  "Cocina",
  "Tala",
  "Carpinteria",
  "Agricultura",
  "Alquimia",
  "Combate",
  "Defensa",
  "Magia",
  "Sigilo",
  "Artesania",
  "Encantamiento",
] as const;

export type SkillName = (typeof SKILLS)[number];

export interface SkillXp {
  readonly skill: SkillName;
  readonly currentXp: number;
  readonly level: number;
}
