import type {
  GachaCardEntry,
  GachaRarity,
  GachaRarityMeta,
} from "@/types/gacha";
import type { SwordCardTemplateId } from "@/lib/battle-deck";
import { CARD_TEMPLATES } from "@/lib/battle-deck";

/** 稀有度顯示（UI 從資料讀，勿硬編碼字串） */
export const GACHA_RARITY_META: Record<GachaRarity, GachaRarityMeta> = {
  common: { id: "common", label: "凡品" },
  rare: { id: "rare", label: "珍品" },
  legendary: { id: "legendary", label: "絕品" },
};

export const GACHA_COST = {
  single: 100,
  multi: 900,
  multiCount: 10,
} as const;

export const GACHA_PITY = {
  /** 十抽至少 1 張珍品或以上（實作：若全凡品則升級一張） */
  multiRareGuarantee: true,
  /** 最多 N 抽必出絕品 */
  legendaryHard: 40,
  /** 單抽珍品軟保底（連續未出珍品+ 達此數下一抽強制珍品） */
  rareSoft: 10,
} as const;

/** 基礎機率；保底另算 */
export const GACHA_RATES = {
  common: 0.78,
  rare: 0.19,
  legendary: 0.03,
} as const;

/** 重複轉換（殘卷／綺塵） */
export const GACHA_DUPLICATE_CONVERT: Record<GachaRarity, number> = {
  common: 10,
  rare: 25,
  legendary: 60,
};

export const GACHA_HISTORY_LIMIT = 50;

export const GACHA_STORAGE_KEY = "xiuxian_gacha_v1";

/**
 * 劍道悟真 · 白夜 — 永久卡池條目。
 * rarity / buildTag 僅用於因緣閣，不改戰鬥 description。
 */
export const BAIYE_GACHA_CARDS: GachaCardEntry[] = [
  { id: "fuxue", characterId: "baiye", rarity: "common", buildTag: "穩定養劍" },
  { id: "shuangren", characterId: "baiye", rarity: "rare", buildTag: "連斬破綻" },
  { id: "lingtai", characterId: "baiye", rarity: "common", buildTag: "抽牌 / 養劍" },
  { id: "jiangang", characterId: "baiye", rarity: "common", buildTag: "基礎防禦" },
  { id: "ningshuang", characterId: "baiye", rarity: "common", buildTag: "積蓄劍意" },
  { id: "guishao", characterId: "baiye", rarity: "common", buildTag: "週轉真元" },
  { id: "xunshuang", characterId: "baiye", rarity: "rare", buildTag: "絕技檢索" },
  { id: "yangjian", characterId: "baiye", rarity: "rare", buildTag: "爆發核心" },
  { id: "cangfeng", characterId: "baiye", rarity: "rare", buildTag: "絕技降費" },
  { id: "shuangjian", characterId: "baiye", rarity: "rare", buildTag: "攻防聯動" },
  { id: "jianxin", characterId: "baiye", rarity: "rare", buildTag: "抽牌核心" },
  { id: "baojian", characterId: "baiye", rarity: "common", buildTag: "防守養劍" },
  { id: "poshizhan", characterId: "baiye", rarity: "rare", buildTag: "破綻核心" },
  { id: "yijian", characterId: "baiye", rarity: "legendary", buildTag: "核心絕技" },
];

export const WUDAO_BANNER = {
  poolId: "wudao" as const,
  title: "劍道悟真 · 白夜",
  subtitle: "功法／卡牌",
  portrait: "/images/baiye/baiye-character.png",
  background: "/images/baiye/baiye-bg.png",
};

export const NICHANG_BANNER = {
  poolId: "nichang" as const,
  title: "霓裳閣",
  subtitle: "服裝 · 異畫 · 劍光 · 卡背",
  portrait: "/images/baiye/baiye-character.png",
  background: "/images/baiye/baiye-bg.png",
};

export function getBaiyeGachaCard(id: string): GachaCardEntry | undefined {
  return BAIYE_GACHA_CARDS.find((c) => c.id === id);
}

export function getBaiyeCardDisplay(id: string): {
  name: string;
  description: string;
  icon: string | null;
} | null {
  const t = CARD_TEMPLATES[id as SwordCardTemplateId];
  if (!t) return null;
  return {
    name: t.name,
    description: t.description,
    icon: t.icon ?? null,
  };
}

export function listBaiyeGachaIds(): string[] {
  return BAIYE_GACHA_CARDS.map((c) => c.id);
}

export function cardsOfRarity(rarity: GachaRarity): GachaCardEntry[] {
  return BAIYE_GACHA_CARDS.filter((c) => c.rarity === rarity);
}
