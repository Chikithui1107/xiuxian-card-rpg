export type NodeType =
  | "combat"
  | "elite"
  | "rest"
  | "shop"
  | "event"
  | "boss";

export type NodeStatus = "locked" | "available" | "completed";

export interface MapNode {
  id: string;
  tier: number;
  col: number;
  type: NodeType;
  nextNodes: string[];
  status: NodeStatus;
}

export interface DungeonMapState {
  nodes: MapNode[];
  currentNodeId: string | null;
}
