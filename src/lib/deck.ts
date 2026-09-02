import type { Card } from "@/types/card";

export interface CardInstance {
  instanceId: string;
  card: Card;
}

export interface DeckState {
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
}

export const HAND_SIZE = 4;
export const MAX_ENERGY = 3;

let instanceCounter = 0;

export function resetInstanceCounter(): void {
  instanceCounter = 0;
}

export function createCardInstance(card: Card, index: number): CardInstance {
  instanceCounter += 1;
  return {
    instanceId: `${card.id}_${index}_${instanceCounter}`,
    card,
  };
}

export function createInstancesFromTemplates(cards: Card[]): CardInstance[] {
  return cards.map((card, i) => createCardInstance(card, i));
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createDeckState(templates: Card[]): DeckState {
  return {
    drawPile: shuffle(createInstancesFromTemplates(templates)),
    hand: [],
    discardPile: [],
    exhaustPile: [],
  };
}

function reshuffleIfNeeded(state: DeckState): DeckState {
  if (state.drawPile.length > 0) return state;
  if (state.discardPile.length === 0) return state;
  return {
    ...state,
    drawPile: shuffle(state.discardPile),
    discardPile: [],
  };
}

/** 從牌庫抽 N 張牌入手牌，牌庫空時自動洗牌棄牌堆 */
export function drawCards(state: DeckState, count: number): DeckState {
  let current = state;
  const drawn: CardInstance[] = [];

  for (let i = 0; i < count; i++) {
    current = reshuffleIfNeeded(current);
    if (current.drawPile.length === 0) break;

    const [top, ...rest] = current.drawPile;
    current = { ...current, drawPile: rest };
    drawn.push(top);
  }

  return {
    ...current,
    hand: [...current.hand, ...drawn],
  };
}

/** 打出卡牌：從手牌移除，放入棄牌堆或消耗堆 */
export function playCardFromHand(
  state: DeckState,
  instanceId: string,
  options?: { exhaust?: boolean }
): { state: DeckState; played: CardInstance | null } {
  const index = state.hand.findIndex((c) => c.instanceId === instanceId);
  if (index === -1) return { state, played: null };

  const played = state.hand[index];
  const nextHand = state.hand.filter((_, i) => i !== index);

  if (options?.exhaust) {
    return {
      state: {
        ...state,
        hand: nextHand,
        exhaustPile: [...state.exhaustPile, played],
      },
      played,
    };
  }

  return {
    state: {
      ...state,
      hand: nextHand,
      discardPile: [...state.discardPile, played],
    },
    played,
  };
}

/** 補牌至目標手牌數 */
export function drawToHandSize(
  state: DeckState,
  targetSize = HAND_SIZE
): DeckState {
  const needed = targetSize - state.hand.length;
  if (needed <= 0) return state;
  return drawCards(state, needed);
}

/** 回合結束：清空手牌至棄牌堆 */
export function discardAllHand(state: DeckState): DeckState {
  if (state.hand.length === 0) return state;
  return {
    ...state,
    hand: [],
    discardPile: [...state.discardPile, ...state.hand],
  };
}

/** 從卡牌池隨機抽取 N 張（用於勝利獎勵） */
export function pickRandomCards(pool: Card[], count: number): Card[] {
  const shuffled = shuffle(pool);
  const picked: Card[] = [];
  const usedIds = new Set<string>();

  for (const card of shuffled) {
    if (picked.length >= count) break;
    if (!usedIds.has(card.id)) {
      picked.push(card);
      usedIds.add(card.id);
    }
  }

  // 若卡牌池不足 count 張，允許重複
  while (picked.length < count && shuffled.length > 0) {
    picked.push(shuffled[picked.length % shuffled.length]);
  }

  return picked;
}

export function getCardById(pool: Card[], id: string): Card | undefined {
  return pool.find((c) => c.id === id);
}

export function expandDeckTemplates(
  cardIds: string[],
  pool: Card[]
): Card[] {
  return cardIds
    .map((id) => getCardById(pool, id))
    .filter((c): c is Card => c !== undefined);
}
