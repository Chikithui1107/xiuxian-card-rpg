import { CARD_TEMPLATES, COMBAT_HAND_SIZE, MAX_ENERGY, discardHand, drawCards, playCardFromHand, type SwordCardTemplateId } from "@/lib/battle-deck";
import { INITIAL_COMBAT_BUFFS, clearSwordGuard, resolveCardEffects, tickNurtureSword, type CombatBuffs } from "@/lib/battle-resolve";
import { getEffectiveCost, type BattleDeckState } from "@/types/battle";

export const TUTORIAL_KEY = "xiuxian_baiye_tutorial_v1";
export type TutorialOutcome = "completed" | "skipped";
export function readTutorialOutcome(): TutorialOutcome | null {
  try {
    const value = localStorage.getItem(TUTORIAL_KEY);
    return value === "completed" || value === "skipped" ? value : null;
  } catch { return null; }
}
export function saveTutorialOutcome(outcome: TutorialOutcome): void {
  try {
    // Replaying and leaving early must not erase an earlier completion.
    if (readTutorialOutcome() !== "completed") localStorage.setItem(TUTORIAL_KEY, outcome);
  } catch { /* Private browsing: practice remains available. */ }
}
export type TutorialStep = "intent" | "guard" | "attack" | "end" | "charge" | "burst" | "free" | "won" | "lost";
export interface TutorialState {
  step: TutorialStep;
  deck: BattleDeckState;
  hp: number;
  enemyHp: number;
  energy: number;
  buffs: CombatBuffs;
  turn: number;
  busy: boolean;
  pendingDamage: number[];
  lastDamage: number | null;
}
export const PRACTICE_ENEMY_HP = 52;
export const PRACTICE_ATTACK = 6;
export const GUIDED_CARD: Partial<Record<TutorialStep, SwordCardTemplateId>> = {
  guard: "jiangang", attack: "fuxue", charge: "ningshuang", burst: "yijian",
};
export function createTutorialState(): TutorialState {
  // Script only the practice deck order. Use normal templates, costs and draw rules.
  // Independent IDs avoid resetting the live Run's global card instance counter.
  const ids: SwordCardTemplateId[] = ["jiangang", "fuxue", "fuxue", "lingtai", "ningshuang", "yijian", "jiangang", "fuxue"];
  const cards = ids.map((id, index) => ({ ...CARD_TEMPLATES[id], instanceId: `practice-${id}-${index}` }));
  return { step: "intent", deck: { hand: cards.slice(0, COMBAT_HAND_SIZE), drawPile: cards.slice(COMBAT_HAND_SIZE), discardPile: [], exhaustPile: [], powerPile: [] }, hp: 60, enemyHp: PRACTICE_ENEMY_HP, energy: MAX_ENERGY, buffs: { ...INITIAL_COMBAT_BUFFS }, turn: 1, busy: false, pendingDamage: [], lastDamage: null };
}
export function playTutorialCard(state: TutorialState, instanceId: string): TutorialState {
  if (state.busy || ["intent", "end", "won", "lost"].includes(state.step)) return state;
  const card = state.deck.hand.find(c => c.instanceId === instanceId);
  if (!card || getEffectiveCost(card) > state.energy) return state;
  const required = GUIDED_CARD[state.step];
  if (required && card.id !== required) return state;
  const template = CARD_TEMPLATES[card.id as SwordCardTemplateId];
  const result = resolveCardEffects(template, { hp: state.hp, energy: state.energy, ...state.buffs });
  const { hp: _hp, energy: _energy, ...buffs } = result.player;
  const afterPlay = playCardFromHand(state.deck, instanceId).deck;
  return { ...state, deck: drawCards(afterPlay, result.draw), buffs, energy: state.energy + result.energyDelta, pendingDamage: result.damageHits, busy: true, lastDamage: null };
}
export function impactTutorialCard(state: TutorialState): TutorialState {
  if (!state.busy) return state;
  const damage = state.pendingDamage[0] ?? 0;
  const enemyHp = Math.max(0, state.enemyHp - damage);
  const next: Partial<Record<TutorialStep, TutorialStep>> = { guard: "attack", attack: "end", charge: "burst", burst: "free" };
  return { ...state, enemyHp, pendingDamage: state.pendingDamage.slice(1), lastDamage: damage || null, busy: false, step: enemyHp === 0 ? "won" : next[state.step] ?? state.step };
}
export function endTutorialTurn(state: TutorialState): TutorialState {
  if (state.busy || (state.step !== "end" && state.step !== "free")) return state;
  return { ...state, deck: discardHand(state.deck), buffs: tickNurtureSword(state.buffs), busy: true, lastDamage: null };
}
export function drawTutorialTurn(state: TutorialState): TutorialState {
  if (!state.busy || state.hp <= 0) return state;
  return { ...state, turn: state.turn + 1, buffs: clearSwordGuard(state.buffs), energy: MAX_ENERGY, deck: drawCards(state.deck, COMBAT_HAND_SIZE), step: state.step === "end" ? "charge" : "free" };
}
