import {
  getStoryScene,
  resolveUnseenStoryScene,
  type StoryScene,
} from "@/data/story";

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

/** 依 localStorage seen 取未看過 scene；sceneId 空／不存在／已看 once → undefined */
export function getUnseenStoryScene(
  sceneId?: string
): StoryScene | undefined {
  return resolveUnseenStoryScene(sceneId, readSeenStories());
}

/** 相容別名：與 getUnseenStoryScene 相同 */
export function getUnseenSceneForChapter(
  sceneId?: string
): StoryScene | undefined {
  return getUnseenStoryScene(sceneId);
}

export { getStoryScene, resolveUnseenStoryScene };
