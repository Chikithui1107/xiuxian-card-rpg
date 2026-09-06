import type { BattleDeckState, Card } from "@/types/battle";
import {
  discardCardFromHand,
  shuffle,
  type CardTemplate,
} from "@/lib/battle-deck";
import {
  cardMatchesAspect,
  getKarmaTemplate,
  type KarmaAspect,
  type KarmaCardTemplate,
} from "@/lib/karma-deck";

export interface PlayedCardRecord {
  templateId: string;
  instanceId: string;
  aspect: KarmaAspect;
}

export interface KarmaCombatState {
  yinPullUsedThisTurn: boolean;
  yangPullUsedThisTurn: boolean;
  karmaMarks: number;
  cardsPlayedThisTurn: PlayedCardRecord[];
  cardsPlayedLastTurn: PlayedCardRecord[];
  /** 本回合受到的傷害（供因果輪轉） */
  damageTakenThisTurn: number;
  /** 下一個玩家回合第一次傷害加成 */
  pendingFirstAttackBonus: number;
  firstAttackBonusActive: boolean;
  nextTurnEnergyBonus: number;
  nextTurnYinDamageBonus: number;
  nextTurnYangExtraMark: boolean;
  /** 種因得果：等待此果牌實例被打出 */
  zhongyinPendingFruitInstanceId: string | null;
  /** 因果斷絕：本次因牌觸發的果牽引改為立即免費打出 */
  duanjueAutoPlayPull: boolean;
  /** 本回合因牌傷害加成（善果自報延續） */
  yinDamageBonusThisTurn: number;
  yangExtraMarkThisTurn: boolean;
  /** 玩家護盾（因果輪轉） */
  block: number;
  /** 本回合已打出因果輪轉：敵方攻擊後將傷害 30% 轉入下回合第一次傷害 */
  lunzhuanArmed: boolean;
}

export const INITIAL_KARMA_STATE: KarmaCombatState = {
  yinPullUsedThisTurn: false,
  yangPullUsedThisTurn: false,
  karmaMarks: 0,
  cardsPlayedThisTurn: [],
  cardsPlayedLastTurn: [],
  damageTakenThisTurn: 0,
  pendingFirstAttackBonus: 0,
  firstAttackBonusActive: false,
  nextTurnEnergyBonus: 0,
  nextTurnYinDamageBonus: 0,
  nextTurnYangExtraMark: false,
  zhongyinPendingFruitInstanceId: null,
  duanjueAutoPlayPull: false,
  yinDamageBonusThisTurn: 0,
  yangExtraMarkThisTurn: false,
  block: 0,
  lunzhuanArmed: false,
};

export function beginKarmaPlayerTurn(
  state: KarmaCombatState
): KarmaCombatState {
  return {
    ...state,
    yinPullUsedThisTurn: false,
    yangPullUsedThisTurn: false,
    cardsPlayedLastTurn: state.cardsPlayedThisTurn,
    cardsPlayedThisTurn: [],
    damageTakenThisTurn: 0,
    firstAttackBonusActive: state.pendingFirstAttackBonus > 0,
    yinDamageBonusThisTurn: state.nextTurnYinDamageBonus,
    yangExtraMarkThisTurn: state.nextTurnYangExtraMark,
    nextTurnYinDamageBonus: 0,
    nextTurnYangExtraMark: false,
    zhongyinPendingFruitInstanceId: null,
    duanjueAutoPlayPull: false,
    lunzhuanArmed: false,
  };
}

/** 回合結束：失效本回合費用減免（牽引 −1）；輪轉轉化在敵方攻擊後執行 */
export function endKarmaPlayerTurn(
  state: KarmaCombatState,
  deck: BattleDeckState
): { state: KarmaCombatState; deck: BattleDeckState } {
  const clearMod = (c: Card): Card =>
    c.costModifier
      ? { ...c, costModifier: undefined }
      : c;

  const nextDeck: BattleDeckState = {
    drawPile: deck.drawPile.map(clearMod),
    hand: deck.hand.map(clearMod),
    discardPile: deck.discardPile.map(clearMod),
    exhaustPile: deck.exhaustPile.map(clearMod),
  };

  return {
    deck: nextDeck,
    state: {
      ...state,
      zhongyinPendingFruitInstanceId: null,
      duanjueAutoPlayPull: false,
    },
  };
}

