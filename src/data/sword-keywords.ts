/** 白夜關鍵詞說明（僅顯示文案，不參與結算） */
export const SWORD_KEYWORD_TOOLTIPS = {
  劍意: "本場戰鬥一直保留。\n每點讓【一劍霜寒】傷害 +3。",
  劍罡: "1 點抵擋 1 點傷害。\n你的下回合開始時清空。",
  破綻: "受到的攻擊牌傷害 +50%。\n敵人回合結束時 -1 層。",
  養劍: "【一劍霜寒】傷害 ×2。\n你的回合結束時 -1 層。",
  消耗: "打出後，本場戰鬥不再出現。",
  能力: "打出後，效果持續本場戰鬥。",
} as const;

export type SwordKeyword = keyof typeof SWORD_KEYWORD_TOOLTIPS;

export function getSwordKeywordTooltip(keyword: string): string | undefined {
  return SWORD_KEYWORD_TOOLTIPS[keyword as SwordKeyword];
}

/** 卡牌詳情的關鍵詞說明：描述中的【關鍵詞】依出現順序，再補能力／消耗 */
export function getCardKeywordTips(card: {
  description: string;
  type: string;
  isExhaust?: boolean;
}): { term: SwordKeyword; text: string }[] {
  const terms = new Set<SwordKeyword>();
  for (const [, word] of card.description.matchAll(/【([^】]+)】/g)) {
    if (Object.prototype.hasOwnProperty.call(SWORD_KEYWORD_TOOLTIPS, word)) {
      terms.add(word as SwordKeyword);
    }
  }
  if (card.type === "能力") terms.add("能力");
  if (card.isExhaust) terms.add("消耗");
  return [...terms].map((term) => ({
    term,
    text: SWORD_KEYWORD_TOOLTIPS[term],
  }));
}
