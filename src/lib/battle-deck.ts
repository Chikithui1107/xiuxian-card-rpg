import type { BattleDeckState, Card } from "@/types/battle";
import {
  KARMA_TEMPLATES,
  type KarmaCardTemplateId,
} from "@/lib/karma-deck";

export type SwordCardTemplateId =
  | "fuxue"
  | "shuangren"
  | "lingtai"
  | "jiangang"
  | "ningshuang"
  | "guishao"
  | "xunshuang"
  | "yangjian"
  | "cangfeng"
  | "shuangjian"
  | "jianxin"
  | "baojian"
  | "yijian";

export type CardTemplateId = SwordCardTemplateId | KarmaCardTemplateId;

export type CardEffect =
  | { kind: "damage"; amount: number }
  | { kind: "multi_damage"; amount: number; hits: number }
  | { kind: "damage_yijian"; base: number; perIntent: number }
  | { kind: "gain_intent"; amount: number }
  | { kind: "gain_sword_guard"; amount: number }
  | { kind: "gain_nurture"; amount: number }
  | { kind: "draw"; amount: number }
  | { kind: "gain_energy"; amount: number }
  | { kind: "apply_vulnerability"; amount?: number }
  | { kind: "find_yijian" }
  | { kind: "power_cangfeng" }
  | { kind: "power_shuangjian" }
  | { kind: "power_jianxin" }
  | { kind: "karma" };

export interface CardTemplate {
  id: CardTemplateId;
  name: string;
  type: string;
  cost: number;
  description: string;
  /** 卡面插畫 public 路徑；缺省用統一 placeholder */
  art?: string;
  /** 小型技能圖標；缺省可不顯示 */
  icon?: string;
  isExhaust?: boolean;
  /** 能力牌 */
  isPower?: boolean;
  /** 回合結束不棄置（保留） */
  isRetain?: boolean;
  /** 攻擊牌（觸發破綻） */
  isAttack?: boolean;
  sword?: boolean;
  effects: CardEffect[];
}

/** 無專屬插畫時的統一占位 */
export const CARD_ART_PLACEHOLDER = "/cards/card-art-placeholder.svg";

export function resolveCardArt(art?: string | null): string {
  return art && art.length > 0 ? art : CARD_ART_PLACEHOLDER;
}

export function resolveCardIcon(icon?: string | null): string | null {
  return icon && icon.length > 0 ? icon : null;
}

