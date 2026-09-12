"use client";

const REALM_STEPS = [
  { chapter: "第一境", realm: "引氣入道" },
  { chapter: "第二境", realm: "金丹大道" },
  { chapter: "第三境", realm: "元嬰出世" },
  { chapter: "第四境", realm: "化神問道" },
  { chapter: "第五境", realm: "渡劫飛升" },
] as const;

export const MAX_CALAMITY_LEVEL = 10;

export function getCalamityLabel(level: number): string {
  if (level <= 0) return "凡途";
  const numerals = [
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十",
  ];
  return `${numerals[level - 1] ?? level}重劫`;
}

interface CultivationStartViewProps {
  maxCalamityLevel: number;
  selectedCalamity: number;
  onCalamityChange: (level: number) => void;
  onStart: () => void;
}

export function CultivationStartView({
  maxCalamityLevel,
  selectedCalamity,
  onCalamityChange,
  onStart,
}: CultivationStartViewProps) {
  const cappedMax = Math.max(0, Math.min(MAX_CALAMITY_LEVEL, maxCalamityLevel));
  const level = Math.max(0, Math.min(cappedMax, selectedCalamity));
  const hpBonus = Math.round(level * 8);
  const atkBonus = Math.round(level * 5);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4 pt-3">
      <div className="mb-4 text-center">
        <p className="zone-label text-[#8a7340]">仙途試煉</p>
        <h2 className="mt-1 text-lg font-bold tracking-[0.28em] text-[#c9a84c]">
          五境連闖 · 一世修行
        </h2>
      </div>

      <div className="glass-panel-gold mx-auto w-full max-w-md px-4 py-4">
        <ul className="space-y-0">
          {REALM_STEPS.map((step, index) => (
            <li key={step.chapter} className="text-center">
              <p className="text-[11px] tracking-[0.2em] text-stone-500">
                {step.chapter}
              </p>
              <p className="mt-0.5 text-sm font-semibold tracking-[0.18em] text-[#e8e0d4]">
                {step.realm}
              </p>
              {index < REALM_STEPS.length - 1 && (
                <p className="py-1.5 text-[10px] text-[#8a7340]/70" aria-hidden>
                  ↓
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto mt-5 w-full max-w-md">
        <p className="mb-2 text-center text-[11px] tracking-[0.28em] text-stone-500">
          劫數
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={level <= 0}
            onClick={() => onCalamityChange(level - 1)}
            className="btn-cyber px-3 py-1.5 text-sm disabled:opacity-35"
            aria-label="降低劫數"
          >
            ◀
          </button>
          <div className="min-w-[7.5rem] text-center">
            <p className="text-base font-bold tracking-[0.2em] text-[#c9a84c]">
              {getCalamityLabel(level)}
            </p>
            <p className="mt-1 text-[10px] text-stone-500">
              敵人生命 +{hpBonus}%
            </p>
            <p className="text-[10px] text-stone-500">敵人攻擊 +{atkBonus}%</p>
          </div>
          <button
            type="button"
            disabled={level >= cappedMax}
            onClick={() => onCalamityChange(level + 1)}
            className="btn-cyber px-3 py-1.5 text-sm disabled:opacity-35"
            aria-label="提高劫數"
          >
            ▶
          </button>
        </div>
        {cappedMax < MAX_CALAMITY_LEVEL && (
          <p className="mt-2 text-center text-[10px] text-stone-600">
            以當前最高劫數完整飛升可解鎖下一重
          </p>
        )}
      </div>

      <div className="mx-auto mt-6 w-full max-w-md">
        <button
          type="button"
          onClick={onStart}
          className="btn-start-game"
          aria-label="開始修行"
        >
          <span className="relative block text-[1.05rem] font-bold tracking-[0.42em]">
            開始修行
          </span>
          <span className="btn-start-divider" aria-hidden>
            <i className="btn-start-diamond" />
          </span>
          <span className="relative block text-[10px] font-semibold tracking-[0.22em] text-[#b8a878]/90">
            自引氣入道起 · {getCalamityLabel(level)}
          </span>
        </button>
      </div>
    </div>
  );
}
