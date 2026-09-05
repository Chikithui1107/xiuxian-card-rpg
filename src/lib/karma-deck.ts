import type { Card } from "@/types/battle";

/** 因／果／雙屬 */
export type KarmaAspect = "yin" | "yang" | "both";

export type KarmaCardTemplateId =
  | "qiandhen"
  | "zhongyin"
  | "sheyin"
  | "suye"
  | "duanjue"
  | "lunzhuan"
  | "kuguo"
  | "guosheng"
  | "shanguo"
  | "suyin"
  | "yinian";

export interface KarmaCardTemplate {
  id: KarmaCardTemplateId;
  name: string;
  type: string;
  cost: number;
  description: string;
  aspect: KarmaAspect;
  /** 不觸發【因果相生】 */
  suppressKarmaPassive?: boolean;
  isExhaust?: boolean;
}

export const KARMA_TEMPLATES: Record<KarmaCardTemplateId, KarmaCardTemplate> = {
  qiandhen: {
    id: "qiandhen",
    name: "前塵種因",
    type: "因牌",
    cost: 1,
    aspect: "yin",
    description:
      "造成 10 點傷害。若目標身上存在任意負面效果，本次傷害提高 50%。",
  },
  zhongyin: {
    id: "zhongyin",
    name: "種因得果",
    type: "因牌",
    cost: 1,
    aspect: "yin",
    description:
      "造成 15 點傷害。若由此牌觸發【因果相生】所牽引出的果牌在本回合內被打出，則立即追加 8 點傷害。",
  },
  sheyin: {
    id: "sheyin",
    name: "捨因解果",
    type: "因牌",
    cost: 1,
    aspect: "yin",
    description: "棄置手牌中的 1 張因牌，抽取 2 張果牌。",
  },
  suye: {
    id: "suye",
    name: "宿業終局",
    type: "因牌",
    cost: 2,
    aspect: "yin",
    description:
      "造成 25 點傷害。手中至少 1 張果牌：附加 1 層【因果印記】。至少 2 張果牌：額外造成 15 點傷害。兩項可同時觸發。",
  },
  duanjue: {
    id: "duanjue",
    name: "因果斷絕",
    type: "因牌",
    cost: 3,
    aspect: "yin",
    description:
      "下回合額外獲得 3 點真元。由此牌觸發【因果相生】所牽引出的果牌將立即免費打出，而非加入手牌。",
  },
  lunzhuan: {
    id: "lunzhuan",
    name: "因果輪轉",
    type: "果牌",
    cost: 1,
    aspect: "yang",
    description:
      "獲得 10 點護盾。記錄本回合受到的傷害，將其 30% 轉化為下一個玩家回合第一次傷害的額外傷害。",
  },
  kuguo: {
    id: "kuguo",
    name: "苦果自嘗",
    type: "果牌",
    cost: 1,
    aspect: "yang",
    description:
      "為目標附加 1 層【因果印記】。若本回合已打出至少 2 張因牌，額外附加 1 層。",
  },
  guosheng: {
    id: "guosheng",
    name: "果生新因",
    type: "果牌",
    cost: 1,
    aspect: "yang",
    description: "棄置手牌中的 1 張果牌，抽取 2 張因牌。",
  },
  shanguo: {
    id: "shanguo",
    name: "善果自報",
    type: "果牌",
    cost: 2,
    aspect: "yang",
    description:
      "上一張為因牌：下回合所有因牌傷害提高 75%。上一張為果牌：下回合打出的所有果牌額外附加 1 層【因果印記】。",
  },
  suyin: {
    id: "suyin",
    name: "宿因重演",
    type: "果牌",
    cost: 3,
    aspect: "yang",
    description:
      "按順序重演上一回合打出的所有卡牌（不含本牌）。重演不消耗真元、不觸發【因果相生】。",
  },
  yinian: {
    id: "yinian",
    name: "一念因果",
    type: "因／果牌",
    cost: 3,
    aspect: "both",
    suppressKarmaPassive: true,
    description:
      "造成 20 點基礎傷害並結算所有【因果印記】（每層 +10）。至少 5 層時最終傷害額外 +50%，然後清除印記。",
  },
};

/** 開局：僅 1／2 真元牌 */
export const MOYI_STARTING_DECK: KarmaCardTemplateId[] = [
  "qiandhen",
  "qiandhen",
  "zhongyin",
  "sheyin",
  "suye",
  "lunzhuan",
  "lunzhuan",
  "kuguo",
  "guosheng",
  "shanguo",
];

export const KARMA_REWARD_IDS = Object.keys(
  KARMA_TEMPLATES
) as KarmaCardTemplateId[];

export function isKarmaTemplateId(id: string): id is KarmaCardTemplateId {
  return id in KARMA_TEMPLATES;
}

export function getKarmaTemplate(
  id: string
): KarmaCardTemplate | undefined {
  return isKarmaTemplateId(id) ? KARMA_TEMPLATES[id] : undefined;
}

export function cardMatchesAspect(
  card: Card,
  aspect: "yin" | "yang"
): boolean {
  const t = getKarmaTemplate(card.id);
  if (!t) return false;
  return t.aspect === aspect || t.aspect === "both";
}
