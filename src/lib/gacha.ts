import {
  BAIYE_GACHA_CARDS,
  GACHA_COST,
  GACHA_DUPLICATE_CONVERT,
  GACHA_HISTORY_LIMIT,
  GACHA_PITY,
  GACHA_RARITY_META,
  GACHA_RATES,
  GACHA_STORAGE_KEY,
  cardsOfRarity,
  getBaiyeCardDisplay,
  getBaiyeGachaCard,
  listBaiyeGachaIds,
} from "@/data/gacha-pools";
import {
  COSMETIC_ENTRIES,
  cosmeticsOfRarity,
  getCosmetic,
  listCosmeticIds,
} from "@/data/cosmetics";
import type {
  DrawHistoryEntry,
  GachaDrawLine,
  GachaDrawOutcome,
  GachaPoolId,
  GachaRarity,
  GachaSaveV1,
  OwnedCardsMap,
} from "@/types/gacha";

function emptyOwnedCards(): OwnedCardsMap {
  return { baiye: [] };
}

export function createDefaultGachaSave(): GachaSaveV1 {
  return {
    version: 1,
    ownedCards: emptyOwnedCards(),
    ownedCosmetics: [],
    cardPoolPity: 0,
    cosmeticPoolPity: 0,
    cardRarePity: 0,
    cosmeticRarePity: 0,
    remnantScrolls: 0,
    silkDust: 0,
    cardDrawHistory: [],
    cosmeticDrawHistory: [],
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

function clampPity(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(GACHA_PITY.legendaryHard - 1, Math.floor(n)));
}

function clampNonNeg(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function sanitizeHistory(raw: unknown): DrawHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: DrawHistoryEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.at !== "number" || typeof r.itemId !== "string") continue;
    if (r.poolId !== "wudao" && r.poolId !== "nichang") continue;
    if (r.kind !== "card" && r.kind !== "cosmetic") continue;
    if (r.rarity !== "common" && r.rarity !== "rare" && r.rarity !== "legendary")
      continue;
    out.push({
      at: r.at,
      poolId: r.poolId,
      itemId: r.itemId,
      kind: r.kind,
      rarity: r.rarity,
      isNew: Boolean(r.isNew),
      convertAmount: clampNonNeg(r.convertAmount),
      convertCurrency:
        r.convertCurrency === "silk" || r.convertCurrency === "remnant"
          ? r.convertCurrency
          : "remnant",
    });
    if (out.length >= GACHA_HISTORY_LIMIT) break;
  }
  return out;
}

/** 壞資料 fallback，不拋錯 */
export function sanitizeGachaSave(raw: unknown): GachaSaveV1 {
  const base = createDefaultGachaSave();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const ownedRaw =
    o.ownedCards && typeof o.ownedCards === "object"
      ? (o.ownedCards as Record<string, unknown>)
      : {};
  const baiyeOwned = asStringArray(ownedRaw.baiye).filter((id) =>
    listBaiyeGachaIds().includes(id)
  );
  const cosmetics = asStringArray(o.ownedCosmetics).filter((id) =>
    listCosmeticIds().includes(id)
  );
  return {
    version: 1,
    ownedCards: { baiye: baiyeOwned },
    ownedCosmetics: cosmetics,
    cardPoolPity: clampPity(o.cardPoolPity),
    cosmeticPoolPity: clampPity(o.cosmeticPoolPity),
    cardRarePity: Math.max(
      0,
      Math.min(GACHA_PITY.rareSoft - 1, clampNonNeg(o.cardRarePity))
    ),
    cosmeticRarePity: Math.max(
      0,
      Math.min(GACHA_PITY.rareSoft - 1, clampNonNeg(o.cosmeticRarePity))
    ),
    remnantScrolls: clampNonNeg(o.remnantScrolls),
    silkDust: clampNonNeg(o.silkDust),
    cardDrawHistory: sanitizeHistory(o.cardDrawHistory),
    cosmeticDrawHistory: sanitizeHistory(o.cosmeticDrawHistory),
  };
}

export function loadGachaSave(): GachaSaveV1 {
  if (typeof window === "undefined") return createDefaultGachaSave();
  try {
    const raw = localStorage.getItem(GACHA_STORAGE_KEY);
    if (!raw) return createDefaultGachaSave();
    return sanitizeGachaSave(JSON.parse(raw));
  } catch {
    return createDefaultGachaSave();
  }
}

export function persistGachaSave(save: GachaSaveV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      GACHA_STORAGE_KEY,
      JSON.stringify(sanitizeGachaSave(save))
    );
  } catch {
    /* quota / private mode — ignore */
  }
}

