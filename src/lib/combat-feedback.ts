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

/** 霜白劍光（可略早於 impact 起，覆蓋命中幀） */
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

/* —— 敵人行動／玩家受擊 —— */

/** 棄牌後 Intent 高亮 */
export const ENEMY_INTENT_HIGHLIGHT_MS = 120;

/** 突進前搖 */
export const ENEMY_ATTACK_WINDUP_MS = 100;

/** 突進至最前點（此時 impact） */
export const ENEMY_LUNGE_MS = 90;

/** 回到原位 */
export const ENEMY_RETURN_MS = 120;

/** 連擊間隔 */
export const ENEMY_MULTI_HIT_GAP_MS = 130;

/** 護盾破裂 → HP 傷害之間的短間隔 */
export const SHIELD_BREAK_TO_HP_MS = 110;

/** 玩家受擊震動 */
export const PLAYER_HIT_SHAKE_MS = 180;

/** 玩家 HP 條下降 */
export const PLAYER_HP_TRANSITION_MS = 300;

/** 非攻擊行動展示時間 */
export const ENEMY_SUPPORT_ACTION_MS = 280;

export type PlayerImpactKind =
  | "hp"
  | "shield"
  | "shieldBreak"
  | "dodge";

/** 玩家受擊統一 feedback（同一幀聲＋震＋數字＋條） */
export interface PlayerImpactFeedback {
  id: number;
  kind: PlayerImpactKind;
  /** 本次顯示的數字（護盾或 HP） */
  amount: number;
  displayHp: number;
  displayBlock: number;
}

export interface EnemyTurnPlan {
  intentType: string;
  label: string;
  dodged: boolean;
  /** 每段原始傷害（未扣盾） */
  hits: number[];
  defendValue: number;
  kind: "attack" | "defend" | "buff" | "debuff" | "special" | "idle";
}

/** 把單段 raw 傷害拆成護盾／破盾／HP 步驟（僅規劃，不改狀態） */
export function planPlayerHitSteps(
  block: number,
  rawDamage: number
): Array<{ kind: "shield" | "shieldBreak" | "hp"; amount: number }> {
  const raw = Math.max(0, Math.floor(rawDamage));
  if (raw <= 0) return [];
  if (block <= 0) return [{ kind: "hp", amount: raw }];
  if (block >= raw) return [{ kind: "shield", amount: raw }];
  return [
    { kind: "shieldBreak", amount: block },
    { kind: "hp", amount: raw - block },
  ];
}