const SWORD_TEMPLATES: Record<SwordCardTemplateId, CardTemplate> = {
  fuxue: {
    id: "fuxue",
    name: "拂雪流光",
    type: "攻擊",
    cost: 1,
    description: "造成 7 點傷害。\n獲得 2 點【劍意】。",
    isAttack: true,
    sword: true,
    effects: [
      { kind: "damage", amount: 7 },
      { kind: "gain_intent", amount: 2 },
    ],
  },
  shuangren: {
    id: "shuangren",
    name: "霜刃連斬",
    type: "攻擊",
    cost: 2,
    description: "造成 6 點傷害 3 次。\n賦予 1 層【破綻】。",
    isAttack: true,
    sword: true,
    effects: [
      { kind: "multi_damage", amount: 6, hits: 3 },
      { kind: "apply_vulnerability", amount: 1 },
    ],
  },
  lingtai: {
    id: "lingtai",
    name: "靈台觀劍",
    type: "技能",
    cost: 1,
    description: "獲得 1 點【劍意】。\n抽 2 張牌。",
    effects: [
      { kind: "gain_intent", amount: 1 },
      { kind: "draw", amount: 2 },
    ],
  },
  jiangang: {
    id: "jiangang",
    name: "劍罡護體",
    type: "技能",
    cost: 1,
    description: "獲得 7 點【劍罡】。",
    effects: [{ kind: "gain_sword_guard", amount: 7 }],
  },
  ningshuang: {
    id: "ningshuang",
    name: "凝霜入鞘",
    type: "技能",
    cost: 1,
    description: "獲得 4 點【劍意】。",
    effects: [{ kind: "gain_intent", amount: 4 }],
  },
  guishao: {
    id: "guishao",
    name: "歸鞘",
    type: "技能",
    cost: 0,
    description: "獲得 1 點真元。\n抽 1 張牌。\n【消耗】",
    isExhaust: true,
    effects: [
      { kind: "gain_energy", amount: 1 },
      { kind: "draw", amount: 1 },
    ],
  },
  xunshuang: {
    id: "xunshuang",
    name: "尋霜",
    type: "技能",
    cost: 1,
    description:
      "將【一劍霜寒】從抽牌堆或棄牌堆加入手牌。\n並獲得 3 點【劍意】。",
    effects: [
      { kind: "find_yijian" },
      { kind: "gain_intent", amount: 3 },
    ],
  },
  yangjian: {
    id: "yangjian",
    name: "養劍訣",
    type: "技能",
    cost: 1,
    description:
      "獲得 1 層【養劍】。\n只要至少有 1 層，【一劍霜寒】傷害 ×2。\n每個玩家回合結束時失去 1 層。",
    effects: [{ kind: "gain_nurture", amount: 1 }],
  },
  cangfeng: {
    id: "cangfeng",
    name: "藏鋒待發",
    type: "能力",
    cost: 1,
    description: "本場戰鬥中：【一劍霜寒】費用 -1。\n可疊加，最低費用為 0。\n【能力】",
    isPower: true,
    effects: [{ kind: "power_cangfeng" }],
  },
  shuangjian: {
    id: "shuangjian",
    name: "霜劍護主",
    type: "能力",
    cost: 1,
    description:
      "本場戰鬥中：每當打出【一劍霜寒】後，獲得 8 點【劍罡】。\n可疊加。\n【能力】",
    isPower: true,
    effects: [{ kind: "power_shuangjian" }],
  },
  jianxin: {
    id: "jianxin",
    name: "劍心澄明",
    type: "能力",
    cost: 1,
    description:
      "本場戰鬥中：每當你「獲得一次【劍意】」時，抽 1 張牌。\n按獲得事件計次，可疊加。\n【能力】",
    isPower: true,
    effects: [{ kind: "power_jianxin" }],
  },
  baojian: {
    id: "baojian",
    name: "抱劍守心",
    type: "技能",
    cost: 2,
    description: "獲得 3 點【劍意】。\n獲得 12 點【劍罡】。",
    effects: [
      { kind: "gain_intent", amount: 3 },
      { kind: "gain_sword_guard", amount: 12 },
    ],
  },
  yijian: {
    id: "yijian",
    name: "一劍霜寒",
    type: "攻擊／絕技",
    cost: 2,
    description:
      "造成 15＋（當前【劍意】×3）點傷害。\n不消耗劍意。\n有【養劍】時傷害 ×2。",
    isAttack: true,
    sword: true,
    effects: [{ kind: "damage_yijian", base: 15, perIntent: 3 }],
  },
};

function karmaToCardTemplate(id: KarmaCardTemplateId): CardTemplate {
  const k = KARMA_TEMPLATES[id];
  return {
    id: k.id,
    name: k.name,
    type: k.type,
    cost: k.cost,
    description: k.description,
    art: k.art,
    icon: k.icon,
    isExhaust: k.isExhaust,
    isRetain: k.isRetain,
    effects: [{ kind: "karma" }],
  };
}

export const CARD_TEMPLATES: Record<CardTemplateId, CardTemplate> = {
  ...SWORD_TEMPLATES,
  ...(Object.fromEntries(
    (Object.keys(KARMA_TEMPLATES) as KarmaCardTemplateId[]).map((id) => [
      id,
      karmaToCardTemplate(id),
    ])
  ) as Record<KarmaCardTemplateId, CardTemplate>),
};

const templateCounters: Partial<Record<string, number>> = {};

export function resetCardInstanceCounters(): void {
  for (const key of Object.keys(templateCounters)) {
    delete templateCounters[key];
  }
}