function rollRarity(rng: () => number): GachaRarity {
  const r = rng();
  if (r < GACHA_RATES.legendary) return "legendary";
  if (r < GACHA_RATES.legendary + GACHA_RATES.rare) return "rare";
  return "common";
}

function pickFrom<T>(list: T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

function applyPityFloor(
  rolled: GachaRarity,
  legendaryPity: number,
  rarePity: number
): GachaRarity {
  // 下一抽將使 legendaryPity 變成 hard → 強制絕品
  if (legendaryPity + 1 >= GACHA_PITY.legendaryHard) return "legendary";
  if (rarePity + 1 >= GACHA_PITY.rareSoft && rolled === "common") return "rare";
  return rolled;
}

function pickCardId(rarity: GachaRarity, rng: () => number): string {
  const pool = cardsOfRarity(rarity);
  if (pool.length === 0) return BAIYE_GACHA_CARDS[0].id;
  return pickFrom(pool, rng).id;
}

function pickCosmeticId(rarity: GachaRarity, rng: () => number): string {
  const pool = cosmeticsOfRarity(rarity);
  if (pool.length === 0) return COSMETIC_ENTRIES[0].id;
  return pickFrom(pool, rng).id;
}

function bumpPity(
  rarity: GachaRarity,
  legendaryPity: number,
  rarePity: number
): { legendaryPity: number; rarePity: number } {
  if (rarity === "legendary") {
    return { legendaryPity: 0, rarePity: 0 };
  }
  if (rarity === "rare") {
    return {
      legendaryPity: legendaryPity + 1,
      rarePity: 0,
    };
  }
  return {
    legendaryPity: legendaryPity + 1,
    rarePity: rarePity + 1,
  };
}

function pushHistory(
  list: DrawHistoryEntry[],
  entry: DrawHistoryEntry
): DrawHistoryEntry[] {
  return [entry, ...list].slice(0, GACHA_HISTORY_LIMIT);
}

function resolveCardLine(
  itemId: string,
  owned: Set<string>
): Omit<GachaDrawLine, "convertCurrency"> & {
  convertCurrency: "remnant" | null;
} {
  const entry = getBaiyeGachaCard(itemId)!;
  const display = getBaiyeCardDisplay(itemId)!;
  const isNew = !owned.has(itemId);
  const convertAmount = isNew ? 0 : GACHA_DUPLICATE_CONVERT[entry.rarity];
  return {
    itemId,
    kind: "card",
    name: display.name,
    rarity: entry.rarity,
    rarityLabel: GACHA_RARITY_META[entry.rarity].label,
    description: display.description,
    icon: display.icon,
    buildTag: entry.buildTag,
    isNew,
    convertAmount,
    convertCurrency: isNew ? null : "remnant",
  };
}

function resolveCosmeticLine(
  itemId: string,
  owned: Set<string>
): Omit<GachaDrawLine, "convertCurrency"> & {
  convertCurrency: "silk" | null;
} {
  const entry = getCosmetic(itemId)!;
  const isNew = !owned.has(itemId);
  const convertAmount = isNew ? 0 : GACHA_DUPLICATE_CONVERT[entry.rarity];
  return {
    itemId,
    kind: "cosmetic",
    name: entry.name,
    rarity: entry.rarity,
    rarityLabel: GACHA_RARITY_META[entry.rarity].label,
    description: entry.description,
    icon: entry.icon,
    cosmeticType: entry.type,
    isNew,
    convertAmount,
    convertCurrency: isNew ? null : "silk",
  };
}

function ensureMultiRarePlus(rarities: GachaRarity[]): GachaRarity[] {
  if (!GACHA_PITY.multiRareGuarantee) return rarities;
  if (rarities.some((r) => r !== "common")) return rarities;
  const next = [...rarities];
  // 保持抽取順序：升級最後一張為珍品
  next[next.length - 1] = "rare";
  return next;
}

export function getCollectionProgress(
  save: GachaSaveV1,
  poolId: GachaPoolId
): { owned: number; total: number } {
  if (poolId === "wudao") {
    return {
      owned: save.ownedCards.baiye.length,
      total: BAIYE_GACHA_CARDS.length,
    };
  }
  return {
    owned: save.ownedCosmetics.length,
    total: COSMETIC_ENTRIES.length,
  };
}

export function getLegendaryPity(
  save: GachaSaveV1,
  poolId: GachaPoolId
): { current: number; max: number } {
  return {
    current:
      poolId === "wudao" ? save.cardPoolPity : save.cosmeticPoolPity,
    max: GACHA_PITY.legendaryHard,
  };
}

/**
 * 執行抽取。不改動 spiritStones；呼叫端先檢查並扣除。
 * 兩池 pity / 收藏完全獨立。
 */
export function performGachaDraw(opts: {
  poolId: GachaPoolId;
  count: 1 | 10;
  spiritStones: number;
  save: GachaSaveV1;
  rng?: () => number;
}): GachaDrawOutcome {
  const { poolId, count, spiritStones } = opts;
  const rng = opts.rng ?? Math.random;
  const cost = count === 1 ? GACHA_COST.single : GACHA_COST.multi;

  if (poolId !== "wudao" && poolId !== "nichang") {
    return { ok: false, reason: "invalid_pool", message: "無效卡池" };
  }
  if (spiritStones < cost) {
    return { ok: false, reason: "insufficient_spirit", message: "靈石不足" };
  }

  let save = sanitizeGachaSave(opts.save);
  let legendaryPity =
    poolId === "wudao" ? save.cardPoolPity : save.cosmeticPoolPity;
  let rarePity =
    poolId === "wudao" ? save.cardRarePity : save.cosmeticRarePity;

  const ownedCards = new Set(save.ownedCards.baiye);
  const ownedCosmetics = new Set(save.ownedCosmetics);

  const planned: GachaRarity[] = [];
  let simLeg = legendaryPity;
  let simRare = rarePity;
  for (let i = 0; i < count; i++) {
    const rolled = applyPityFloor(rollRarity(rng), simLeg, simRare);
    planned.push(rolled);
    const next = bumpPity(rolled, simLeg, simRare);
    simLeg = next.legendaryPity;
    simRare = next.rarePity;
  }

  const finalRarities =
    count === 10 ? ensureMultiRarePlus(planned) : planned;

  // 若十抽升級改變了最後一張稀有度，需重算最後一抽的 pity 軌跡
  // 簡化：按 finalRarities 從頭重算 pity
  legendaryPity =
    poolId === "wudao" ? save.cardPoolPity : save.cosmeticPoolPity;
  rarePity = poolId === "wudao" ? save.cardRarePity : save.cosmeticRarePity;

  const lines: GachaDrawLine[] = [];
  let newCount = 0;
  let remnantGained = 0;
  let silkGained = 0;
  const now = Date.now();

  for (let i = 0; i < finalRarities.length; i++) {
    const rarity = finalRarities[i];
    if (poolId === "wudao") {
      const itemId = pickCardId(rarity, rng);
      // 若實際卡牌 rarity 與 rolled 不一致（同 rarity 池內），以條目為準顯示
      const line = resolveCardLine(itemId, ownedCards);
      lines.push(line);
      if (line.isNew) {
        ownedCards.add(itemId);
        newCount += 1;
      } else {
        remnantGained += line.convertAmount;
      }
      const hist: DrawHistoryEntry = {
        at: now + i,
        poolId,
        itemId,
        kind: "card",
        rarity: line.rarity,
        isNew: line.isNew,
        convertAmount: line.convertAmount,
        convertCurrency: "remnant",
      };
      save = {
        ...save,
        cardDrawHistory: pushHistory(save.cardDrawHistory, hist),
      };
    } else {
      const itemId = pickCosmeticId(rarity, rng);
      const line = resolveCosmeticLine(itemId, ownedCosmetics);
      lines.push(line);
      if (line.isNew) {
        ownedCosmetics.add(itemId);
        newCount += 1;
      } else {
        silkGained += line.convertAmount;
      }
      const hist: DrawHistoryEntry = {
        at: now + i,
        poolId,
        itemId,
        kind: "cosmetic",
        rarity: line.rarity,
        isNew: line.isNew,
        convertAmount: line.convertAmount,
        convertCurrency: "silk",
      };
      save = {
        ...save,
        cosmeticDrawHistory: pushHistory(save.cosmeticDrawHistory, hist),
      };
    }

    const bumped = bumpPity(rarity, legendaryPity, rarePity);
    legendaryPity = bumped.legendaryPity;
    rarePity = bumped.rarePity;
  }

  if (poolId === "wudao") {
    save = {
      ...save,
      ownedCards: { baiye: [...ownedCards] },
      remnantScrolls: save.remnantScrolls + remnantGained,
      cardPoolPity: legendaryPity,
      cardRarePity: rarePity,
    };
  } else {
    save = {
      ...save,
      ownedCosmetics: [...ownedCosmetics],
      silkDust: save.silkDust + silkGained,
      cosmeticPoolPity: legendaryPity,
      cosmeticRarePity: rarePity,
    };
  }

  save = sanitizeGachaSave(save);
  persistGachaSave(save);

  return {
    ok: true,
    poolId,
    cost,
    lines,
    summary: {
      newCount,
      remnantGained,
      silkGained,
      legendaryPity,
      legendaryPityMax: GACHA_PITY.legendaryHard,
    },
    save,
  };
}

export { GACHA_COST, GACHA_PITY, GACHA_STORAGE_KEY, GACHA_RARITY_META };
