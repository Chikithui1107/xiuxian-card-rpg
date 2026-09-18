/**
 * 秘境前路路線卡專用視覺（不影響戰鬥 visualScale）。
 * 第一境場景背景見 public/routes/first-realm/manifest.json
 */
export interface RouteMonsterVisual {
  /** 場景背景 public path */
  sceneBg: string;
  /** 立繪縮放，預設 0.9 */
  routeScale: number;
  /** 水平偏移（px），正值右移 */
  routeOffsetX: number;
  /** 垂直偏移（px），正值下移 */
  routeOffsetY: number;
}

const FIRST_REALM = "/routes/first-realm";

const DEFAULT_SCENE = `${FIRST_REALM}/01-mist-forest-wolf.png`;

/** spriteId → 路線卡顯示 */
export const ROUTE_MONSTER_VISUALS: Record<string, RouteMonsterVisual> = {
  demon_wolf: {
    sceneBg: `${FIRST_REALM}/01-mist-forest-wolf.png`,
    routeScale: 0.9,
    routeOffsetX: 0,
    routeOffsetY: 2,
  },
  bandit: {
    sceneBg: `${FIRST_REALM}/02-barren-road-bandit.png`,
    routeScale: 0.86,
    routeOffsetX: 0,
    routeOffsetY: 6,
  },
  spirit_snake: {
    sceneBg: `${FIRST_REALM}/03-green-creek-snake.png`,
    routeScale: 0.92,
    routeOffsetX: 0,
    routeOffsetY: 4,
  },
  traitor: {
    sceneBg: `${FIRST_REALM}/04-broken-cliff-traitor.png`,
    routeScale: 0.88,
    routeOffsetX: 0,
    routeOffsetY: 4,
  },
  stone_ape: {
    sceneBg: `${FIRST_REALM}/05-stone-valley-ape.png`,
    routeScale: 0.9,
    routeOffsetX: 0,
    routeOffsetY: 2,
  },
  demonic_tiger: {
    sceneBg: `${FIRST_REALM}/06-deep-valley-tiger.png`,
    routeScale: 0.84,
    routeOffsetX: 0,
    routeOffsetY: 4,
  },
  blood_elder: {
    sceneBg: `${FIRST_REALM}/06-deep-valley-tiger.png`,
    routeScale: 0.86,
    routeOffsetX: 0,
    routeOffsetY: 2,
  },
};

/** nodeType → 無怪物時的場景（休整／商店／奇遇） */
export const ROUTE_TYPE_SCENE: Record<string, string> = {
  combat: DEFAULT_SCENE,
  elite: `${FIRST_REALM}/04-broken-cliff-traitor.png`,
  event: `${FIRST_REALM}/09-event-spirit-altar.png`,
  rest: `${FIRST_REALM}/07-rest-moon-path.png`,
  shop: `${FIRST_REALM}/08-shop-ruined-village.png`,
  boss: `${FIRST_REALM}/06-deep-valley-tiger.png`,
};

export function getRouteMonsterVisual(
  spriteId: string | undefined
): RouteMonsterVisual | null {
  if (!spriteId) return null;
  return ROUTE_MONSTER_VISUALS[spriteId] ?? null;
}

export function getRouteSceneBg(opts: {
  spriteId?: string;
  nodeType?: string;
}): string {
  const fromMonster = opts.spriteId
    ? ROUTE_MONSTER_VISUALS[opts.spriteId]?.sceneBg
    : undefined;
  if (fromMonster) return fromMonster;
  if (opts.nodeType && ROUTE_TYPE_SCENE[opts.nodeType]) {
    return ROUTE_TYPE_SCENE[opts.nodeType];
  }
  return DEFAULT_SCENE;
}
