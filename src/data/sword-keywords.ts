/** 白夜關鍵詞說明（僅顯示文案，不參與結算） */
export const SWORD_KEYWORD_TOOLTIPS = {
  劍意: "本場戰鬥持續保留。\n【一劍霜寒】會依當前劍意提高傷害。",
  劍罡: "抵擋傷害。\n1 點劍罡抵擋 1 點傷害。\n下回合開始時清空。",
  破綻:
    "受到的攻擊牌傷害 +50%。\n被附加破綻的敵人，在自己的回合結束時失去 1 層。",
  養劍: "【一劍霜寒】傷害 ×2。\n玩家回合結束時失去 1 層。",
  消耗: "打出後，本場戰鬥不再出現。",
  能力: "打出後，效果持續本場戰鬥。",
} as const;

export type SwordKeyword = keyof typeof SWORD_KEYWORD_TOOLTIPS;

export function getSwordKeywordTooltip(keyword: string): string | undefined {
  return SWORD_KEYWORD_TOOLTIPS[keyword as SwordKeyword];
}
