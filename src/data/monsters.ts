import { publicAsset } from "@/lib/paths";

export interface MonsterConfig {
  id: string;
  name: string;
  image: string;
  description: string;
  /**
   * 立繪相對「人形基準」的縮放。
   * 普通怪 ~0.88–1.0，精英略大，Boss 更大。
   */
  visualScale: number;
  /** 立繪垂直微調（vh），正值下移 */
  visualOffsetY: number;
}

export const DEMON_WOLF: MonsterConfig = {
  id: "demon_wolf",
  name: "妖狼",
  image: publicAsset("/monsters/demon_wolf.png"),
  description: "盤踞山道的低階妖獸，周身幽火，適合熱身",
  visualScale: 0.92,
  visualOffsetY: 0.3,
};

export const BANDIT: MonsterConfig = {
  id: "bandit",
  name: "劫修",
  image: publicAsset("/monsters/bandit.png"),
  description: "散修惡徒，劍招粗淺但兇狠",
  visualScale: 1,
  visualOffsetY: 0,
};

export const SPIRIT_SNAKE: MonsterConfig = {
  id: "spirit_snake",
  name: "青鱗靈蛇",
  image: publicAsset("/monsters/spirit_snake.png"),
  description: "潛伏溪澗的靈蛇，動作迅捷，擅長連續撕咬。",
  visualScale: 0.95,
  visualOffsetY: 0.2,
};

export const TRAITOR: MonsterConfig = {
  id: "traitor",
  name: "叛劍客",
  image: publicAsset("/monsters/traitor.png"),
  description: "精英敵手，善使三連斬壓制對手",
  visualScale: 1.08,
  visualOffsetY: 0,
};

export const STONE_APE: MonsterConfig = {
  id: "stone_ape",
  name: "裂石猿",
  image: publicAsset("/monsters/stone_ape.png"),
  description: "盤踞亂石谷的妖猿，皮堅如石，蓄力後的一擊極為兇猛。",
  visualScale: 1.12,
  visualOffsetY: 0,
};

export const DEMONIC_TIGER: MonsterConfig = {
  id: "demonic_tiger",
  name: "噬靈虎王",
  image: publicAsset("/monsters/demonic_tiger.png"),
  description: "青嵐谷深處的妖王，吞噬靈氣修行，攻勢兇猛且節奏多變。",
  /** 素材幾乎滿畫布，略低於裂石猿以免遮血條／傷害字 */
  visualScale: 1.06,
  visualOffsetY: 1.5,
};

export const BLOOD_ELDER: MonsterConfig = {
  id: "blood_elder",
  name: "血魔長老",
  image: publicAsset("/monsters/blood_elder.png"),
  description: "章節魔首，血焰纏身，需在殘血拉扯中尋找核爆時機",
  visualScale: 1.2,
  visualOffsetY: -0.5,
};

const MONSTER_BY_ID: Record<string, MonsterConfig> = {
  demon_wolf: DEMON_WOLF,
  bandit: BANDIT,
  spirit_snake: SPIRIT_SNAKE,
  traitor: TRAITOR,
  stone_ape: STONE_APE,
  demonic_tiger: DEMONIC_TIGER,
  blood_elder: BLOOD_ELDER,
};

/** 敵人 id → 立繪 id */
export const ENEMY_SPRITE_ID: Record<string, string> = {
  enemy_wolf: "demon_wolf",
  enemy_bandit: "bandit",
  enemy_spirit_snake: "spirit_snake",
  enemy_traitor: "traitor",
  enemy_stone_ape: "stone_ape",
  enemy_demonic_tiger: "demonic_tiger",
  enemy_elder: "blood_elder",
};

export function getMonsterConfig(enemy: {
  monsterSprite?: string;
}): MonsterConfig | undefined {
  if (!enemy.monsterSprite) return undefined;
  return MONSTER_BY_ID[enemy.monsterSprite];
}
