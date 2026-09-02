const REPO_BASE = "/xiuxian-card-rpg";

export function publicAsset(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${REPO_BASE}${normalized}`;
}
