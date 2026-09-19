/** 因緣閣 V1 類型 */

export type GachaPoolId = "wudao" | "nichang";

export type GachaRarity = "common" | "rare" | "legendary";

export type CosmeticType =
  | "outfit"
  | "skill_fx"
  | "card_art"
  | "card_back"
  | "avatar_frame";

export type GachaItemKind = "card" | "cosmetic";

export interface GachaRarityMeta {
  id: GachaRarity;
  label: string;
}

export interface GachaCardEntry {
  id: string;
  characterId: "baiye";
  rarity: GachaRarity;
  /** 玩法短標籤；不進戰鬥 description */
  buildTag: string;
}

export interface CosmeticEntry {
  id: string;
  name: string;
  type: CosmeticType;
  rarity: GachaRarity;
  description: string;
  /** placeholder 圖路徑 */
  icon: string;
}

export interface DrawHistoryEntry {
  at: number;
  poolId: GachaPoolId;
  itemId: string;
  kind: GachaItemKind;
  rarity: GachaRarity;
  isNew: boolean;
  convertAmount: number;
  convertCurrency: "remnant" | "silk";
}

export interface OwnedCardsMap {
  baiye: string[];
}

export interface GachaSaveV1 {
  version: 1;
  ownedCards: OwnedCardsMap;
  ownedCosmetics: string[];
  /** 悟道閣絕品保底計數（0–39，下一抽為 40 時必出） */
  cardPoolPity: number;
  /** 霓裳閣絕品保底 */
  cosmeticPoolPity: number;
  /** 悟道閣珍品軟保底 */
  cardRarePity: number;
  /** 霓裳閣珍品軟保底 */
  cosmeticRarePity: number;
  remnantScrolls: number;
  silkDust: number;
  cardDrawHistory: DrawHistoryEntry[];
  cosmeticDrawHistory: DrawHistoryEntry[];
}

export interface GachaDrawLine {
  itemId: string;
  kind: GachaItemKind;
  name: string;
  rarity: GachaRarity;
  rarityLabel: string;
  description: string;
  icon: string | null;
  buildTag?: string;
  cosmeticType?: CosmeticType;
  isNew: boolean;
  convertAmount: number;
  convertCurrency: "remnant" | "silk" | null;
}

export interface GachaDrawSummary {
  newCount: number;
  remnantGained: number;
  silkGained: number;
  legendaryPity: number;
  legendaryPityMax: number;
}

export interface GachaDrawResult {
  ok: true;
  poolId: GachaPoolId;
  cost: number;
  lines: GachaDrawLine[];
  summary: GachaDrawSummary;
  save: GachaSaveV1;
}

export interface GachaDrawFail {
  ok: false;
  reason: "insufficient_spirit" | "invalid_pool";
  message: string;
}

export type GachaDrawOutcome = GachaDrawResult | GachaDrawFail;
