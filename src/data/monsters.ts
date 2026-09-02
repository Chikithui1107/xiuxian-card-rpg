import { publicAsset } from "@/lib/paths";

export interface MonsterConfig {
  id: string;
  name: string;
  image: string;
  description: string;
}

export const DEMON_WOLF: MonsterConfig = {
  id: "demon_wolf",
  name: "妖狼",
  image: publicAsset("/monsters/demon_wolf.png"),
  description: "盤踞山道的低階妖獸，周身幽火，適合熱身",
};

const MONSTER_BY_ID: Record<string, MonsterConfig> = {
  demon_wolf: DEMON_WOLF,
};

export function getMonsterConfig(enemy: {
  monsterSprite?: string;
}): MonsterConfig | undefined {
  if (!enemy.monsterSprite) return undefined;
  return MONSTER_BY_ID[enemy.monsterSprite];
}
