import type { CosmeticEntry, GachaRarity } from "@/types/gacha";

/**
 * 霓裳閣 V1 placeholder 外觀。
 * 所有外觀不提供任何戰鬥數值加成。
 */
export const COSMETIC_ENTRIES: CosmeticEntry[] = [
  {
    id: "outfit_moon_veil",
    name: "月紗道袍",
    type: "outfit",
    rarity: "common",
    description: "淡青紗袍，僅改山門立繪外觀。無戰鬥加成。",
    icon: "/heroes/baiye-avatar.png",
  },
  {
    id: "outfit_frost_cloak",
    name: "霜紋披氅",
    type: "outfit",
    rarity: "rare",
    description: "銀霜鑲邊披氅。純外觀，無戰鬥加成。",
    icon: "/heroes/baiye-avatar.png",
  },
  {
    id: "outfit_night_crown",
    name: "玄夜冠帶",
    type: "outfit",
    rarity: "legendary",
    description: "玄夜流金冠帶。純外觀，無戰鬥加成。",
    icon: "/heroes/baiye-avatar.png",
  },
  {
    id: "fx_frost_slash",
    name: "霜痕劍光",
    type: "skill_fx",
    rarity: "common",
    description: "攻擊特效替換為霜痕。無傷害變更。",
    icon: "/cards/baiye/icons/02-shuangren-lianzhan.png",
  },
  {
    id: "fx_jade_ripple",
    name: "青瀾劍意",
    type: "skill_fx",
    rarity: "rare",
    description: "劍意特效改為青瀾漣漪。無數值加成。",
    icon: "/cards/baiye/icons/05-ningshuang-ruqiao.png",
  },
  {
    id: "fx_void_bloom",
    name: "虛空綻劍",
    type: "skill_fx",
    rarity: "legendary",
    description: "絕技施放特效。純表現，無戰鬥加成。",
    icon: "/cards/baiye/icons/14-yijian-shuanghan.png",
  },
  {
    id: "art_mist_fuxue",
    name: "霧中拂雪・異畫",
    type: "card_art",
    rarity: "common",
    description: "拂雪流光卡面異畫。不改牌效。",
    icon: "/cards/baiye/icons/01-fuxue-liuguang.png",
  },
  {
    id: "art_star_yijian",
    name: "星霜一劍・異畫",
    type: "card_art",
    rarity: "rare",
    description: "一劍霜寒卡面異畫。不改牌效。",
    icon: "/cards/baiye/icons/14-yijian-shuanghan.png",
  },
  {
    id: "art_void_poshi",
    name: "破虛勢斬・異畫",
    type: "card_art",
    rarity: "legendary",
    description: "破勢斬卡面異畫。不改牌效。",
    icon: "/cards/baiye/icons/13-poshi-zhan.png",
  },
  {
    id: "back_jade_ink",
    name: "青墨卡背",
    type: "card_back",
    rarity: "common",
    description: "青墨紋卡背。純外觀。",
    icon: "/cards/card-art-placeholder.svg",
  },
  {
    id: "back_frost_seal",
    name: "霜印卡背",
    type: "card_back",
    rarity: "rare",
    description: "霜印符紋卡背。純外觀。",
    icon: "/cards/card-art-placeholder.svg",
  },
  {
    id: "back_night_lotus",
    name: "夜蓮卡背",
    type: "card_back",
    rarity: "legendary",
    description: "夜蓮金紋卡背。純外觀。",
    icon: "/cards/card-art-placeholder.svg",
  },
  {
    id: "frame_plain_jade",
    name: "青玉頭像框",
    type: "avatar_frame",
    rarity: "common",
    description: "青玉邊框。無戰鬥加成。",
    icon: "/heroes/baiye-avatar.png",
  },
  {
    id: "frame_cloud_ring",
    name: "流雲頭像框",
    type: "avatar_frame",
    rarity: "rare",
    description: "流雲金環。無戰鬥加成。",
    icon: "/heroes/baiye-avatar.png",
  },
  {
    id: "frame_immortal_seal",
    name: "仙印頭像框",
    type: "avatar_frame",
    rarity: "legendary",
    description: "仙印鎏金框。無戰鬥加成。",
    icon: "/heroes/baiye-avatar.png",
  },
];

export const COSMETIC_TYPE_LABEL: Record<CosmeticEntry["type"], string> = {
  outfit: "服裝",
  skill_fx: "劍光",
  card_art: "異畫",
  card_back: "卡背",
  avatar_frame: "頭像框",
};

export function getCosmetic(id: string): CosmeticEntry | undefined {
  return COSMETIC_ENTRIES.find((c) => c.id === id);
}

export function cosmeticsOfRarity(rarity: GachaRarity): CosmeticEntry[] {
  return COSMETIC_ENTRIES.filter((c) => c.rarity === rarity);
}

export function listCosmeticIds(): string[] {
  return COSMETIC_ENTRIES.map((c) => c.id);
}
