import type { CombatEnemy, EnemyIntent, EnemyIntentType } from "@/types/game";

export type { EnemyIntent, EnemyIntentType };

interface IntentTemplate {
  type: EnemyIntentType;
  /** 相對 attackDamage 的倍率；defend 等可改用 flat */
  valueScale?: number;
  flatValue?: number;
  hits?: number;
  label: string;
}

/** 妖狼：普通攻擊 → 普通攻擊 → 連擊 */
const WOLF_SCHEDULE: IntentTemplate[] = [
  { type: "attack", valueScale: 1, label: "撕咬" },
  { type: "attack", valueScale: 1, label: "撕咬" },
  { type: "multiAttack", valueScale: 0.75, hits: 2, label: "連撲" },
];

/** 劫修：攻擊 → 防禦 → 重擊 */
const BANDIT_SCHEDULE: IntentTemplate[] = [
  { type: "attack", valueScale: 1, label: "斬擊" },
  { type: "defend", flatValue: 8, label: "守勢" },
  { type: "attack", valueScale: 1.65, label: "重擊" },
];

/** 叛劍客（精英）：試探 → 架劍 → 三連斬 */
const TRAITOR_SCHEDULE: IntentTemplate[] = [
  { type: "attack", valueScale: 1, label: "試探" },
  { type: "defend", flatValue: 10, label: "架劍" },
  { type: "multiAttack", valueScale: 0.85, hits: 3, label: "三連斬" },
];

/** 血魔長老：血爪 → 蓄力 → 血爆 */
const ELDER_SCHEDULE: IntentTemplate[] = [
  { type: "attack", valueScale: 1, label: "血爪" },
  { type: "special", flatValue: 0, label: "蓄力" },
  { type: "attack", valueScale: 1.8, label: "血爆" },
];

const DEFAULT_SCHEDULE: IntentTemplate[] = [
  { type: "attack", valueScale: 1, label: "攻擊" },
];

function scheduleForEnemy(enemy: CombatEnemy): IntentTemplate[] {
  if (enemy.id === "enemy_wolf" || enemy.monsterSprite === "demon_wolf") {
    return WOLF_SCHEDULE;
  }
  if (enemy.id === "enemy_bandit" || enemy.monsterSprite === "bandit") {
    return BANDIT_SCHEDULE;
  }
  if (enemy.id === "enemy_traitor" || enemy.monsterSprite === "traitor") {
    return TRAITOR_SCHEDULE;
  }
  if (enemy.id === "enemy_elder" || enemy.monsterSprite === "blood_elder") {
    return ELDER_SCHEDULE;
  }
  if (enemy.attackPattern === "triple_slash") {
    return [
      {
        type: "multiAttack",
        valueScale: 1,
        hits: 3,
        label: enemy.attackPatternLabel?.split("（")[0] ?? "連斬",
      },
    ];
  }
  return DEFAULT_SCHEDULE;
}

function resolveTemplate(
  template: IntentTemplate,
  enemy: CombatEnemy
): EnemyIntent {
  let value =
    template.flatValue != null
      ? template.flatValue
      : Math.max(
          1,
          Math.floor(enemy.attackDamage * (template.valueScale ?? 1))
        );

  // 灼燒被動寫進鎖定值，避免預告與結算不一致
  if (
    enemy.passive === "burn" &&
    (template.type === "attack" || template.type === "multiAttack")
  ) {
    value = Math.floor(value * 1.1);
  }

  return {
    type: template.type,
    value,
    hits: template.hits,
    label: template.label,
  };
}

/** 依目前 intentIndex 鎖定 pendingIntent（開戰／推進時呼叫） */
export function lockEnemyIntent(enemy: CombatEnemy): CombatEnemy {
  const schedule = scheduleForEnemy(enemy);
  const index = enemy.intentIndex ?? 0;
  const template = schedule[index % schedule.length];
  return {
    ...enemy,
    intentIndex: index % schedule.length,
    pendingIntent: resolveTemplate(template, enemy),
  };
}

/** 敵人行動結束後推進到下一動並鎖定數值 */
export function advanceEnemyIntent(enemy: CombatEnemy): CombatEnemy {
  const schedule = scheduleForEnemy(enemy);
  const next = ((enemy.intentIndex ?? 0) + 1) % schedule.length;
  return lockEnemyIntent({ ...enemy, intentIndex: next });
}

/** 讀取已鎖定 intent；若缺失則現場鎖定（相容舊存檔形狀） */
export function getEnemyIntent(enemy: CombatEnemy): EnemyIntent {
  if (enemy.pendingIntent) return enemy.pendingIntent;
  return lockEnemyIntent(enemy).pendingIntent!;
}

export function totalIntentDamage(intent: EnemyIntent): number {
  if (intent.type === "attack") return intent.value;
  if (intent.type === "multiAttack") {
    return intent.value * Math.max(1, intent.hits ?? 1);
  }
  return 0;
}

/** 玩家傷害經敵人護盾 */
export function applyDamageToEnemy(
  enemy: CombatEnemy,
  rawDamage: number
): CombatEnemy {
  let remaining = Math.max(0, Math.floor(rawDamage));
  let block = enemy.block ?? 0;
  if (block > 0 && remaining > 0) {
    const absorbed = Math.min(block, remaining);
    block -= absorbed;
    remaining -= absorbed;
  }
  return {
    ...enemy,
    block,
    currentHp: Math.max(0, enemy.currentHp - remaining),
  };
}

/** 敵人回合開始：清除上回合護盾 */
export function clearEnemyBlock(enemy: CombatEnemy): CombatEnemy {
  if (!enemy.block) return enemy;
  return { ...enemy, block: 0 };
}