export function createCard(templateId: CardTemplateId): Card {
  const template = CARD_TEMPLATES[templateId];
  const next = (templateCounters[templateId] ?? 0) + 1;
  templateCounters[templateId] = next;

  return {
    instanceId: `${templateId}-${next}`,
    id: template.id,
    name: template.name,
    cost: template.cost,
    isExhaust: template.isExhaust,
    isPower: template.isPower,
    isRetain: template.isRetain,
  };
}

export function getCardTemplate(card: Card): CardTemplate | undefined {
  return CARD_TEMPLATES[card.id as CardTemplateId];
}

export const shuffle = (cards: Card[]): Card[] => {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export function createBattleDeck(
  templateIds: CardTemplateId[],
  handSize: number
): BattleDeckState {
  resetCardInstanceCounters();
  const drawPile = shuffle(templateIds.map(createCard));
  const hand = drawPile.splice(0, handSize);
  return {
    drawPile,
    hand,
    discardPile: [],
    exhaustPile: [],
    powerPile: [],
  };
}

export const MAX_HAND_SIZE = 10;

export const drawCards = (
  state: BattleDeckState,
  count: number
): BattleDeckState => {
  let { drawPile, hand, discardPile } = state;
  let newHand = [...hand];
  let newDraw = [...drawPile];
  let newDiscard = [...discardPile];

  for (let i = 0; i < count; i++) {
    if (newDraw.length === 0) {
      if (newDiscard.length === 0) break;
      newDraw = shuffle(newDiscard);
      newDiscard = [];
    }

    if (newHand.length < MAX_HAND_SIZE) {
      const drawnCard = newDraw.pop()!;
      newHand.push(drawnCard);
    }
  }

  return {
    ...state,
    drawPile: newDraw,
    hand: newHand,
    discardPile: newDiscard,
  };
};

export function playCardFromHand(
  deck: BattleDeckState,
  instanceId: string
): { deck: BattleDeckState; played: Card | null } {
  const index = deck.hand.findIndex((c) => c.instanceId === instanceId);
  if (index === -1) return { deck, played: null };

  const played = deck.hand[index];
  const hand = deck.hand.filter((_, i) => i !== index);
  const template = getCardTemplate(played);
  const isPower = played.isPower || template?.isPower;
  const isExhaust = played.isExhaust || template?.isExhaust;

  if (isPower) {
    return {
      deck: {
        ...deck,
        hand,
        powerPile: [...(deck.powerPile ?? []), played],
      },
      played,
    };
  }

  if (isExhaust) {
    return {
      deck: {
        ...deck,
        hand,
        exhaustPile: [...deck.exhaustPile, played],
      },
      played,
    };
  }

  return {
    deck: { ...deck, hand, discardPile: [...deck.discardPile, played] },
    played,
  };
}

/** 棄置手牌中指定實例（一律進棄牌堆，非消耗） */
export function discardCardFromHand(
  deck: BattleDeckState,
  instanceId: string
): BattleDeckState {
  const index = deck.hand.findIndex((c) => c.instanceId === instanceId);
  if (index === -1) return deck;
  const card = deck.hand[index];
  return {
    ...deck,
    hand: deck.hand.filter((_, i) => i !== index),
    discardPile: [...deck.discardPile, { ...card, costModifier: undefined }],
  };
}

/** 是否帶【保留】：實例標記或模板標記 */
export function cardIsRetain(card: Card): boolean {
  if (card.isRetain) return true;
  const template = getCardTemplate(card);
  return Boolean(template?.isRetain);
}

export function discardHand(deck: BattleDeckState): BattleDeckState {
  if (deck.hand.length === 0) return deck;

  const kept: Card[] = [];
  const dumped: Card[] = [];
  for (const c of deck.hand) {
    const cleared = { ...c, costModifier: undefined };
    if (cardIsRetain(c)) kept.push(cleared);
    else dumped.push(cleared);
  }

  if (dumped.length === 0) {
    return { ...deck, hand: kept };
  }

  return {
    ...deck,
    hand: kept,
    discardPile: [...deck.discardPile, ...dumped],
  };
}

/** 依藏鋒層數同步手牌／牌堆中一劍霜寒的費用修正 */
export function syncYijianCostModifier(
  deck: BattleDeckState,
  cangfengStacks: number
): BattleDeckState {
  const reduction = Math.max(0, cangfengStacks);
  const map = (c: Card): Card =>
    c.id === "yijian" ? { ...c, costModifier: -reduction } : c;
  return {
    ...deck,
    hand: deck.hand.map(map),
    drawPile: deck.drawPile.map(map),
    discardPile: deck.discardPile.map(map),
    exhaustPile: deck.exhaustPile.map(map),
    powerPile: (deck.powerPile ?? []).map(map),
  };
}

/**
 * 尋霜：優先抽牌堆 → 棄牌堆，將既有一劍霜寒移到手牌。
 * 已在手牌則不複製，回傳 alreadyInHand。
 */
export function moveYijianToHand(deck: BattleDeckState): {
  deck: BattleDeckState;
  moved: boolean;
  alreadyInHand: boolean;
} {
  if (deck.hand.some((c) => c.id === "yijian")) {
    return { deck, moved: false, alreadyInHand: true };
  }

  const takeFrom = (
    pile: Card[]
  ): { card: Card; rest: Card[] } | null => {
    const idx = pile.findIndex((c) => c.id === "yijian");
    if (idx < 0) return null;
    const card = pile[idx];
    const rest = [...pile.slice(0, idx), ...pile.slice(idx + 1)];
    return { card, rest };
  };

  const fromDraw = takeFrom(deck.drawPile);
  if (fromDraw) {
    if (deck.hand.length >= MAX_HAND_SIZE) {
      return {
        deck: {
          ...deck,
          drawPile: fromDraw.rest,
          discardPile: [...deck.discardPile, fromDraw.card],
        },
        moved: false,
        alreadyInHand: false,
      };
    }
    return {
      deck: {
        ...deck,
        drawPile: fromDraw.rest,
        hand: [...deck.hand, fromDraw.card],
      },
      moved: true,
      alreadyInHand: false,
    };
  }

  const fromDiscard = takeFrom(deck.discardPile);
  if (fromDiscard) {
    if (deck.hand.length >= MAX_HAND_SIZE) {
      return { deck, moved: false, alreadyInHand: false };
    }
    return {
      deck: {
        ...deck,
        discardPile: fromDiscard.rest,
        hand: [...deck.hand, fromDiscard.card],
      },
      moved: true,
      alreadyInHand: false,
    };
  }

  return { deck, moved: false, alreadyInHand: false };
}

export function getCardHitCount(template?: CardTemplate): number {
  if (!template) return 1;
  for (const fx of template.effects) {
    if (fx.kind === "multi_damage") return Math.max(1, fx.hits);
  }
  return 1;
}

export const SWORD_TEMPLATE_IDS = Object.keys(
  SWORD_TEMPLATES
) as SwordCardTemplateId[];

export const ALL_TEMPLATE_IDS = Object.keys(
  CARD_TEMPLATES
) as CardTemplateId[];

export const COMBAT_HAND_SIZE = 4;
/** 回合開始基礎真元；加真元效果可突破此值 */
export const MAX_ENERGY = 3;

export function pickRandomTemplateIds(
  count: number,
  pool: CardTemplateId[] = SWORD_TEMPLATE_IDS
): CardTemplateId[] {
  const list = [...pool];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  const picked: CardTemplateId[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(list[i % list.length]);
  }
  return picked;
}

/** 過濾舊存檔中已移除的劍牌 id */
export function sanitizeSwordDeckIds(
  ids: CardTemplateId[]
): CardTemplateId[] {
  return ids.filter((id) => Boolean(CARD_TEMPLATES[id]));
}
