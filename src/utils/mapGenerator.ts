import type { MapNode, NodeType } from "@/types/map";

const NUM_TIERS = 10;

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
      tierNodes.push({
        id: tier === NUM_TIERS - 1 ? "t9_boss" : `t${tier}_c${col}`,
        tier,
        col,
        type: tier === NUM_TIERS - 1 ? "boss" : pickNodeType(tier),
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
