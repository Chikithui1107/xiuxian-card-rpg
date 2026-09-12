import type { MapNode, NodeStatus, NodeType } from "@/types/map";

export { generateSlayTheSpireMap, generateMoonNightMap, MOON_NIGHT_STEPS } from "@/utils/mapGenerator";

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

const VALID_NODE_STATUSES = new Set<NodeStatus>([
  "locked",
  "available",
  "completed",
]);

/**
 * 驗證存檔地圖進度是否合法，防止損壞／陳舊 checkpoint 復活舊路線。
 * - completedCount === 0：僅 step 0 可 available，其餘必須 locked
 * - 有 completed：必須從 step 0 連成連續路線，available 只能在最後 completed 的下一層
 */
export function validateRunProgress(map: MapNode[][]): boolean {
  if (!Array.isArray(map) || map.length === 0) return false;

  for (const row of map) {
    if (!Array.isArray(row) || row.length === 0) return false;
    for (const node of row) {
      if (!VALID_NODE_STATUSES.has(node.status)) return false;
    }
  }

  const completed = flattenMap(map).filter((n) => n.status === "completed");
  const available = flattenMap(map).filter((n) => n.status === "available");

  if (completed.length === 0) {
    for (let step = 0; step < map.length; step++) {
      for (const node of map[step]) {
        if (step === 0) {
          if (node.status !== "available" && node.status !== "locked") {
            return false;
          }
        } else if (node.status !== "locked") {
          return false;
        }
      }
    }
    return map[0].some((n) => n.status === "available");
  }

  const byTier = new Map<number, MapNode[]>();
  for (const node of completed) {
    const list = byTier.get(node.tier) ?? [];
    list.push(node);
    byTier.set(node.tier, list);
  }

  const tiers = [...byTier.keys()].sort((a, b) => a - b);
  if (tiers[0] !== 0) return false;
  for (let i = 0; i < tiers.length; i++) {
    if (tiers[i] !== i) return false;
    if ((byTier.get(i)?.length ?? 0) !== 1) return false;
  }

  for (let i = 1; i < tiers.length; i++) {
    const prev = byTier.get(i - 1)![0];
    const cur = byTier.get(i)![0];
    if (!prev.nextNodes.includes(cur.id)) return false;
  }

  const lastCompleted = byTier.get(tiers.length - 1)![0];
  const nextTier = tiers.length;

  for (const node of available) {
    if (node.tier !== nextTier) return false;
    if (!lastCompleted.nextNodes.includes(node.id)) return false;
  }

  for (let t = 0; t < tiers.length; t++) {
    const doneId = byTier.get(t)![0].id;
    for (const node of map[t] ?? []) {
      if (node.id === doneId) continue;
      if (node.status !== "locked") return false;
    }
  }

  for (let step = nextTier + 1; step < map.length; step++) {
    for (const node of map[step]) {
      if (node.status !== "locked") return false;
    }
  }

  return true;
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