/** 敵方攻擊後：若本回合打過因果輪轉，將受到傷害的 30% 轉入下回合第一次傷害 */
export function convertLunzhuanAfterEnemyAttack(
  state: KarmaCombatState
): KarmaCombatState {
  if (!state.lunzhuanArmed) return state;
  const bonus = Math.floor(state.damageTakenThisTurn * 0.3);
  return {
    ...state,
    lunzhuanArmed: false,
    pendingFirstAttackBonus: state.pendingFirstAttackBonus + bonus,
    damageTakenThisTurn: 0,
  };
}

export function clearKarmaMarksOnCombatEnd(
  state: KarmaCombatState
): KarmaCombatState {
  return { ...INITIAL_KARMA_STATE, block: 0 };
}

export function applyPlayerDamageThroughBlock(
  state: KarmaCombatState,
  rawDamage: number
): { state: KarmaCombatState; hpDamage: number } {
  if (rawDamage <= 0) return { state, hpDamage: 0 };
  const blocked = Math.min(state.block, rawDamage);
  const hpDamage = rawDamage - blocked;
  return {
    state: {
      ...state,
      block: state.block - blocked,
      damageTakenThisTurn: state.damageTakenThisTurn + rawDamage,
    },
    hpDamage,
  };
}

function countAspectInHand(
  hand: Card[],
  aspect: "yin" | "yang",
  excludeInstanceId?: string
): number {
  return hand.filter(
    (c) =>
      c.instanceId !== excludeInstanceId && cardMatchesAspect(c, aspect)
  ).length;
}

/** 從抽牌堆抽出指定面向的牌（不足則洗棄牌；仍無則跳過） */
export function drawAspectFromDeck(
  deck: BattleDeckState,
  aspect: "yin" | "yang",
  count: number
): { deck: BattleDeckState; drawn: Card[] } {
  let drawPile = [...deck.drawPile];
  let discardPile = [...deck.discardPile];
  let hand = [...deck.hand];
  const drawn: Card[] = [];

  const refill = () => {
    if (drawPile.length === 0 && discardPile.length > 0) {
      drawPile = shuffle(discardPile);
      discardPile = [];
    }
  };

  for (let n = 0; n < count; n++) {
    refill();
    let idx = drawPile.findIndex((c) => cardMatchesAspect(c, aspect));
    if (idx === -1) {
      // 整堆都沒有：把棄牌洗回再找一次
      if (discardPile.length > 0) {
        drawPile = shuffle([...drawPile, ...discardPile]);
        discardPile = [];
        idx = drawPile.findIndex((c) => cardMatchesAspect(c, aspect));
      }
    }
    if (idx === -1) break;
    const [card] = drawPile.splice(idx, 1);
    if (hand.length < 10) {
      hand.push(card);
      drawn.push(card);
    } else {
      discardPile.push(card);
    }
  }

  return {
    deck: {
      ...deck,
      drawPile,
      discardPile,
      hand,
      exhaustPile: deck.exhaustPile,
    },
    drawn,
  };
}

/** 【因果相生】牽引：從牌庫抽對應面，費用 −1；若無則跳過 */
export function pullKarmaCard(
  deck: BattleDeckState,
  pullAspect: "yin" | "yang"
): { deck: BattleDeckState; pulled: Card | null } {
  const { deck: next, drawn } = drawAspectFromDeck(deck, pullAspect, 1);
  if (drawn.length === 0) return { deck, pulled: null };
  const pulled: Card = {
    ...drawn[0],
    pulledByKarma: true,
    costModifier: -1,
  };
  const hand = next.hand.map((c) =>
    c.instanceId === pulled.instanceId ? pulled : c
  );
  return { deck: { ...next, hand }, pulled };
}

export interface KarmaPlayContext {
  template: CardTemplate;
  karmaTemplate: KarmaCardTemplate;
  card: Card;
  deck: BattleDeckState;
  energy: number;
  karma: KarmaCombatState;
  /** 是否為宿因重演／牽引立即打出（不耗費、不觸發相生） */
  freeReplay?: boolean;
  suppressPassive?: boolean;
}

export interface KarmaPlayResult {
  deck: BattleDeckState;
  energy: number;
  karma: KarmaCombatState;
  damage: number;
  /** 需要玩家自選棄牌 */
  needsDiscardChoice?: { aspect: "yin" | "yang" };
  /** 需要立即免費打出的牽引果牌 */
  autoPlayCard?: Card;
  /** 宿因重演佇列 */
  replayQueue?: PlayedCardRecord[];
  feelToast?: string;
}

