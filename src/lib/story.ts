import type { StoryScene } from "@/data/story";

const STORY_SEEN_KEY = "xiuxian_story_seen_v1";

export function readSeenStories(): string[] {
  try {
    const raw = localStorage.getItem(STORY_SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function hasSeenStory(id: string): boolean {
  return readSeenStories().includes(id);
}

export function markStorySeen(id: string): void {
  try {
    const prev = readSeenStories();
    if (prev.includes(id)) return;
    localStorage.setItem(STORY_SEEN_KEY, JSON.stringify([...prev, id]));
  } catch {
    /* ignore */
  }
}

export function markStorySceneSeen(scene: StoryScene): void {
  markStorySeen(scene.id);
}
