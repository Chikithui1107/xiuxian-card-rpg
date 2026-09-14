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

/** 青鱗靈蛇：纏身 → 毒牙 → 雙噬 */
const SPIRIT_SNAKE_SCHEDULE: IntentTemplate[] = [
  { type: "defend", flatValue: 6, label: "纏身" },
  { type: "attack", valueScale: 1.25, label: "毒牙" },
  { type: "multiAttack", valueScale: 0.7, hits: 2, label: "雙噬" },
];

/** 叛劍客（精英）：試探 → 架劍 → 三連斬 */
const TRAITOR_SCHEDULE: IntentTemplate[] = [
  { type: "attack", valueScale: 1, label: "試探" },
  { type: "defend", flatValue: 10, label: "架劍" },
  { type: "multiAttack", valueScale: 0.85, hits: 3, label: "三連斬" },
];

/** 裂石猿：護身 → 碎岩拳 → 蓄勢 → 崩山 */
const STONE_APE_SCHEDULE: IntentTemplate[] = [
  { type: "defend", flatValue: 12, label: "護身" },
  { type: "attack", valueScale: 1.15, label: "碎岩拳" },
  { type: "special", flatValue: 0, label: "蓄勢" },
  { type: "attack", valueScale: 2.0, label: "崩山" },
];

/** 噬靈虎王：虎爪 → 護體 → 連撲 → 怒吼 → 噬靈撲殺 */
const DEMONIC_TIGER_SCHEDULE: IntentTemplate[] = [
  { type: "attack", valueScale: 1, label: "虎爪" },
  { type: "defend", flatValue: 10, label: "妖風護體" },
  { type: "multiAttack", valueScale: 0.65, hits: 3, label: "連撲" },
  { type: "special", flatValue: 0, label: "怒吼" },
  { type: "attack", valueScale: 2.1, label: "噬靈撲殺" },
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

const ENEMY_INTENT_SCHEDULES: Record<string, IntentTemplate[]> = {
  enemy_wolf: WOLF_SCHEDULE,
  enemy_bandit: BANDIT_SCHEDULE,
  enemy_spirit_snake: SPIRIT_SNAKE_SCHEDULE,
  enemy_traitor: TRAITOR_SCHEDULE,
  enemy_stone_ape: STONE_APE_SCHEDULE,
  enemy_demonic_tiger: DEMONIC_TIGER_SCHEDULE,
  enemy_elder: ELDER_SCHEDULE,
};

/** sprite → schedule（舊存檔／無 id 時） */
const SPRITE_INTENT_SCHEDULES: Record<string, IntentTemplate[]> = {
  demon_wolf: WOLF_SCHEDULE,
  bandit: BANDIT_SCHEDULE,
  spirit_snake: SPIRIT_SNAKE_SCHEDULE,
  traitor: TRAITOR_SCHEDULE,
  stone_ape: STONE_APE_SCHEDULE,
  demonic_tiger: DEMONIC_TIGER_SCHEDULE,
  blood_elder: ELDER_SCHEDULE,
};

function scheduleForEnemy(enemy: CombatEnemy): IntentTemplate[] {
  const byId = ENEMY_INTENT_SCHEDULES[enemy.id];
  if (byId) return byId;

  if (enemy.monsterSprite) {
    const bySprite = SPRITE_INTENT_SCHEDULES[enemy.monsterSprite];
    if (bySprite) return bySprite;
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
