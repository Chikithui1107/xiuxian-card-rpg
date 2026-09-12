/**
 * 戰鬥攻擊節奏：出牌 → windup → 統一 impact。
 * 音效／震動／傷害數字／HP 必須由同一個 impact 觸發，不可各自 setTimeout。
 */

/** 卡牌飛向目標 */
export const CARD_FLIGHT_MS = 140;

/** 劍光／攻擊特效略早於命中（windup） */
export const ATTACK_WINDUP_MS = 140;

/** ★ 命中點：sound + shake + number + HP 同一幀 */
export const IMPACT_AT_MS = 170;

/** 立繪 hit shake */
export const HIT_SHAKE_MS = 160;

/** 霜白劍光（可略早於 impact 起，覆蓋命中瞬間） */
export const HIT_SLASH_MS = 180;

/** HP 條平滑下降（impact 起算） */
export const HP_BAR_TRANSITION_MS = 160;

/** 傷害數字浮現 */
export const DAMAGE_NUMBER_MS = 520;

/** HUD 數值 pulse */
export const STAT_PULSE_MS = 420;

/** 護罩閃現 */
export const SHIELD_AURA_MS = 380;

/** 出牌扇形凍結：略長於飛行，不影響手牌幾何 */
export const PLAY_LAYOUT_HOLD_MS = 220;

/** 一次命中的視覺／結算快照（由 triggerImpact 寫入） */
export interface CombatImpactFeedback {
  id: number;
  damage: number;
  displayHp: number;
  frostSlash: boolean;
}
