export const STARTING_RUN_GOLD = 100;
export const REST_GOLD_REWARD = 80;

/** Chapter index is zero-based, matching the active run checkpoint.
 * First-realm budget: 100 starting + 12 first combat = 112; buying leaves 32.
 * A second purchase requires more combat income or choosing spirit over healing.
 */
export function getShopCardPrice(chapterIndex: number): number {
  return chapterIndex === 0 ? 80 : 200;
}
