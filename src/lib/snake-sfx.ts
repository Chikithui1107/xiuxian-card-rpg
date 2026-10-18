import { ENEMY_ATTACK_WINDUP_MS, ENEMY_LUNGE_MS } from "@/lib/combat-feedback";

/** 青鱗靈蛇三式共用 public/audio/sfx/snake_hiss.wav，各自截不同片段 */
export type SnakeMove = "雙噬" | "毒牙" | "亂噬";

export interface SnakeHissClip {
  /** 從素材第幾秒開始截 */
  offsetSec: number;
  /** 遊戲內實際聽到的長度（已含淡出） */
  durationSec: number;
  peak: number;
  playbackRate: number;
  /** 濾掉低頻讓嘶聲更細 */
  highpassHz?: number;
}

export interface SnakeAttackTimeline {
  hiss: SnakeHissClip;
  /** 以起嘶為 0，每一咬的命中時間 */
  impactsMs: number[];
  /** 每一咬的突進動畫長度，命中落在突進結束那一幀 */
  lungeMs: number[];
}

const FULL_LUNGE_MS = ENEMY_ATTACK_WINDUP_MS + ENEMY_LUNGE_MS;

export const SNAKE_ATTACK_TIMELINES: Record<SnakeMove, SnakeAttackTimeline> = {
  雙噬: {
    hiss: { offsetSec: 0.03, durationSec: 0.25, peak: 0.65, playbackRate: 1 },
    impactsMs: [250, 400],
    lungeMs: [FULL_LUNGE_MS, 110],
  },
  毒牙: {
    hiss: { offsetSec: 0.18, durationSec: 0.18, peak: 0.7, playbackRate: 1.15 },
    impactsMs: [FULL_LUNGE_MS],
    lungeMs: [FULL_LUNGE_MS],
  },
  亂噬: {
    hiss: {
      offsetSec: 0.05,
      durationSec: 0.5,
      peak: 0.55,
      playbackRate: 1.1,
      highpassHz: 2800,
    },
    impactsMs: [220, 330, 440],
    lungeMs: [FULL_LUNGE_MS, 80, 80],
  },
};

/** 兩次突進之間至少收回一幀，CSS 動畫才會重新觸發 */
export const SNAKE_MIN_RETRACT_MS = 24;

export function isSnakeEnemy(
  enemy?: { id?: string; monsterSprite?: string } | null
): boolean {
  return (
    enemy?.id === "enemy_spirit_snake" || enemy?.monsterSprite === "spirit_snake"
  );
}

function isSnakeMove(label: string | undefined): label is SnakeMove {
  return label === "雙噬" || label === "毒牙" || label === "亂噬";
}

/**
 * 依實際段數補齊時間軸（數值調整後段數變了也不會越界）：
 * 多出的段沿用最後一段的間隔與突進長度。
 */
export function getSnakeAttackTimeline(
  enemy: { id?: string; monsterSprite?: string } | null | undefined,
  label: string | undefined,
  hitCount: number
): (SnakeAttackTimeline & { move: SnakeMove }) | null {
  if (!isSnakeEnemy(enemy) || !isSnakeMove(label) || hitCount < 1) return null;
  const base = SNAKE_ATTACK_TIMELINES[label];
  const impactsMs: number[] = [];
  const lungeMs: number[] = [];
  for (let i = 0; i < hitCount; i++) {
    if (i < base.impactsMs.length) {
      impactsMs.push(base.impactsMs[i]);
      lungeMs.push(base.lungeMs[i]);
      continue;
    }
    const n = base.impactsMs.length;
    const step = n > 1 ? base.impactsMs[n - 1] - base.impactsMs[n - 2] : FULL_LUNGE_MS + SNAKE_MIN_RETRACT_MS;
    impactsMs.push(impactsMs[i - 1] + step);
    lungeMs.push(base.lungeMs[n - 1]);
  }
  return { move: label, hiss: base.hiss, impactsMs, lungeMs };
}
