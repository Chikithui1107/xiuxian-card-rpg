import type { MapNode, NodeType } from "@/types/map";

export { generateSlayTheSpireMap, generateMoonNightMap } from "@/utils/mapGenerator";

export function flattenMap(map: MapNode[][]): MapNode[] {
  return map.flat();
}

export function getAvailableNodes(map: MapNode[][]): MapNode[] {
  return flattenMap(map).filter((node) => node.status === "available");
}

export function countCompletedNodes(map: MapNode[][]): number {
  return flattenMap(map).filter((node) => node.status === "completed").length;
}

export function countTotalNodes(map: MapNode[][]): number {
  return flattenMap(map).length;
}

export function getMapNode(
  map: MapNode[][],
  id: string
): MapNode | undefined {
  for (const tier of map) {
    const found = tier.find((n) => n.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * 完成節點：解鎖下一層連接節點，同層未選路徑鎖定
 */
export function completeMapNode(
  map: MapNode[][],
  completedId: string
): MapNode[][] {
  const completed = getMapNode(map, completedId);
  if (!completed) return map;

  return map.map((tier) =>
    tier.map((node) => {
      if (node.id === completedId) {
        return { ...node, status: "completed" as const };
      }
      if (completed.nextNodes.includes(node.id)) {
        return { ...node, status: "available" as const };
      }
      if (node.tier === completed.tier && node.status === "available") {
        return { ...node, status: "locked" as const };
      }
      return node;
    })
  );
}

export function isBossCleared(map: MapNode[][]): boolean {
  const bossTier = map.at(-1);
  const boss = bossTier?.[0];
  return boss?.type === "boss" && boss.status === "completed";
}

export const NODE_LABELS: Record<NodeType, string> = {
  combat: "妖獸",
  elite: "妖王",
  rest: "打坐",
  shop: "坊市",
  event: "奇遇",
  boss: "通天塔主",
};

export const NODE_ICONS: Record<
  NodeType,
  { label: string; color: string; ring: string }
> = {
  combat: {
    label: "⚔ 妖獸",
    color: "bg-stone-900/90 border-[#8b3a3a]/60 text-[#c48888]",
    ring: "ring-[#8b3a3a]/30",
  },
  elite: {
    label: "💀 妖王",
    color: "bg-stone-900/90 border-[#6a5a8a]/60 text-[#b8a8d8]",
    ring: "ring-[#6a5a8a]/30",
  },
  rest: {
    label: "🏕 打坐",
    color: "bg-stone-900/90 border-[#4a7c6f]/60 text-[#7aab9a]",
    ring: "ring-[#4a7c6f]/30",
  },
  shop: {
    label: "💰 坊市",
    color: "bg-stone-900/90 border-[#8a7340]/60 text-[#c9a84c]",
    ring: "ring-[#8a7340]/30",
  },
  event: {
    label: "❓ 奇遇",
    color: "bg-stone-900/90 border-[#5a7a6a]/60 text-[#9ab8aa]",
    ring: "ring-[#5a7a6a]/30",
  },
  boss: {
    label: "👑 塔主",
    color: "bg-stone-950/95 border-[#c9a84c]/70 text-[#ffd700]",
    ring: "ring-[#c9a84c]/40 animate-qi-breathe",
  },
};
