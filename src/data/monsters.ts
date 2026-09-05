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
  visualScale: 0.9,
  visualOffsetY: 0.5,
};

export const BANDIT: MonsterConfig = {
  id: "bandit",
  name: "劫修",
  image: publicAsset("/monsters/bandit.png"),
  description: "散修惡徒，劍招粗淺但兇狠",
  visualScale: 1,
  visualOffsetY: 0,
};

export const TRAITOR: MonsterConfig = {
  id: "traitor",
  name: "叛劍客",
  image: publicAsset("/monsters/traitor.png"),
  description: "精英敵手，善使三連斬壓制對手",
  visualScale: 1.08,
  visualOffsetY: 0,
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
  traitor: TRAITOR,
  blood_elder: BLOOD_ELDER,
};

/** 敵人 id → 立繪 id */
export const ENEMY_SPRITE_ID: Record<string, string> = {
  enemy_wolf: "demon_wolf",
  enemy_bandit: "bandit",
  enemy_traitor: "traitor",
  enemy_elder: "blood_elder",
};

export function getMonsterConfig(enemy: {
  monsterSprite?: string;
}): MonsterConfig | undefined {
  if (!enemy.monsterSprite) return undefined;
  return MONSTER_BY_ID[enemy.monsterSprite];
}