/**
 * 結算一張因果牌的專屬效果（不含通用抽牌／劍意）。
 * 費用已由呼叫端扣除（重演／免費打出除外）。
 */
export function resolveKarmaCardPlay(ctx: KarmaPlayContext): KarmaPlayResult {
  const { karmaTemplate: kt, card, freeReplay, suppressPassive } = ctx;
  let deck = ctx.deck;
  let energy = ctx.energy;
  let karma = { ...ctx.karma };
  let damage = 0;
  let feelToast: string | undefined;
  let needsDiscardChoice: KarmaPlayResult["needsDiscardChoice"];
  let autoPlayCard: Card | undefined;
  let replayQueue: PlayedCardRecord[] | undefined;

  const yinBonus = karma.yinDamageBonusThisTurn;
  const boostYin = (raw: number) =>
    yinBonus > 0 && (kt.aspect === "yin" || kt.aspect === "both")
      ? Math.floor(raw * (1 + yinBonus))
      : raw;

  const applyFirstAttackBonus = (raw: number) => {
    if (!karma.firstAttackBonusActive || karma.pendingFirstAttackBonus <= 0) {
      return raw;
    }
    const bonus = karma.pendingFirstAttackBonus;
    karma = {
      ...karma,
      pendingFirstAttackBonus: 0,
      firstAttackBonusActive: false,
    };
    return raw + bonus;
  };

  // —— 各牌效果 ——
  switch (kt.id) {
    case "qiandhen": {
      let dmg = 10;
      if (karma.karmaMarks > 0) dmg = Math.floor(dmg * 1.5);
      damage = applyFirstAttackBonus(boostYin(dmg));
      break;
    }
    case "zhongyin": {
      damage = applyFirstAttackBonus(boostYin(15));
      break;
    }
    case "sheyin": {
      const yinInHand = deck.hand.filter((c) => cardMatchesAspect(c, "yin"));
      if (yinInHand.length === 0) {
        feelToast = "手中無因牌可棄";
      } else {
        needsDiscardChoice = { aspect: "yin" };
      }
      break;
    }
    case "suye": {
      let dmg = 25;
      const yangCount = countAspectInHand(deck.hand, "yang");
      if (yangCount >= 2) dmg += 15;
      damage = applyFirstAttackBonus(boostYin(dmg));
      if (yangCount >= 1) {
        karma = { ...karma, karmaMarks: karma.karmaMarks + 1 };
      }
      break;
    }
    case "duanjue": {
      karma = {
        ...karma,
        nextTurnEnergyBonus: karma.nextTurnEnergyBonus + 3,
        duanjueAutoPlayPull: true,
      };
      feelToast = "下回合真元 +3";
      break;
    }
    case "lunzhuan": {
      karma = {
        ...karma,
        block: karma.block + 10,
        lunzhuanArmed: true,
      };
      break;
    }
    case "kuguo": {
      let marks = 1;
      const yinPlayed = karma.cardsPlayedThisTurn.filter(
        (p) => p.aspect === "yin" || p.aspect === "both"
      ).length;
      if (yinPlayed >= 2) marks += 1;
      if (karma.yangExtraMarkThisTurn) marks += 1;
      karma = { ...karma, karmaMarks: karma.karmaMarks + marks };
      break;
    }
    case "guosheng": {
      const yangInHand = deck.hand.filter((c) => cardMatchesAspect(c, "yang"));
      if (yangInHand.length === 0) {
        feelToast = "手中無果牌可棄";
      } else {
        needsDiscardChoice = { aspect: "yang" };
      }
      break;
    }
    case "shanguo": {
      const prev = karma.cardsPlayedThisTurn[karma.cardsPlayedThisTurn.length - 1];
      if (!prev) {
        feelToast = "本回合尚無上一張牌";
      } else if (prev.aspect === "yin" || prev.aspect === "both") {
        karma = { ...karma, nextTurnYinDamageBonus: 0.75 };
        feelToast = "下回合因牌傷害 +75%";
      } else if (prev.aspect === "yang") {
        karma = { ...karma, nextTurnYangExtraMark: true };
        feelToast = "下回合果牌額外印記";
      }
      break;
    }
    case "suyin": {
      replayQueue = karma.cardsPlayedLastTurn.filter((p) => p.templateId !== "suyin");
      if (replayQueue.length === 0) feelToast = "上回合無牌可重演";
      break;
    }
    case "yinian": {
      const marks = karma.karmaMarks;
      let dmg = 20 + marks * 10;
      if (marks >= 5) dmg = Math.floor(dmg * 1.5);
      damage = applyFirstAttackBonus(boostYin(dmg));
      karma = { ...karma, karmaMarks: 0 };
      break;
    }
  }

  // 種因得果：打出被牽引的果牌 → 追加 8
  if (
    karma.zhongyinPendingFruitInstanceId &&
    card.instanceId === karma.zhongyinPendingFruitInstanceId
  ) {
    damage += 8;
    karma = { ...karma, zhongyinPendingFruitInstanceId: null };
    feelToast = "種因得果・追加 8";
  }

  // 果牌額外印記（善果自報延續）— 苦果已處理；其他果牌出牌也加？
  // 規則：下回合打出的所有果牌都會額外附加 1 層 — 在 kuguo 已加；其他果牌也需要
  if (
    karma.yangExtraMarkThisTurn &&
    (kt.aspect === "yang" || kt.aspect === "both") &&
    kt.id !== "kuguo" &&
    kt.id !== "yinian"
  ) {
    karma = { ...karma, karmaMarks: karma.karmaMarks + 1 };
  }

  // 記錄出牌（重演的牌也記錄到本回合，供後續參考）
  if (!freeReplay) {
    karma = {
      ...karma,
      cardsPlayedThisTurn: [
        ...karma.cardsPlayedThisTurn,
        {
          templateId: kt.id,
          instanceId: card.instanceId,
          aspect: kt.aspect,
        },
      ],
    };
  }

  // 【因果相生】
  const canPassive =
    !suppressPassive &&
    !freeReplay &&
    !card.pulledByKarma &&
    !kt.suppressKarmaPassive &&
    kt.aspect !== "both";

  if (canPassive) {
    if (kt.aspect === "yin" && !karma.yinPullUsedThisTurn) {
      karma = { ...karma, yinPullUsedThisTurn: true };
      if (karma.duanjueAutoPlayPull) {
        const { deck: d2, pulled } = pullKarmaCard(deck, "yang");
        deck = d2;
        karma = { ...karma, duanjueAutoPlayPull: false };
        if (pulled) {
          // 從手牌取出改為立即打出
          const without = {
            ...deck,
            hand: deck.hand.filter((c) => c.instanceId !== pulled.instanceId),
          };
          deck = without;
          autoPlayCard = { ...pulled, costModifier: undefined, pulledByKarma: true };
          if (kt.id === "zhongyin") {
            karma = {
              ...karma,
              zhongyinPendingFruitInstanceId: pulled.instanceId,
            };
          }
        }
      } else {
        const { deck: d2, pulled } = pullKarmaCard(deck, "yang");
        deck = d2;
        if (pulled) {
          feelToast = feelToast ?? `牽引・${pulled.name}`;
          if (kt.id === "zhongyin") {
            karma = {
              ...karma,
              zhongyinPendingFruitInstanceId: pulled.instanceId,
            };
          }
        }
      }
    } else if (kt.aspect === "yang" && !karma.yangPullUsedThisTurn) {
      karma = { ...karma, yangPullUsedThisTurn: true };
      const { deck: d2, pulled } = pullKarmaCard(deck, "yin");
      deck = d2;
      if (pulled) feelToast = feelToast ?? `牽引・${pulled.name}`;
    }
  }

  // 清理斷絕標記（若因牌未觸發牽引）
  if (kt.id === "duanjue" && !autoPlayCard) {
    karma = { ...karma, duanjueAutoPlayPull: false };
  }

  return {
    deck,
    energy,
    karma,
    damage,
    needsDiscardChoice,
    autoPlayCard,
    replayQueue,
    feelToast,
  };
}

export function finishAspectDiscardAndDraw(
  deck: BattleDeckState,
  discardInstanceId: string,
  drawAspect: "yin" | "yang"
): BattleDeckState {
  const afterDiscard = discardCardFromHand(deck, discardInstanceId);
  const { deck: afterDraw } = drawAspectFromDeck(afterDiscard, drawAspect, 2);
  return afterDraw;
}
