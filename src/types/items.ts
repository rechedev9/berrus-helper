export const ITEM_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;

export type ItemRarity = (typeof ITEM_RARITIES)[number];

export const ITEM_TYPES = [
  "material",
  "equipment",
  "consumable",
  "tool",
  "misc",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export interface GameItem {
  readonly id: string;
  readonly name: string;
  readonly type: ItemType;
  readonly rarity: ItemRarity;
}

export interface PriceSnapshot {
  readonly itemId: string;
  readonly itemName: string;
  readonly price: number;
  readonly timestamp: number;
  readonly source: "shop" | "mercadillo";
}

export interface PriceHistory {
  readonly itemId: string;
  readonly itemName: string;
  readonly snapshots: readonly PriceSnapshot[];
  readonly minPrice: number;
  readonly maxPrice: number;
  readonly currentPrice: number;
}
