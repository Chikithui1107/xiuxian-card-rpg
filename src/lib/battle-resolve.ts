import type { CardTemplate } from "@/lib/battle-deck";

export interface PlayerBattleState {
  hp: number;
  energy: number;
  swordIntent: number;
  /** 劍罡：1 點抵 1 傷害，玩家回合開始清空 */
  swordGuard: number;
  /** 養劍層數：≥1 時一劍霜寒 ×2；回合結束 -1 */
  nurtureSword: number;
  /** 藏鋒待發層數 */
  cangfengStacks: number;
  /** 霜劍護主層數 */
  shuangjianStacks: number;
  /** 劍心澄明層數 */
  jianxinStacks: number;
}

export const INITIAL_COMBAT_BUFFS = {
  swordIntent: 0,
  swordGuard: 0,
  nurtureSword: 0,
  cangfengStacks: 0,
  shuangjianStacks: 0,
  jianxinStacks: 0,
};

export type CombatBuffs = typeof INITIAL_COMBAT_BUFFS;

/** @deprecated 舊閃避已移除；保留函式避免殘留 import 崩掉 */
export function rollStackDodge(_stacks: number): boolean {
  return false;
}

/** @deprecated */
export function getStackDodgeChance(_stacks: number): number {
  return 0;
}

export interface ResolveCardResult {
  player: PlayerBattleState;
  /** 逐段傷害（攻擊牌）；空陣列表示無傷害 */
  damageHits: number[];
  draw: number;
  energyDelta: number;
  /** 是否應在結算後賦予破綻 */
  applyVulnerability: boolean;
  /** 是否執行尋霜移牌 */
  findYijian: boolean;
  /** 本牌是否為攻擊牌（觸發／消耗破綻） */
  isAttack: boolean;
}

function floorDamage(n: number): number {
  return Math.max(0, Math.floor(n));
}

/**
 * 結算白夜牌效果。
 * 破綻倍率套用於本張攻擊牌全部 hit；不在此清除破綻（由呼叫端在攻擊後清除）。
 * 劍心澄明抽牌依「獲得劍意事件」次數計算，避免遞迴。
 */
export function resolveCardEffects(
  template: CardTemplate,
  player: PlayerBattleState,
  opts?: { enemyVulnerable?: boolean }
): ResolveCardResult {
  let next = { ...player };
  let damageHits: number[] = [];
  let draw = 0;
  let energyDelta = -template.cost;
  let applyVulnerability = false;
  let findYijian = false;
  let intentGainEvents = 0;
  const enemyVulnerable = Boolean(opts?.enemyVulnerable);
  const isAttack = Boolean(template.isAttack);

  const withVuln = (raw: number): number => {
    if (!isAttack || !enemyVulnerable) return floorDamage(raw);
    return floorDamage(raw * 1.5);
  };

  for (const fx of template.effects) {
    switch (fx.kind) {
      case "damage":
        damageHits = [withVuln(fx.amount)];
        break;
      case "multi_damage": {
        const per = withVuln(fx.amount);
        damageHits = Array.from({ length: Math.max(1, fx.hits) }, () => per);
        break;
      }
      case "damage_yijian": {
        let dmg = fx.base + next.swordIntent * fx.perIntent;
        if (next.nurtureSword >= 1) dmg *= 2;
        damageHits = [withVuln(dmg)];
        // 霜劍護主：每次打出一劍霜寒後獲劍罡
        if (next.shuangjianStacks > 0) {
          next = {
            ...next,
            swordGuard: next.swordGuard + 8 * next.shuangjianStacks,
          };
        }
        break;
      }
      case "gain_intent":
        next = { ...next, swordIntent: next.swordIntent + fx.amount };
        intentGainEvents += 1;
        break;
      case "gain_sword_guard":
        next = { ...next, swordGuard: next.swordGuard + fx.amount };
        break;
      case "gain_nurture":
        next = { ...next, nurtureSword: next.nurtureSword + fx.amount };
        break;
      case "draw":
        draw += fx.amount;
        break;
      case "gain_energy":
        energyDelta += fx.amount;
        break;
      case "apply_vulnerability":
        applyVulnerability = true;
        break;
      case "find_yijian":
        findYijian = true;
        break;
      case "power_cangfeng":
        next = { ...next, cangfengStacks: next.cangfengStacks + 1 };
        break;
      case "power_shuangjian":
        next = { ...next, shuangjianStacks: next.shuangjianStacks + 1 };
        break;
      case "power_jianxin":
        next = { ...next, jianxinStacks: next.jianxinStacks + 1 };
        break;
      case "karma":
        break;
    }
  }

  // 劍心澄明：每個獲得劍意事件抽 jianxinStacks 張（不遞迴產生新事件）
  if (intentGainEvents > 0 && next.jianxinStacks > 0) {
    draw += intentGainEvents * next.jianxinStacks;
  }

  return {
    player: next,
    damageHits,
    draw,
    energyDelta,
    applyVulnerability,
    findYijian,
    isAttack,
  };
}

/** 玩家回合結束：養劍 -1 */
export function tickNurtureSword(buffs: CombatBuffs): CombatBuffs {
  if (buffs.nurtureSword <= 0) return buffs;
  return { ...buffs, nurtureSword: Math.max(0, buffs.nurtureSword - 1) };
}

/** 玩家回合開始：清空劍罡 */
export function clearSwordGuard(buffs: CombatBuffs): CombatBuffs {
  if (buffs.swordGuard <= 0) return buffs;
  return { ...buffs, swordGuard: 0 };
}
