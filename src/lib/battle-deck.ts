import type { BattleDeckState, Card } from "@/types/battle";
import {
  KARMA_TEMPLATES,
  type KarmaCardTemplateId,
} from "@/lib/karma-deck";

export type SwordCardTemplateId =
  | "fuxue"
  | "tuxu"
  | "lingtai"
  | "cangfeng"
  | "ningshuang"
  | "yijian";

export type CardTemplateId = SwordCardTemplateId | KarmaCardTemplateId;

export type CardEffect =
  | { kind: "damage"; amount: number }
  | { kind: "damage_consume_intent"; base: number; perStack: number }
  | { kind: "gain_intent"; amount: number }
  | { kind: "gain_dodge"; amount: number }
  | { kind: "draw"; amount: number }
  | { kind: "gain_energy"; amount: number }
  | { kind: "refund_if_intent_gte"; threshold: number; amount: number }
  | { kind: "buff_next_sword"; percent: number }
  | { kind: "karma" };

export interface CardTemplate {
  id: CardTemplateId;
  name: string;
  type: string;
  cost: number;
  description: string;
  /** 卡面插畫 public 路徑；缺省用統一 placeholder */
  art?: string;
  isExhaust?: boolean;
  sword?: boolean;
  effects: CardEffect[];
}

/** 無專屬插畫時的統一占位 */
export const CARD_ART_PLACEHOLDER = "/cards/card-art-placeholder.svg";

export function resolveCardArt(art?: string | null): string {
  return art && art.length > 0 ? art : CARD_ART_PLACEHOLDER;
}

const SWORD_TEMPLATES: Record<SwordCardTemplateId, CardTemplate> = {
  fuxue: {
    id: "fuxue",
    name: "拂雪流光",
    type: "基礎劍招",
    cost: 1,
    description: "造成 6 點劍氣傷害。獲得 1 層【劍意】。",
    sword: true,
    effects: [
      { kind: "damage", amount: 6 },
      { kind: "gain_intent", amount: 1 },
    ],
  },
  tuxu: {
    id: "tuxu",
    name: "踏虛掠影",
    type: "劍步身法",
    cost: 1,
    description: "獲得 1 層【閃避】（1 層 50%、2 層 100% 免疫下次攻擊）。",
    effects: [{ kind: "gain_dodge", amount: 1 }],
  },
  lingtai: {
    id: "lingtai",
    name: "靈台觀劍",
    type: "劍道悟性",
    cost: 1,
    description: "抽 2 張牌。若【劍意】≥2，返還 1 點真元。",
    effects: [
      { kind: "draw", amount: 2 },
      { kind: "refund_if_intent_gte", threshold: 2, amount: 1 },
    ],
  },
  cangfeng: {
    id: "cangfeng",
    name: "藏鋒蘊雷",
    type: "劍道蓄勢",
    cost: 0,
    description: "獲得 1 點真元。打出後【消耗】（本場不再出現）。",
    isExhaust: true,
    effects: [{ kind: "gain_energy", amount: 1 }],
  },
  ningshuang: {
    id: "ningshuang",
    name: "凝霜養魂",
    type: "劍意增幅",
    cost: 1,
    description: "獲得 2 層【劍意】，下一張劍法傷害 +50%。",
    effects: [
      { kind: "gain_intent", amount: 2 },
      { kind: "buff_next_sword", percent: 0.5 },
    ],
  },
  yijian: {
    id: "yijian",
    name: "一劍霜寒",
    type: "絕技終結",
    cost: 2,
    description: "造成 15 點傷害。清空【劍意】，每層額外 +6 傷害。",
    sword: true,
    effects: [{ kind: "damage_consume_intent", base: 15, perStack: 6 }],
  },
};

function karmaToCardTemplate(
  id: KarmaCardTemplateId
): CardTemplate {
  const k = KARMA_TEMPLATES[id];
  return {
    id: k.id,
    name: k.name,
    type: k.type,
    cost: k.cost,
    description: k.description,
    art: k.art,
    isExhaust: k.isExhaust,
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
  return { drawPile, hand, discardPile: [], exhaustPile: [] };
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

  return { ...state, drawPile: newDraw, hand: newHand, discardPile: newDiscard };
};

export function playCardFromHand(
  deck: BattleDeckState,
  instanceId: string
): { deck: BattleDeckState; played: Card | null } {
  const index = deck.hand.findIndex((c) => c.instanceId === instanceId);
  if (index === -1) return { deck, played: null };

  const played = deck.hand[index];
  const hand = deck.hand.filter((_, i) => i !== index);

  if (played.isExhaust) {
    return {
      deck: { ...deck, hand, exhaustPile: [...deck.exhaustPile, played] },
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

export function discardHand(deck: BattleDeckState): BattleDeckState {
  if (deck.hand.length === 0) return deck;
  return {
    ...deck,
    hand: [],
    discardPile: [
      ...deck.discardPile,
      ...deck.hand.map((c) => ({ ...c, costModifier: undefined })),
    ],
  };
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
