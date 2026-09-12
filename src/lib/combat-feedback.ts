/**
 * 戰鬥受擊／出牌反饋時序（與 CombatView 出牌命中延遲對齊）。
 * 僅控制視覺層，不改數值結算。
 */

/** 出牌飛行到敵人的命中延遲（須與 CombatView impactDelayMs 一致） */
export const CARD_IMPACT_DELAY_MS = 280;

/** 霜白劍光 */
export const HIT_SLASH_MS = 150;

/** 劍光開始後，震動＋傷害數字 */
export const HIT_IMPACT_OFFSET_MS = 100;

/** 精靈左右震 */
export const HIT_SHAKE_MS = 180;

/** 劍光開始後，HP 條開始平滑下降 */
export const HP_BAR_DELAY_MS = 160;

/** HP 條 transition */
export const HP_BAR_TRANSITION_MS = 300;

/** 傷害數字浮現時長 */
export const DAMAGE_NUMBER_MS = 520;

/** HUD 數值 pulse */
export const STAT_PULSE_MS = 420;

/** 護罩閃現 */
export const SHIELD_AURA_MS = 380;

/** 傷害數字相對命中的出現時間（自出牌結算起算） */
export function damageNumberAppearAtMs(): number {
  return CARD_IMPACT_DELAY_MS + HIT_IMPACT_OFFSET_MS;
}
