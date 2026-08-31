import type { MapNode, NodeType } from "@/types/map";

const NUM_TIERS = 10;
const MOON_NIGHT_STEPS = 8;

export const NODE_NAMES: Record<NodeType, string[]> = {
  combat: ["荒山野徑：遭遇野狼", "迷霧林：低階妖獸", "溪畔：攔路劫修"],
  elite: ["上古密林：妖王出沒", "血月荒原：宗門叛徒", "廢棄洞府：守護靈獸"],
  rest: ["靈泉打坐", "荒廢道觀：調息養傷", "古樹下：吐納靈氣"],
  shop: ["雲遊坊市", "散修擺攤", "宗門外門寶庫"],
  event: ["神祕石碑", "神祕前輩的遺骸", "靈氣灌頂奇遇"],
  boss: ["通天塔決戰：迎戰大魔頭"],
};

function pickNodeTitle(type: NodeType): string {
  const names = NODE_NAMES[type];
  return names[Math.floor(Math.random() * names.length)];
}

function pickNodeType(tier: number): NodeType {
  if (tier >= 7) return Math.random() < 0.35 ? "elite" : "combat";
  const roll = Math.random();
  if (roll < 0.42) return "combat";
  if (roll < 0.58) return "elite";
  if (roll < 0.72) return "rest";
  if (roll < 0.86) return "event";
  return "shop";
}

function nodeCountForTier(tier: number): number {
  if (tier === NUM_TIERS - 1) return 1;
  if (tier === 0) return 3;
  return 3 + (tier % 2);
}

function wireConnections(current: MapNode[], next: MapNode[]): void {
  for (const node of current) {
    const ratio =
      current.length === 1 ? 0.5 : node.col / (current.length - 1);
    const preferred = Math.min(
      next.length - 1,
      Math.max(0, Math.round(ratio * (next.length - 1)))
    );
    const targets = new Set<string>([next[preferred].id]);
    if (preferred > 0 && Math.random() < 0.55) {
      targets.add(next[preferred - 1].id);
    }
    if (preferred < next.length - 1 && Math.random() < 0.55) {
      targets.add(next[preferred + 1].id);
    }
    node.nextNodes = [...targets];
  }

  for (const nextNode of next) {
    const hasParent = current.some((c) => c.nextNodes.includes(nextNode.id));
    if (!hasParent) {
      const parent = current[Math.floor(Math.random() * current.length)];
      if (!parent.nextNodes.includes(nextNode.id)) {
        parent.nextNodes.push(nextNode.id);
      }
    }
  }
}

/** 生成 Slay the Spire 風格分支地圖（tier 0 起點 → tier 9 魔首） */
export function generateSlayTheSpireMap(): MapNode[][] {
  const map: MapNode[][] = [];

  for (let tier = 0; tier < NUM_TIERS; tier++) {
    const count = nodeCountForTier(tier);
    const tierNodes: MapNode[] = [];

    for (let col = 0; col < count; col++) {
      const type = tier === NUM_TIERS - 1 ? "boss" : pickNodeType(tier);
      tierNodes.push({
        id: tier === NUM_TIERS - 1 ? "t9_boss" : `t${tier}_c${col}`,
        tier,
        col,
        chapter: 1,
        type,
        title: pickNodeTitle(type),
        nextNodes: [],
        status: tier === 0 ? "available" : "locked",
      });
    }

    map.push(tierNodes);
  }

  for (let i = 0; i < map.length - 1; i++) {
    wireConnections(map[i], map[i + 1]);
  }

  return map;
}

function pickMoonNightType(step: number, totalSteps: number): NodeType {
  if (step === totalSteps - 1) return "boss";
  if (step === 0) return "combat";
  const rand = Math.random();
  if (rand < 0.4) return "combat";
  if (rand < 0.55) return "event";
  if (rand < 0.68) return "rest";
  if (rand < 0.8) return "shop";
  if (rand < 0.92) return "elite";
  return "combat";
}

/** 月圓之夜式分支地圖：每層雙岔路，節點帶修仙風格名稱 */
export function generateMoonNightMap(chapter = 1): MapNode[][] {
  const map: MapNode[][] = [];

  for (let step = 0; step < MOON_NIGHT_STEPS; step++) {
    const stepNodes: MapNode[] = [];
    const numNodes = step === MOON_NIGHT_STEPS - 1 ? 1 : 2;

    for (let col = 0; col < numNodes; col++) {
      const type = pickMoonNightType(step, MOON_NIGHT_STEPS);
      stepNodes.push({
        id: `ch${chapter}-step-${step}-col-${col}`,
        tier: step,
        col,
        chapter,
        type,
        title: pickNodeTitle(type),
        nextNodes: [],
        status: step === 0 ? "available" : "locked",
      });
    }
    map.push(stepNodes);
  }

  for (let step = 0; step < MOON_NIGHT_STEPS - 1; step++) {
    const currentStep = map[step];
    const nextStep = map[step + 1];
    for (const node of currentStep) {
      node.nextNodes = nextStep.map((nextNode) => nextNode.id);
    }
  }

  return map;
}
