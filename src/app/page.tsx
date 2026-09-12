"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import enemiesData from "@/data/enemies.json";
import startingInventoryData from "@/data/starting-inventory.json";
import {
  DEFAULT_CHARACTER_ID,
  getCharacter,
  listPlayableCharacters,
  type PlayableCharacter,
} from "@/data/characters";
import { MobileFrame } from "@/components/MobileFrame";
import { BottomNav } from "@/components/BottomNav";
import { LobbyView } from "@/components/LobbyView";
import { CombatView } from "@/components/CombatView";
import {
  CultivationStartView,
  getCalamityLabel,
  MAX_CALAMITY_LEVEL,
} from "@/components/CultivationStartView";
import { PathChoiceView } from "@/components/PathChoiceView";
import { CharacterSelectModal } from "@/components/CharacterSelectModal";
import { CardRewardModal } from "@/components/CardRewardModal";
import { EventModal } from "@/components/EventModal";
import { InGameMenu } from "@/components/InGameMenu";
import { VictoryAnimOverlay } from "@/components/VictoryAnimOverlay";
import { StageClearOverlay } from "@/components/StageClearOverlay";
import { DefeatOverlay } from "@/components/DefeatOverlay";
import { applyEventChoice, pickStoryEvent } from "@/lib/events";
import type { EventChoice, StoryEvent } from "@/data/events";
import {
  calculateHeroStats,
  getHero,
} from "@/lib/stats";
import {
  createInitialInventory,
} from "@/lib/equipment";
import {
  CARD_TEMPLATES,
  COMBAT_HAND_SIZE,
  createBattleDeck,
  createCard,
  discardHand,
  drawCards,
  MAX_ENERGY,
  pickRandomTemplateIds,
  playCardFromHand,
  getCardTemplate,
  SWORD_TEMPLATE_IDS,
  type CardTemplateId,
} from "@/lib/battle-deck";
import { KARMA_REWARD_IDS, getKarmaTemplate, cardMatchesAspect, isKarmaTemplateId } from "@/lib/karma-deck";
import {
  INITIAL_KARMA_STATE,
  beginKarmaPlayerTurn,
  endKarmaPlayerTurn,
  convertLunzhuanAfterEnemyAttack,
  resolveKarmaCardPlay,
  finishAspectDiscardAndDraw,
  canPlayAspectDiscardCard,
  type KarmaCombatState,
  type PlayedCardRecord,
} from "@/lib/karma-combat";
import { buildCardFacePreviewFromKarma } from "@/lib/card-face-display";
import { AspectDiscardModal } from "@/components/AspectDiscardModal";
import { RestModal } from "@/components/RestModal";
import { ShopModal, SHOP_PRICE } from "@/components/ShopModal";
import {
  advanceEnemyIntent,
  applyRegenPassive,
  getAllDungeonTiers,
  getDungeonChapterMeta,
  getDungeonTier,
  getEnemyForMapNode,
  getEnemyIntent,
  getFloorSpiritReward,
  getMapNodeSpiritReward,
} from "@/lib/dungeon";
import {
  applyDamageToEnemy,
  clearEnemyBlock,
  lockEnemyIntent,
} from "@/lib/enemy-intent";
import { ENEMY_SPRITE_ID } from "@/data/monsters";
import {
  completeMapNode,
  countCompletedNodes,
  countTotalNodes,
  getAvailableNodes,
  getMapNode,
  isBossCleared,
  validateRunProgress,
} from "@/lib/map";
import { generateMoonNightMap } from "@/utils/mapGenerator";
import {
  INITIAL_COMBAT_BUFFS,
  resolveCardEffects,
  rollStackDodge,
  type CombatBuffs,
} from "@/lib/battle-resolve";
import { playStartCultivationSfx, playCardDrawSfx, playBattleWinSfx, playGameOverSfx } from "@/lib/combat-audio";
import { stopDefeatMusic } from "@/lib/bgm";
import {
  DAMAGE_NUMBER_MS,
  planPlayerHitSteps,
  type CombatImpactFeedback,
  type EnemyTurnPlan,
  type PlayerImpactFeedback,
} from "@/lib/combat-feedback";
import type { PlayFxKind } from "@/lib/combat-fx";
import { playImpact, playPlayerHitSfx, playShieldHitSfx } from "@/lib/combat-audio";
import type { BattleDeckState } from "@/types/battle";
import type { Card } from "@/types/battle";
import { getEffectiveCost } from "@/types/battle";
import type {
  AppTab,
  BattlePhase,
  CombatEnemy,
  CombatPhase,
  CombatScreen,
  DamagePopup,
  DungeonTier,
  Enemy,
  InventoryState,
} from "@/types/game";
import type { MapNode } from "@/types/map";
import { HIGH_DAMAGE_THRESHOLD } from "@/types/game";

const ENEMY_LIST = enemiesData as Enemy[];
const DUNGEON_TIERS = getAllDungeonTiers();
const INITIAL_INVENTORY = createInitialInventory(startingInventoryData);
const EMPTY_DECK: BattleDeckState = {
  drawPile: [],
  hand: [],
  discardPile: [],
  exhaustPile: [],
};
const PLAYABLE = listPlayableCharacters();
const ACTIVE_CHAR_KEY = "xiuxian_active_character_v1";
const CHAR_PROGRESS_KEY = "xiuxian_character_progress_v1";
const RUN_SAVE_KEY = "xiuxian_active_run_v1";
const ACHIEVEMENTS_KEY = "xiuxian_achievements_v1";

type CharacterProgress = {
  permanentDeck: CardTemplateId[];
  playerHp: number;
  spiritStones: number;
  totalClears: number;
  maxCalamityLevel: number;
};

type StageClearInfo = {
  kind: "advance" | "ascend";
  title: string;
  subtitle: string;
  description: string;
  buttonLabel: string;
  convertSpirit?: number;
};

/** 路線檢查點：不存戰鬥中瞬時狀態 */
interface ActiveRunSaveV2 {
  version: 2;
  runSessionId: string;
  characterId: string;
  chapterIndex: number;
  tierId: string;
  calamityLevel: number;
  dungeonMap: MapNode[][];
  permanentDeck: CardTemplateId[];
  playerHp: number;
  spiritStones: number;
  runSpirit: number;
  mapMessage: string | null;
  savedAt: number;
}

const TAB_LABELS: Record<AppTab, string> = {
  lobby: "青雲宗 · 山門",
  combat: "天下秘境",
  characters: "選擇角色",
};

function sanitizeMaxCalamityLevel(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_CALAMITY_LEVEL, Math.floor(value)));
}

function createProgress(character: PlayableCharacter): CharacterProgress {
  return {
    permanentDeck: [...character.startingDeck],
    playerHp: character.maxHp,
    spiritStones: character.spiritStones,
    totalClears: 0,
    maxCalamityLevel: 0,
  };
}

/** 過濾跨流派串牌；無效則回起始牌組 */
function sanitizeDeckForCharacter(
  character: PlayableCharacter,
  deck: CardTemplateId[] | undefined
): CardTemplateId[] {
  const raw = Array.isArray(deck) ? deck : [];
  const filtered = raw.filter((id) => {
    if (!(id in CARD_TEMPLATES)) return false;
    if (character.combatPath === "karma") return isKarmaTemplateId(id);
    return !isKarmaTemplateId(id);
  });
  return filtered.length > 0 ? filtered : [...character.startingDeck];
}

/** 無進行中秘境時：山門氣血回滿，牌組回角色起始組 */
function fullHpProgress(
  character: PlayableCharacter,
  snap?: CharacterProgress
): CharacterProgress {
  const base = snap ?? createProgress(character);
  return {
    ...base,
    permanentDeck: [...character.startingDeck],
    playerHp: character.maxHp,
  };
}

function initBattleDeck(templateIds: CardTemplateId[]): BattleDeckState {
  return createBattleDeck(templateIds, COMBAT_HAND_SIZE);
}

/** 非戰鬥期間的占位敵人，避免上一場 elite/boss 殘留在 state */
function createNeutralEnemy(): CombatEnemy {
  const base = ENEMY_LIST[0];
  return lockEnemyIntent({
    ...base,
    currentHp: base.maxHp,
    intentIndex: 0,
    block: 0,
    monsterSprite: ENEMY_SPRITE_ID[base.id],
  });
}

function createRunSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readStoredActiveId(): string {
  try {
    const id = localStorage.getItem(ACTIVE_CHAR_KEY);
    if (id && PLAYABLE.some((c) => c.id === id && c.unlocked)) return id;
  } catch {
    /* ignore */
  }
  return DEFAULT_CHARACTER_ID;
}

function readStoredProgress(): Record<string, CharacterProgress> {
  try {
    const raw = localStorage.getItem(CHAR_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CharacterProgress>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readStoredAchievements(): string[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function clearActiveRunSave(): void {
  try {
    localStorage.removeItem(RUN_SAVE_KEY);
  } catch {
    /* ignore */
  }
}

function isValidMapNode(node: unknown): node is MapNode {
  if (!node || typeof node !== "object") return false;
  const n = node as Record<string, unknown>;
  return (
    typeof n.id === "string" &&
    typeof n.tier === "number" &&
    typeof n.col === "number" &&
    typeof n.chapter === "number" &&
    typeof n.type === "string" &&
    typeof n.title === "string" &&
    Array.isArray(n.nextNodes) &&
    (n.status === "locked" ||
      n.status === "available" ||
      n.status === "completed")
  );
}

function isValidDungeonMap(
  map: unknown,
  expectedFloors: number
): map is MapNode[][] {
  if (!Array.isArray(map) || map.length !== expectedFloors) return false;
  if (
    !map.every(
      (row) =>
        Array.isArray(row) &&
        row.length > 0 &&
        row.every((node) => isValidMapNode(node))
    )
  ) {
    return false;
  }
  return validateRunProgress(map);
}

function readStoredRun(): ActiveRunSaveV2 | null {
  try {
    const raw = localStorage.getItem(RUN_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveRunSaveV2>;
    if (!parsed || parsed.version !== 2) {
      clearActiveRunSave();
      return null;
    }
    if (
      typeof parsed.characterId !== "string" ||
      !PLAYABLE.some((c) => c.id === parsed.characterId && c.unlocked)
    ) {
      clearActiveRunSave();
      return null;
    }
    if (typeof parsed.tierId !== "string") {
      clearActiveRunSave();
      return null;
    }
    const tier = getDungeonTier(parsed.tierId);
    if (!tier) {
      clearActiveRunSave();
      return null;
    }
    if (
      typeof parsed.chapterIndex !== "number" ||
      !Number.isInteger(parsed.chapterIndex) ||
      parsed.chapterIndex < 0 ||
      parsed.chapterIndex > 4
    ) {
      clearActiveRunSave();
      return null;
    }
    if (
      typeof parsed.calamityLevel !== "number" ||
      !Number.isFinite(parsed.calamityLevel) ||
      parsed.calamityLevel < 0 ||
      parsed.calamityLevel > MAX_CALAMITY_LEVEL
    ) {
      clearActiveRunSave();
      return null;
    }
    if (
      typeof parsed.runSessionId !== "string" ||
      parsed.runSessionId.length === 0
    ) {
      clearActiveRunSave();
      return null;
    }
    if (!isValidDungeonMap(parsed.dungeonMap, tier.floors)) {
      clearActiveRunSave();
      return null;
    }
    if (!Array.isArray(parsed.permanentDeck)) {
      clearActiveRunSave();
      return null;
    }
    if (typeof parsed.playerHp !== "number" || !Number.isFinite(parsed.playerHp)) {
      clearActiveRunSave();
      return null;
    }
    if (
      typeof parsed.spiritStones !== "number" ||
      !Number.isFinite(parsed.spiritStones)
    ) {
      clearActiveRunSave();
      return null;
    }
    if (
      typeof parsed.runSpirit !== "number" ||
      !Number.isFinite(parsed.runSpirit) ||
      parsed.runSpirit < 0
    ) {
      clearActiveRunSave();
      return null;
    }
    if (
      parsed.mapMessage != null &&
      typeof parsed.mapMessage !== "string"
    ) {
      clearActiveRunSave();
      return null;
    }
    return {
      version: 2,
      runSessionId: parsed.runSessionId,
      characterId: parsed.characterId,
      chapterIndex: parsed.chapterIndex,
      tierId: parsed.tierId,
      calamityLevel: Math.floor(parsed.calamityLevel),
      dungeonMap: parsed.dungeonMap,
      permanentDeck: parsed.permanentDeck as CardTemplateId[],
      playerHp: parsed.playerHp,
      spiritStones: parsed.spiritStones,
      runSpirit: Math.floor(parsed.runSpirit),
      mapMessage: parsed.mapMessage ?? null,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    clearActiveRunSave();
    return null;
  }
}

function writeActiveRunSave(save: ActiveRunSaveV2): void {
  try {
    localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(save));
  } catch {
    /* ignore */
  }
}

export default function GamePage() {
  const [ready, setReady] = useState(false);
  const [activeCharacterId, setActiveCharacterId] = useState(
    DEFAULT_CHARACTER_ID
  );
  const [characterSelectOpen, setCharacterSelectOpen] = useState(false);
  const [progressByCharacter, setProgressByCharacter] = useState<
    Record<string, CharacterProgress>
  >({});
  const [activeTab, setActiveTab] = useState<AppTab>("lobby");
  const [combatScreen, setCombatScreen] = useState<CombatScreen>("tier-select");
  const [isInCombat, setIsInCombat] = useState(false);
  const [inventory, setInventory] = useState<InventoryState>(INITIAL_INVENTORY);
  const [permanentDeck, setPermanentDeck] = useState<CardTemplateId[]>([]);
  const [selectedTier, setSelectedTier] = useState<DungeonTier | null>(null);
  const [tierFloor, setTierFloor] = useState(1);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [calamityLevel, setCalamityLevel] = useState(0);
  const [pendingCalamity, setPendingCalamity] = useState(0);
  const [maxCalamityLevel, setMaxCalamityLevel] = useState(0);
  const [totalClears, setTotalClears] = useState(0);
  const [spiritStones, setSpiritStones] = useState(1280);
  /** 本局靈砂：僅存於 Active Run，結束／戰敗／放棄清零 */
  const [runSpirit, setRunSpirit] = useState(0);
  const [runSessionId, setRunSessionId] = useState<string | null>(null);
  const runSessionIdRef = useRef<string | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(
    []
  );
  const [playerHp, setPlayerHp] = useState(60);
  const [lastRunMessage, setLastRunMessage] = useState<string | null>(null);

  const [enemy, setEnemy] = useState<CombatEnemy>(() => createNeutralEnemy());
  const [battleInstanceId, setBattleInstanceId] = useState(0);
  const [deckState, setDeckState] = useState<BattleDeckState>(EMPTY_DECK);
  const popupIdRef = useRef(0);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [phase, setPhase] = useState<CombatPhase>("playing");
  const [battlePhase, setBattlePhase] = useState<BattlePhase>("IN_BATTLE");
  const victoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const victoryStartedRef = useRef(false);
  const playLockRef = useRef(false);
  const mapActionLockRef = useRef(false);
  const eventChoiceLockRef = useRef(false);
  const rewardDoneRef = useRef(false);
  const stageClearDoneRef = useRef(false);
  const [stageClearInfo, setStageClearInfo] = useState<StageClearInfo | null>(
    null
  );
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [impactFeedback, setImpactFeedback] =
    useState<CombatImpactFeedback | null>(null);
  const [playerImpactFeedback, setPlayerImpactFeedback] =
    useState<PlayerImpactFeedback | null>(null);
  const [enemyTurnPlan, setEnemyTurnPlan] = useState<EnemyTurnPlan | null>(
    null
  );
  const pendingPlayerHitRef = useRef<{ damage: number } | null>(null);
  const impactIdRef = useRef(0);
  const playerImpactIdRef = useRef(0);
  const [isShaking, setIsShaking] = useState(false);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [lastEnemyDamage, setLastEnemyDamage] = useState<number | null>(null);
  const [lastDodge, setLastDodge] = useState(false);
  const [lastPassiveHeal, setLastPassiveHeal] = useState<number | null>(null);
  const [totalDamage, setTotalDamage] = useState(0);
  const [rewardTemplateIds, setRewardTemplateIds] = useState<CardTemplateId[]>(
    []
  );
  const [defeatedEnemyName, setDefeatedEnemyName] = useState("");
  const [pendingFloorReward, setPendingFloorReward] = useState(0);
  const [pendingTierComplete, setPendingTierComplete] = useState(false);
  const [pendingEliteReward, setPendingEliteReward] = useState(false);
  const [dungeonMap, setDungeonMap] = useState<MapNode[][]>([]);
  const [currentMapNodeId, setCurrentMapNodeId] = useState<string | null>(null);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<StoryEvent | null>(null);
  const [activeEventNodeId, setActiveEventNodeId] = useState<string | null>(
    null
  );
  const [activeRestNodeId, setActiveRestNodeId] = useState<string | null>(
    null
  );
  const [activeShopNodeId, setActiveShopNodeId] = useState<string | null>(
    null
  );
  const [shopOfferIds, setShopOfferIds] = useState<CardTemplateId[]>([]);
  const restChoiceLockRef = useRef(false);
  const shopChoiceLockRef = useRef(false);
  const [combatBuffs, setCombatBuffs] = useState<CombatBuffs>(
    INITIAL_COMBAT_BUFFS
  );
  const [karmaState, setKarmaState] =
    useState<KarmaCombatState>(INITIAL_KARMA_STATE);
  const [pendingDiscard, setPendingDiscard] = useState<{
    aspect: "yin" | "yang";
    /** 宿因重演因棄牌中斷時，尚未重演的佇列 */
    replayRemaining?: PlayedCardRecord[];
  } | null>(null);
  const [combatFeelToast, setCombatFeelToast] = useState<string | null>(null);
  /** 【因果斷絕】牽引後待動畫打出的果牌（不經手牌） */
  const [karmaAutoPlayCard, setKarmaAutoPlayCard] = useState<Card | null>(null);
  const karmaAutoPlayApplyRef = useRef<(() => void) | null>(null);

  const character = useMemo(
    () => getCharacter(activeCharacterId),
    [activeCharacterId]
  );
  const hero = useMemo(() => getHero(activeCharacterId), [activeCharacterId]);

  const cardFacePreview = useMemo(
    () =>
      character.combatPath === "karma"
        ? buildCardFacePreviewFromKarma(karmaState)
        : undefined,
    [character.combatPath, karmaState]
  );

  const heroStats = useMemo(
    () => calculateHeroStats(hero, inventory.equippedIds),
    [hero, inventory.equippedIds]
  );

  useEffect(() => {
    try {
      const stored = readStoredProgress();
      const achievements = readStoredAchievements();
      const savedRun = readStoredRun();
      setUnlockedAchievements(achievements);

      const nextProgress: Record<string, CharacterProgress> = {};

      if (savedRun) {
        const runChar = getCharacter(savedRun.characterId);
        const tier = getDungeonTier(savedRun.tierId);
        if (!tier) {
          clearActiveRunSave();
        } else {
          const deck = sanitizeDeckForCharacter(runChar, savedRun.permanentDeck);
          const hp = Math.max(
            0,
            Math.min(runChar.maxHp, Math.floor(savedRun.playerHp))
          );
          for (const c of PLAYABLE) {
            const snap = stored[c.id];
            if (c.id === savedRun.characterId) {
              nextProgress[c.id] = {
                ...(snap ?? createProgress(c)),
                permanentDeck: deck,
                playerHp: hp,
                spiritStones: Math.max(0, Math.floor(savedRun.spiritStones)),
                maxCalamityLevel: sanitizeMaxCalamityLevel(
                  snap?.maxCalamityLevel
                ),
              };
            } else {
              nextProgress[c.id] = {
                ...(snap ?? createProgress(c)),
                permanentDeck: sanitizeDeckForCharacter(
                  c,
                  snap?.permanentDeck ?? c.startingDeck
                ),
                maxCalamityLevel: sanitizeMaxCalamityLevel(
                  snap?.maxCalamityLevel
                ),
              };
            }
          }
          const progress =
            nextProgress[savedRun.characterId] ?? createProgress(runChar);
          setActiveCharacterId(savedRun.characterId);
          setProgressByCharacter(nextProgress);
          setPermanentDeck(progress.permanentDeck);
          setPlayerHp(progress.playerHp);
          setSpiritStones(progress.spiritStones);
          setRunSpirit(Math.max(0, Math.floor(savedRun.runSpirit)));
          runSessionIdRef.current = savedRun.runSessionId;
          setRunSessionId(savedRun.runSessionId);
          setChapterIndex(savedRun.chapterIndex);
          setCalamityLevel(savedRun.calamityLevel);
          setMaxCalamityLevel(progress.maxCalamityLevel);
          setPendingCalamity(
            Math.min(savedRun.calamityLevel, progress.maxCalamityLevel)
          );
          setTotalClears(progress.totalClears);
          setInventory(createInitialInventory(startingInventoryData));
          setSelectedTier(tier);
          setDungeonMap(savedRun.dungeonMap);
          setMapMessage(savedRun.mapMessage);
          setCombatScreen("path");
          setIsInCombat(false);
          setCurrentMapNodeId(null);
          setActiveEvent(null);
          setActiveEventNodeId(null);
          setActiveRestNodeId(null);
          setActiveShopNodeId(null);
          setShopOfferIds([]);
          setActiveTab("lobby");
          try {
            localStorage.setItem(CHAR_PROGRESS_KEY, JSON.stringify(nextProgress));
            localStorage.setItem(ACTIVE_CHAR_KEY, savedRun.characterId);
            localStorage.setItem(
              ACHIEVEMENTS_KEY,
              JSON.stringify(achievements)
            );
          } catch {
            /* ignore */
          }
          return;
        }
      }

      const activeId = readStoredActiveId();
      const activeChar = getCharacter(activeId);
      for (const c of PLAYABLE) {
        // 無 Active Run：一律回起始牌組，避免戰敗畫面刷新把本局牌帶回山門
        const snap = stored[c.id];
        nextProgress[c.id] = {
          ...fullHpProgress(c, snap),
          maxCalamityLevel: sanitizeMaxCalamityLevel(snap?.maxCalamityLevel),
        };
      }
      const progress = nextProgress[activeId] ?? fullHpProgress(activeChar);
      setActiveCharacterId(activeId);
      setProgressByCharacter(nextProgress);
      setPermanentDeck(progress.permanentDeck);
      setPlayerHp(progress.playerHp);
      setSpiritStones(progress.spiritStones);
      setRunSpirit(0);
      runSessionIdRef.current = null;
      setRunSessionId(null);
      setChapterIndex(0);
      setCalamityLevel(0);
      setMaxCalamityLevel(progress.maxCalamityLevel);
      setPendingCalamity(0);
      setTotalClears(progress.totalClears);
      setInventory(createInitialInventory(startingInventoryData));
      try {
        localStorage.setItem(CHAR_PROGRESS_KEY, JSON.stringify(nextProgress));
        localStorage.setItem(ACTIVE_CHAR_KEY, activeId);
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
      } catch {
        /* ignore */
      }
    } catch {
      clearActiveRunSave();
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        ACHIEVEMENTS_KEY,
        JSON.stringify(unlockedAchievements)
      );
    } catch {
      /* ignore */
    }
  }, [ready, unlockedAchievements]);

  /** 僅在穩定路線頁寫入檢查點；戰鬥／奇遇／休息／坊市中不覆蓋 */
  useEffect(() => {
    if (!ready) return;
    if (!runSessionId) return;
    // 舊 render 的 effect：session 已結束或已換新，禁止寫回舊地圖
    if (runSessionIdRef.current !== runSessionId) return;
    if (
      !selectedTier ||
      dungeonMap.length === 0 ||
      combatScreen !== "path" ||
      isInCombat ||
      activeEvent ||
      activeRestNodeId ||
      activeShopNodeId
    ) {
      return;
    }
    writeActiveRunSave({
      version: 2,
      runSessionId,
      characterId: activeCharacterId,
      chapterIndex,
      tierId: selectedTier.id,
      calamityLevel,
      dungeonMap,
      permanentDeck,
      playerHp,
      spiritStones,
      runSpirit,
      mapMessage,
      savedAt: Date.now(),
    });
  }, [
    ready,
    runSessionId,
    selectedTier,
    chapterIndex,
    calamityLevel,
    dungeonMap,
    permanentDeck,
    playerHp,
    spiritStones,
    runSpirit,
    mapMessage,
    combatScreen,
    isInCombat,
    activeEvent,
    activeRestNodeId,
    activeShopNodeId,
    activeCharacterId,
  ]);

  useEffect(() => {
    if (!ready) return;
    const snapshot: CharacterProgress = {
      permanentDeck: sanitizeDeckForCharacter(
        getCharacter(activeCharacterId),
        permanentDeck
      ),
      playerHp,
      spiritStones,
      totalClears,
      maxCalamityLevel,
    };
    setProgressByCharacter((prev) => {
      const next = { ...prev, [activeCharacterId]: snapshot };
      try {
        localStorage.setItem(CHAR_PROGRESS_KEY, JSON.stringify(next));
        localStorage.setItem(ACTIVE_CHAR_KEY, activeCharacterId);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [
    ready,
    activeCharacterId,
    permanentDeck,
    playerHp,
    spiritStones,
    totalClears,
    maxCalamityLevel,
  ]);

  useEffect(() => {
    if (!ready) return;
    // 僅做上限夾緊；山門回滿在載入／切角／returnToLobby 處理
    setPlayerHp((hp) => Math.min(hp, heroStats.maxHp));
  }, [heroStats.maxHp, ready]);

  const switchCharacter = useCallback(
    (nextId: string) => {
      if (nextId === activeCharacterId) return;
      // 僅允許在山門／角色頁切換：秘境進行中或已選難度時禁止
      if (selectedTier !== null || dungeonMap.length > 0) return;
      const nextChar = getCharacter(nextId);
      if (!nextChar.unlocked) return;

      const currentSnap: CharacterProgress = {
        permanentDeck,
        playerHp,
        spiritStones,
        totalClears,
        maxCalamityLevel,
      };
      const nextSnap = fullHpProgress(
        nextChar,
        progressByCharacter[nextId] ?? createProgress(nextChar)
      );
      const nextMaxCalamity = sanitizeMaxCalamityLevel(
        nextSnap.maxCalamityLevel
      );

      const merged = {
        ...progressByCharacter,
        [activeCharacterId]: {
          ...currentSnap,
          permanentDeck: sanitizeDeckForCharacter(
            getCharacter(activeCharacterId),
            currentSnap.permanentDeck
          ),
        },
        [nextId]: {
          ...nextSnap,
          maxCalamityLevel: nextMaxCalamity,
        },
      };
      setProgressByCharacter(merged);
      setActiveCharacterId(nextId);
      setPermanentDeck(nextSnap.permanentDeck);
      setPlayerHp(nextSnap.playerHp);
      setSpiritStones(nextSnap.spiritStones);
      setTotalClears(nextSnap.totalClears);
      setMaxCalamityLevel(nextMaxCalamity);
      setPendingCalamity((p) => Math.min(p, nextMaxCalamity));
      // 清空上一角色戰鬥臨時狀態，避免劍意／印記／牌堆串用
      setDeckState(EMPTY_DECK);
      setCombatBuffs(INITIAL_COMBAT_BUFFS);
      setKarmaState(INITIAL_KARMA_STATE);
      setPendingDiscard(null);
      setKarmaAutoPlayCard(null);
      karmaAutoPlayApplyRef.current = null;
      setEnergy(MAX_ENERGY);
      setLastDodge(false);
      setLastDamage(null);
      setLastEnemyDamage(null);
      setLastPassiveHeal(null);
      setTotalDamage(0);
      setCombatFeelToast(null);
      setLastRunMessage(`已入駐：${nextChar.name}`);
      setCharacterSelectOpen(false);
      setActiveTab("lobby");
      try {
        localStorage.setItem(CHAR_PROGRESS_KEY, JSON.stringify(merged));
        localStorage.setItem(ACTIVE_CHAR_KEY, nextId);
      } catch {
        /* ignore */
      }
    },
    [
      activeCharacterId,
      permanentDeck,
      playerHp,
      spiritStones,
      totalClears,
      maxCalamityLevel,
      progressByCharacter,
      selectedTier,
      dungeonMap.length,
    ]
  );

  useEffect(() => {
    return () => {
      if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
    };
  }, []);

  const resetCombatState = useCallback(() => {
    if (victoryTimerRef.current) {
      clearTimeout(victoryTimerRef.current);
      victoryTimerRef.current = null;
    }
    victoryStartedRef.current = false;
    playLockRef.current = false;
    stageClearDoneRef.current = false;
    setPhase("playing");
    setBattlePhase("IN_BATTLE");
    setStageClearInfo(null);
    setDamagePopups([]);
    pendingPlayerHitRef.current = null;
    setImpactFeedback(null);
    setPlayerImpactFeedback(null);
    setEnemyTurnPlan(null);
    setLastDamage(null);
    setLastEnemyDamage(null);
    setLastDodge(false);
    setLastPassiveHeal(null);
    setTotalDamage(0);
    setRewardTemplateIds([]);
    setDefeatedEnemyName("");
    setPendingFloorReward(0);
    setPendingTierComplete(false);
    setPendingEliteReward(false);
    setDeckState(EMPTY_DECK);
    setCombatBuffs(INITIAL_COMBAT_BUFFS);
    setKarmaState(INITIAL_KARMA_STATE);
    setPendingDiscard(null);
    setKarmaAutoPlayCard(null);
    karmaAutoPlayApplyRef.current = null;
    setCombatFeelToast(null);
  }, []);

  const resetPermanentDeck = useCallback(() => {
    setPermanentDeck([...character.startingDeck]);
  }, [character.startingDeck]);

  const returnToLobby = useCallback(
    (message: string | null = null, healPlayer = false) => {
      runSessionIdRef.current = null;
      setRunSessionId(null);
      setActiveTab("lobby");
      setIsInCombat(false);
      setCombatScreen("tier-select");
      setSelectedTier(null);
      setTierFloor(1);
      setChapterIndex(0);
      setCalamityLevel(0);
      setStageClearInfo(null);
      setDungeonMap([]);
      setCurrentMapNodeId(null);
      setMapMessage(null);
      setActiveEvent(null);
      setActiveEventNodeId(null);
      setActiveRestNodeId(null);
      setActiveShopNodeId(null);
      setShopOfferIds([]);
      setRunSpirit(0);
      setEnemy(createNeutralEnemy());
      setPhase("playing");
      resetCombatState();
      if (message) setLastRunMessage(message);
      if (healPlayer) setPlayerHp(heroStats.maxHp);
      if (process.env.NODE_ENV !== "production") {
        queueMicrotask(() => {
          console.assert(
            runSessionIdRef.current === null,
            "[run] session must be null after returnToLobby"
          );
          console.assert(
            localStorage.getItem(RUN_SAVE_KEY) === null,
            "[run] active run save must be cleared after returnToLobby"
          );
        });
      }
    },
    [heroStats.maxHp, resetCombatState]
  );

  const startBattleForMapNode = useCallback(
    (tier: DungeonTier, node: MapNode) => {
      const scaledEnemy = getEnemyForMapNode(
        tier,
        node,
        ENEMY_LIST,
        calamityLevel
      );
      if (process.env.NODE_ENV !== "production") {
        console.log("[battle:start]", {
          nodeId: node.id,
          nodeType: node.type,
          enemyId: scaledEnemy.id,
          hp: scaledEnemy.maxHp,
        });
      }
      // 強制新物件，不沿用上一場 enemy state
      const freshEnemy = lockEnemyIntent({
        ...scaledEnemy,
        currentHp: scaledEnemy.maxHp,
        block: 0,
        intentIndex: 0,
      });
      setEnemy(freshEnemy);
      setBattleInstanceId((id) => id + 1);
      setTierFloor(node.tier + 1);
      setCurrentMapNodeId(node.id);
      setDeckState(initBattleDeck(permanentDeck));
      setEnergy(MAX_ENERGY);
      setPhase("playing");
      setBattlePhase("IN_BATTLE");
      victoryStartedRef.current = false;
      playLockRef.current = false;
      setDamagePopups([]);
      pendingPlayerHitRef.current = null;
      setImpactFeedback(null);
      setPlayerImpactFeedback(null);
      setEnemyTurnPlan(null);
      setLastDamage(null);
      setLastEnemyDamage(null);
      setLastPassiveHeal(null);
      setTotalDamage(0);
      setCombatBuffs(INITIAL_COMBAT_BUFFS);
      setKarmaState(INITIAL_KARMA_STATE);
      setPendingDiscard(null);
      setKarmaAutoPlayCard(null);
      karmaAutoPlayApplyRef.current = null;
      setCombatFeelToast(null);
      setLastDodge(false);
      setLastRunMessage(null);
      setMapMessage(null);
      setIsInCombat(true);
      setCombatScreen("battle");
      setActiveTab("combat");
      playCardDrawSfx(COMBAT_HAND_SIZE);
    },
    [permanentDeck, calamityLevel]
  );

  const returnToPath = useCallback(
    (message: string | null = null) => {
      setIsInCombat(false);
      setCombatScreen("path");
      setCurrentMapNodeId(null);
      setActiveTab("combat");
      resetCombatState();
      if (message) setMapMessage(message);
    },
    [resetCombatState]
  );

  const finishMapNode = useCallback(
    (nodeId: string, message: string) => {
      setDungeonMap((prev) => completeMapNode(prev, nodeId));
      setCurrentMapNodeId(null);
      returnToPath(message);
    },
    [returnToPath]
  );

  const handleMapNodeSelect = useCallback(
    (node: MapNode) => {
      if (
        !selectedTier ||
        node.status !== "available" ||
        activeEvent ||
        activeRestNodeId ||
        activeShopNodeId ||
        mapActionLockRef.current
      ) {
        return;
      }

      playStartCultivationSfx();

      switch (node.type) {
        case "combat":
        case "elite":
        case "boss":
          mapActionLockRef.current = true;
          startBattleForMapNode(selectedTier, node);
          queueMicrotask(() => {
            mapActionLockRef.current = false;
          });
          break;
        case "rest": {
          restChoiceLockRef.current = false;
          setActiveRestNodeId(node.id);
          break;
        }
        case "shop": {
          shopChoiceLockRef.current = false;
          const pool =
            character.combatPath === "karma"
              ? KARMA_REWARD_IDS
              : SWORD_TEMPLATE_IDS;
          setShopOfferIds(pickRandomTemplateIds(3, pool));
          setActiveShopNodeId(node.id);
          break;
        }
        case "event": {
          eventChoiceLockRef.current = false;
          setActiveEvent(pickStoryEvent(node.title));
          setActiveEventNodeId(node.id);
          break;
        }
      }
    },
    [
      selectedTier,
      startBattleForMapNode,
      activeEvent,
      activeRestNodeId,
      activeShopNodeId,
      character.combatPath,
    ]
  );

  const handleRestHeal = useCallback(() => {
    if (!activeRestNodeId || restChoiceLockRef.current) return;
    if (playerHp >= heroStats.maxHp) return;
    restChoiceLockRef.current = true;
    const heal = Math.floor(heroStats.maxHp * 0.3);
    setPlayerHp((hp) => Math.min(heroStats.maxHp, hp + heal));
    const nodeId = activeRestNodeId;
    setActiveRestNodeId(null);
    finishMapNode(nodeId, `調息療傷，恢復 ${heal} 氣血`);
  }, [activeRestNodeId, playerHp, heroStats.maxHp, finishMapNode]);

  const handleRestSpirit = useCallback(() => {
    if (!activeRestNodeId || restChoiceLockRef.current) return;
    restChoiceLockRef.current = true;
    setRunSpirit((s) => s + 80);
    const nodeId = activeRestNodeId;
    setActiveRestNodeId(null);
    finishMapNode(nodeId, "吐納聚靈，獲得 80 靈砂");
  }, [activeRestNodeId, finishMapNode]);

  const handleShopBuy = useCallback(
    (templateId: CardTemplateId) => {
      if (!activeShopNodeId || shopChoiceLockRef.current) return;
      if (runSpirit < SHOP_PRICE) return;
      shopChoiceLockRef.current = true;
      setRunSpirit((s) => s - SHOP_PRICE);
      setPermanentDeck((prev) => [...prev, templateId]);
      const cardName = CARD_TEMPLATES[templateId]?.name ?? "法訣";
      const nodeId = activeShopNodeId;
      setActiveShopNodeId(null);
      setShopOfferIds([]);
      finishMapNode(nodeId, `購得「${cardName}」，耗費 ${SHOP_PRICE} 靈砂`);
    },
    [activeShopNodeId, runSpirit, finishMapNode]
  );

  const handleShopLeave = useCallback(() => {
    if (!activeShopNodeId || shopChoiceLockRef.current) return;
    shopChoiceLockRef.current = true;
    const nodeId = activeShopNodeId;
    setActiveShopNodeId(null);
    setShopOfferIds([]);
    finishMapNode(nodeId, "未購一物，離開坊市。");
  }, [activeShopNodeId, finishMapNode]);

  const handleEventChoice = useCallback(
    (choice: EventChoice) => {
      if (!activeEvent || !activeEventNodeId || eventChoiceLockRef.current) {
        return;
      }
      eventChoiceLockRef.current = true;
      const { nextHp, spiritDelta, summary } = applyEventChoice(choice, {
        maxHp: heroStats.maxHp,
        currentHp: playerHp,
      });
      setPlayerHp(nextHp);
      if (spiritDelta !== 0) {
        setRunSpirit((s) => s + spiritDelta);
      }
      setActiveEvent(null);
      setActiveEventNodeId(null);
      finishMapNode(activeEventNodeId, summary);
    },
    [
      activeEvent,
      activeEventNodeId,
      finishMapNode,
      heroStats.maxHp,
      playerHp,
    ]
  );

  const hasActiveRun = selectedTier !== null && dungeonMap.length > 0;

  // 裝備加血後：不在秘境中則山門氣血對齊滿血上限
  useEffect(() => {
    if (!ready || hasActiveRun || isInCombat) return;
    setPlayerHp(heroStats.maxHp);
  }, [ready, hasActiveRun, isInCombat, heroStats.maxHp]);

  const continueGame = useCallback(() => {
    playStartCultivationSfx();
    setActiveTab("combat");
    setLastRunMessage(null);
  }, []);

  const quitRun = useCallback(() => {
    // 先 invalidate session，堵住尚未執行的舊 checkpoint effect 寫回
    runSessionIdRef.current = null;
    setRunSessionId(null);
    clearActiveRunSave();
    setRunSpirit(0);
    resetPermanentDeck();
    returnToLobby("已放棄修行，本次五境進度已重置。", true);
  }, [returnToLobby, resetPermanentDeck]);

  const dismissRunMessage = useCallback(() => {
    setLastRunMessage(null);
  }, []);

  const abandonGame = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "確定放棄本次修行？當前五境進度、法訣與靈砂將全部失去，下次將從引氣入道重新開始。"
      )
    ) {
      return;
    }
    quitRun();
  }, [quitRun]);

  const enterTierSelect = useCallback(() => {
    playStartCultivationSfx();
    setIsInCombat(false);
    setCombatScreen("tier-select");
    setSelectedTier(null);
    setTierFloor(1);
    setPendingCalamity((p) => Math.min(p, maxCalamityLevel));
    resetCombatState();
    setActiveTab("combat");
  }, [resetCombatState, maxCalamityLevel]);

  const startCultivationRun = useCallback(
    (level: number) => {
      const tier = DUNGEON_TIERS[0];
      if (!tier) return;
      playStartCultivationSfx();

      const calamity = Math.max(
        0,
        Math.min(
          maxCalamityLevel,
          Math.min(MAX_CALAMITY_LEVEL, Math.floor(level))
        )
      );
      const newRunId = createRunSessionId();
      runSessionIdRef.current = newRunId;
      setRunSessionId(newRunId);
      setChapterIndex(0);
      setCalamityLevel(calamity);
      setSelectedTier(tier);
      setTierFloor(1);

      const freshMap = generateMoonNightMap(1, tier.floors);
      if (process.env.NODE_ENV !== "production") {
        for (let step = 0; step < freshMap.length; step++) {
          for (const node of freshMap[step]) {
            if (step === 0 && node.status !== "available") {
              console.error("Fresh run invalid first node", node);
            }
            if (step > 0 && node.status !== "locked") {
              console.error("Fresh run leaked unlocked node", node);
            }
          }
        }
      }

      setDungeonMap(freshMap);
      setCurrentMapNodeId(null);
      setMapMessage(null);
      setActiveEvent(null);
      setActiveEventNodeId(null);
      setActiveRestNodeId(null);
      setActiveShopNodeId(null);
      setShopOfferIds([]);
      setIsInCombat(false);
      setCombatScreen("path");
      setActiveTab("combat");
      setPhase("playing");
      resetPermanentDeck();
      setRunSpirit(100);
      setPlayerHp(character.maxHp);
      setEnemy(createNeutralEnemy());
      resetCombatState();
    },
    [resetCombatState, resetPermanentDeck, character.maxHp, maxCalamityLevel]
  );

  const restartAfterDefeat = useCallback(() => {
    stopDefeatMusic();
    runSessionIdRef.current = null;
    setRunSessionId(null);
    clearActiveRunSave();
    setPhase("playing");
    startCultivationRun(calamityLevel);
  }, [calamityLevel, startCultivationRun]);

  const returnMenuAfterDefeat = useCallback(() => {
    stopDefeatMusic();
    runSessionIdRef.current = null;
    setRunSessionId(null);
    clearActiveRunSave();
    setRunSpirit(0);
    setPhase("playing");
    resetPermanentDeck();
    returnToLobby("道途已斷，已返回山門。", true);
  }, [returnToLobby, resetPermanentDeck]);

  const spawnDamagePopupNow = useCallback((damage: number) => {
    popupIdRef.current += 1;
    const popup: DamagePopup = {
      id: `popup_${popupIdRef.current}`,
      value: damage,
      isCrit: false,
      isHighDamage: damage >= HIGH_DAMAGE_THRESHOLD,
      x: 38 + Math.random() * 24,
      y: 28 + Math.random() * 18,
    };
    setDamagePopups((prev) => [...prev, popup]);
    window.setTimeout(() => {
      setDamagePopups((prev) => prev.filter((p) => p.id !== popup.id));
    }, DAMAGE_NUMBER_MS);
  }, []);

  const queuePendingPlayerHit = useCallback((damage: number) => {
    if (damage <= 0) return;
    pendingPlayerHitRef.current = { damage };
    setLastDamage(damage);
  }, []);

  const beginVictorySequence = useCallback(
    (
      enemyName: string,
      tier: DungeonTier,
      mapNodeId: string,
      mapNodes: MapNode[][]
    ) => {
      if (victoryStartedRef.current) return;
      victoryStartedRef.current = true;

      playBattleWinSfx();

      const node = getMapNode(mapNodes, mapNodeId);
      setDefeatedEnemyName(enemyName);
      const rewardCount = node?.type === "elite" ? 4 : 3;
      setRewardTemplateIds(
        pickRandomTemplateIds(
          rewardCount,
          character.combatPath === "karma"
            ? KARMA_REWARD_IDS
            : SWORD_TEMPLATE_IDS
        )
      );
      const floorReward = node
        ? getMapNodeSpiritReward(tier, node)
        : getFloorSpiritReward(tier);
      setPendingFloorReward(floorReward);
      setPendingTierComplete(node?.type === "boss");
      setPendingEliteReward(node?.type === "elite");
      setBattlePhase("VICTORY_ANIM");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      victoryTimerRef.current = setTimeout(() => {
        rewardDoneRef.current = false;
        setBattlePhase("REWARD");
        victoryTimerRef.current = null;
      }, 1500);
    },
    [character.combatPath]
  );

  const checkVictory = useCallback(
    (
      newHp: number,
      enemyName: string,
      tier: DungeonTier | null,
      mapNodeId: string | null,
      mapNodes: MapNode[][]
    ) => {
      if (
        newHp <= 0 &&
        tier &&
        mapNodeId &&
        battlePhase === "IN_BATTLE"
      ) {
        beginVictorySequence(enemyName, tier, mapNodeId, mapNodes);
      }
    },
    [battlePhase, beginVictorySequence]
  );

  /**
   * 統一命中幀：音效 + HP 結算 + 傷害數字 + 立繪 feedback。
   * 必須由 CombatView 在 IMPACT_AT_MS 呼叫，不可在出牌當下呼叫。
   */
  const resolveCombatImpact = useCallback(
    (fx: PlayFxKind) => {
      playImpact(fx);

      const pending = pendingPlayerHitRef.current;
      pendingPlayerHitRef.current = null;
      if (!pending || pending.damage <= 0) return;

      const dmg = pending.damage;
      let displayHp = 0;

      setEnemy((prev) => {
        const next = applyDamageToEnemy(prev, dmg);
        displayHp = next.currentHp;
        checkVictory(
          next.currentHp,
          prev.name,
          selectedTier,
          currentMapNodeId,
          dungeonMap
        );
        return next;
      });

      setTotalDamage((prev) => prev + dmg);
      spawnDamagePopupNow(dmg);

      impactIdRef.current += 1;
      setImpactFeedback({
        id: impactIdRef.current,
        damage: dmg,
        displayHp,
        frostSlash: character.combatPath === "sword",
      });

      queueMicrotask(() => {
        if (!victoryStartedRef.current) playLockRef.current = false;
      });
    },
    [
      checkVictory,
      selectedTier,
      currentMapNodeId,
      dungeonMap,
      character.combatPath,
      spawnDamagePopupNow,
    ]
  );

  const playCard = useCallback(
    (card: Card): boolean => {
      if (
        playLockRef.current ||
        victoryStartedRef.current ||
        phase !== "playing" ||
        battlePhase !== "IN_BATTLE" ||
        enemy.currentHp <= 0 ||
        pendingDiscard ||
        karmaAutoPlayCard
      ) {
        return false;
      }

      const template = getCardTemplate(card);
      if (!template) return false;

      /* —— 因果道 —— */
      if (character.combatPath === "karma") {
        const kt0 = getKarmaTemplate(card.id);
        if (!kt0) return false;

        let deck = deckState;
        let en = energy;
        let karma = karmaState;
        let dealt = 0;
        let toast: string | undefined;
        let waitDiscard: "yin" | "yang" | null = null;
        let cardsDrawn = 0;
        /** 物件盒：避免巢狀函式賦值讓 TS 把外層變數推成 never */
        const deferBox: { auto: Card | null } = { auto: null };

        type PlayOpts = {
          free?: boolean;
          suppressPassive?: boolean;
          /** 已從手牌／牌庫取出，打出後進棄牌（斷絕立即打出） */
          skipRemoveFromHand?: boolean;
          /** 宿因重演幻影：不進棄牌、不佔牌組 */
          phantom?: boolean;
        };

        let replayRemaining: PlayedCardRecord[] = [];

        const resolveOne = (c: Card, opts: PlayOpts = {}): boolean => {
          const tpl = getCardTemplate(c);
          const kt = getKarmaTemplate(c.id);
          if (!tpl || !kt) return false;

          const cost = opts.free ? 0 : getEffectiveCost(c);
          if (!opts.free && en < cost) return false;

          // 【捨因解果】／【果生新因】：無可棄同面牌則不可打出（不扣費、不相生）
          if (
            !opts.free &&
            !opts.phantom &&
            !canPlayAspectDiscardCard(c, deck.hand)
          ) {
            return false;
          }

          if (opts.phantom) {
            /* 幻影結算：不改動牌堆 */
          } else if (!opts.skipRemoveFromHand) {
            const { deck: after, played } = playCardFromHand(deck, c.instanceId);
            if (!played) return false;
            deck = after;
          } else {
            deck = {
              ...deck,
              discardPile: [
                ...deck.discardPile,
                { ...c, costModifier: undefined },
              ],
            };
          }

          en -= cost;

          const result = resolveKarmaCardPlay({
            template: tpl,
            karmaTemplate: kt,
            card: c,
            deck,
            energy: en,
            karma,
            // 僅宿因幻影不記入本回合出牌；斷絕自動打出要記入
            freeReplay: Boolean(opts.phantom),
            suppressPassive: Boolean(
              opts.suppressPassive || opts.free || opts.phantom
            ),
          });

          deck = result.deck;
          karma = result.karma;
          dealt += result.damage;
          cardsDrawn += result.cardsDrawn;
          if (result.feelToast) toast = result.feelToast;

          if (result.autoPlayCard) {
            // 延後到動畫：不經手牌、不在此同步結算
            deferBox.auto = result.autoPlayCard;
          }

          if (result.replayQueue && result.replayQueue.length > 0) {
            for (let i = 0; i < result.replayQueue.length; i++) {
              if (waitDiscard || deferBox.auto) {
                replayRemaining = result.replayQueue.slice(i);
                break;
              }
              const rec = result.replayQueue[i];
              const replayCard = createCard(rec.templateId as CardTemplateId);
              resolveOne(replayCard, {
                free: true,
                suppressPassive: true,
                phantom: true,
              });
              if (waitDiscard || deferBox.auto) {
                replayRemaining = result.replayQueue.slice(i + 1);
                break;
              }
            }
          }

          if (result.needsDiscardChoice) {
            waitDiscard = result.needsDiscardChoice.aspect;
            return true;
          }

          return true;
        };

        playLockRef.current = true;
        if (!resolveOne(card)) {
          playLockRef.current = false;
          return false;
        }

        if (cardsDrawn > 0) {
          playCardDrawSfx(cardsDrawn);
        }

        const applyDamageAndMaybeUnlock = (dmg: number, unlock: boolean) => {
          if (dmg > 0) {
            queuePendingPlayerHit(dmg);
          } else {
            setLastDamage(null);
          }
          if (unlock && !pendingPlayerHitRef.current) {
            queueMicrotask(() => {
              if (!victoryStartedRef.current) playLockRef.current = false;
            });
          }
        };

        setDeckState(deck);
        setEnergy(en);
        setKarmaState(karma);
        if (toast) {
          setCombatFeelToast(toast);
          window.setTimeout(() => setCombatFeelToast(null), 1600);
        }

        if (deferBox.auto) {
          const autoCard = deferBox.auto;
          const pendingReplay = replayRemaining;
          karmaAutoPlayApplyRef.current = () => {
            let d = deck;
            let k = karma;
            let e = en;
            let autoDealt = 0;
            let autoToast: string | undefined;
            let autoWait: "yin" | "yang" | null = null;
            let autoReplayLeft: PlayedCardRecord[] = [...pendingReplay];

            const tpl = getCardTemplate(autoCard);
            const kt = getKarmaTemplate(autoCard.id);
            if (!tpl || !kt) return;

            d = {
              ...d,
              discardPile: [
                ...d.discardPile,
                { ...autoCard, costModifier: undefined },
              ],
            };

            const result = resolveKarmaCardPlay({
              template: tpl,
              karmaTemplate: kt,
              card: autoCard,
              deck: d,
              energy: e,
              karma: k,
              freeReplay: false,
              suppressPassive: true,
            });
            d = result.deck;
            k = result.karma;
            autoDealt += result.damage;
            if (result.feelToast) autoToast = result.feelToast;
            if (result.needsDiscardChoice) {
              autoWait = result.needsDiscardChoice.aspect;
            }

            // 若自動打出的是宿因重演等，同步處理幻影佇列
            const queue = [
              ...(result.replayQueue ?? []),
              ...autoReplayLeft,
            ];
            autoReplayLeft = [];
            for (let i = 0; i < queue.length; i++) {
              if (autoWait) {
                autoReplayLeft = queue.slice(i);
                break;
              }
              const rec = queue[i];
              const phantom = createCard(rec.templateId as CardTemplateId);
              const pt = getCardTemplate(phantom);
              const pk = getKarmaTemplate(phantom.id);
              if (!pt || !pk) continue;
              const pr = resolveKarmaCardPlay({
                template: pt,
                karmaTemplate: pk,
                card: phantom,
                deck: d,
                energy: e,
                karma: k,
                freeReplay: true,
                suppressPassive: true,
              });
              d = pr.deck;
              k = pr.karma;
              autoDealt += pr.damage;
              if (pr.feelToast) autoToast = pr.feelToast;
              if (pr.needsDiscardChoice) {
                autoWait = pr.needsDiscardChoice.aspect;
                autoReplayLeft = queue.slice(i + 1);
                break;
              }
              if (pr.replayQueue?.length) {
                queue.splice(i + 1, 0, ...pr.replayQueue);
              }
            }

            setDeckState(d);
            setKarmaState(k);
            if (autoToast) {
              setCombatFeelToast(autoToast);
              window.setTimeout(() => setCombatFeelToast(null), 1600);
            }
            if (autoWait) {
              setPendingDiscard({
                aspect: autoWait,
                replayRemaining:
                  autoReplayLeft.length > 0 ? autoReplayLeft : undefined,
              });
            }
            if (autoDealt > 0) {
              queuePendingPlayerHit(autoDealt);
            }
          };

          setKarmaAutoPlayCard(autoCard);
          applyDamageAndMaybeUnlock(dealt, false);
          return true;
        }

        if (waitDiscard) {
          setPendingDiscard({
            aspect: waitDiscard,
            replayRemaining:
              replayRemaining.length > 0 ? replayRemaining : undefined,
          });
          applyDamageAndMaybeUnlock(dealt, true);
          return true;
        }

        applyDamageAndMaybeUnlock(dealt, true);
        return true;
      }

      /* —— 白夜劍道 —— */
      const paid = getEffectiveCost(card);
      if (energy < paid) return false;

      const { deck: afterPlay, played } = playCardFromHand(
        deckState,
        card.instanceId
      );
      if (!played) return false;

      playLockRef.current = true;

      const { player: nextPlayer, damage, draw, energyDelta } =
        resolveCardEffects(template, {
          hp: playerHp,
          energy,
          swordIntent: combatBuffs.swordIntent,
          dodge: combatBuffs.dodge,
          nextSwordBonus: combatBuffs.nextSwordBonus,
        });

      // 以實際支付費用覆寫模板費用差（通常相同）；允許加真元突破 3
      const gainPart = energyDelta + template.cost;
      setCombatBuffs({
        swordIntent: nextPlayer.swordIntent,
        dodge: nextPlayer.dodge,
        nextSwordBonus: nextPlayer.nextSwordBonus,
      });
      setEnergy(energy - paid + gainPart);

      const newDeck = drawCards(afterPlay, draw);
      if (draw > 0) {
        playCardDrawSfx(draw);
      }

      if (damage > 0) {
        queuePendingPlayerHit(damage);
        setDeckState(newDeck);
        // 解鎖與 HP 結算改由 resolveCombatImpact（命中幀）處理
        return true;
      }

      setLastDamage(null);
      setDeckState(newDeck);
      queueMicrotask(() => {
        playLockRef.current = false;
      });
      return true;
    },
    [
      phase,
      battlePhase,
      enemy,
      energy,
      deckState,
      playerHp,
      combatBuffs,
      character.combatPath,
      karmaState,
      pendingDiscard,
      karmaAutoPlayCard,
      queuePendingPlayerHit,
      checkVictory,
      selectedTier,
      currentMapNodeId,
      dungeonMap,
    ]
  );

  const confirmAspectDiscard = useCallback(
    (instanceId: string) => {
      if (!pendingDiscard) return;
      const drawAspect = pendingDiscard.aspect === "yin" ? "yang" : "yin";
      let { deck: next, cardsDrawn } = finishAspectDiscardAndDraw(
        deckState,
        instanceId,
        drawAspect
      );
      let karma = karmaState;
      let en = energy;
      let dealt = 0;
      let toast: string | undefined =
        drawAspect === "yang" ? "抽取果牌" : "抽取因牌";
      let waitDiscard: "yin" | "yang" | null = null;
      let replayRemaining: PlayedCardRecord[] = [];
      const queue = pendingDiscard.replayRemaining ?? [];

      const resolvePhantom = (c: Card): void => {
        const tpl = getCardTemplate(c);
        const kt = getKarmaTemplate(c.id);
        if (!tpl || !kt) return;

        const result = resolveKarmaCardPlay({
          template: tpl,
          karmaTemplate: kt,
          card: c,
          deck: next,
          energy: en,
          karma,
          freeReplay: true,
          suppressPassive: true,
        });

        next = result.deck;
        karma = result.karma;
        dealt += result.damage;
        cardsDrawn += result.cardsDrawn;
        if (result.feelToast) toast = result.feelToast;

        if (result.autoPlayCard) {
          const auto = result.autoPlayCard;
          next = {
            ...next,
            discardPile: [
              ...next.discardPile,
              { ...auto, costModifier: undefined },
            ],
          };
          resolvePhantom(auto);
        }

        if (result.replayQueue && result.replayQueue.length > 0) {
          for (let i = 0; i < result.replayQueue.length; i++) {
            if (waitDiscard) {
              replayRemaining = result.replayQueue.slice(i);
              break;
            }
            const rec = result.replayQueue[i];
            resolvePhantom(createCard(rec.templateId as CardTemplateId));
            if (waitDiscard) {
              replayRemaining = result.replayQueue.slice(i + 1);
              break;
            }
          }
        }

        if (result.needsDiscardChoice) {
          waitDiscard = result.needsDiscardChoice.aspect;
        }
      };

      for (let i = 0; i < queue.length; i++) {
        if (waitDiscard) {
          replayRemaining = [...replayRemaining, ...queue.slice(i)];
          break;
        }
        resolvePhantom(createCard(queue[i].templateId as CardTemplateId));
        if (waitDiscard) {
          replayRemaining = [...replayRemaining, ...queue.slice(i + 1)];
          break;
        }
      }

      setDeckState(next);
      setEnergy(en);
      setKarmaState(karma);

      if (cardsDrawn > 0) {
        playCardDrawSfx(cardsDrawn);
      }
      if (toast) {
        setCombatFeelToast(toast);
        window.setTimeout(() => setCombatFeelToast(null), 1400);
      }

      if (waitDiscard) {
        setPendingDiscard({
          aspect: waitDiscard,
          replayRemaining:
            replayRemaining.length > 0 ? replayRemaining : undefined,
        });
      } else {
        setPendingDiscard(null);
      }

      if (dealt > 0) {
        queuePendingPlayerHit(dealt);
        resolveCombatImpact(
          character.combatPath === "sword" ? "fuxue" : "qiandhen"
        );
      }
    },
    [
      pendingDiscard,
      deckState,
      karmaState,
      energy,
      enemy,
      queuePendingPlayerHit,
      resolveCombatImpact,
      character.combatPath,
      checkVictory,
      selectedTier,
      currentMapNodeId,
      dungeonMap,
    ]
  );

  const endTurn = useCallback((): EnemyTurnPlan | false => {
    if (
      playLockRef.current ||
      victoryStartedRef.current ||
      phase !== "playing" ||
      battlePhase !== "IN_BATTLE" ||
      enemy.currentHp <= 0 ||
      pendingDiscard ||
      karmaAutoPlayCard
    ) {
      return false;
    }

    playLockRef.current = true;

    let newDeck = discardHand(deckState);
    let karma = karmaState;
    let nextTurnBonus = 0;

    if (character.combatPath === "karma") {
      const ended = endKarmaPlayerTurn(karma, newDeck);
      karma = ended.state;
      newDeck = ended.deck;
      nextTurnBonus = karma.nextTurnEnergyBonus;
      karma = { ...karma, nextTurnEnergyBonus: 0 };
    }

    setEnergy(MAX_ENERGY + nextTurnBonus);
    setLastPassiveHeal(null);
    setLastDamage(null);

    const intent = getEnemyIntent(enemy);
    const isAttack =
      intent.type === "attack" || intent.type === "multiAttack";
    const hitCount =
      intent.type === "multiAttack" ? Math.max(1, intent.hits ?? 1) : 1;

    let anyDodge = false;
    if (
      character.combatPath === "sword" &&
      isAttack &&
      combatBuffs.dodge > 0
    ) {
      anyDodge = rollStackDodge(combatBuffs.dodge);
      setCombatBuffs((prev) => ({ ...prev, dodge: 0 }));
    }

    const hits: number[] = [];
    if (isAttack && !anyDodge) {
      const perHit = intent.value;
      for (let i = 0; i < hitCount; i++) hits.push(perHit);
    }

    let kind: EnemyTurnPlan["kind"] = "idle";
    if (isAttack) kind = "attack";
    else if (intent.type === "defend") kind = "defend";
    else if (intent.type === "buff") kind = "buff";
    else if (intent.type === "debuff") kind = "debuff";
    else if (intent.type === "special") kind = "special";

    const plan: EnemyTurnPlan = {
      intentType: intent.type,
      label: intent.label,
      dodged: anyDodge,
      hits,
      defendValue: intent.type === "defend" ? intent.value : 0,
      kind,
    };

    setEnemyTurnPlan(plan);
    setLastDodge(anyDodge);
    setLastEnemyDamage(null);

    setDeckState(newDeck);
    if (character.combatPath === "karma") {
      setKarmaState(karma);
    }

    setEnemy((prev) => clearEnemyBlock(prev));

    return plan;
  }, [
    phase,
    battlePhase,
    enemy,
    deckState,
    combatBuffs,
    character.combatPath,
    karmaState,
    pendingDiscard,
    karmaAutoPlayCard,
  ]);

  const playerHpRef = useRef(playerHp);
  const karmaBlockRef = useRef(karmaState.block);
  useEffect(() => {
    playerHpRef.current = playerHp;
  }, [playerHp]);
  useEffect(() => {
    karmaBlockRef.current = karmaState.block;
  }, [karmaState.block]);

  /**
   * 敵人單段命中 → 可能拆成護盾／破盾／HP 多步；
   * 每步由 CombatView 在對應 impact 幀呼叫 applyPlayerImpactStep。
   */
  const takeEnemyHitSteps = useCallback(
    (rawDamage: number) => {
      const block =
        character.combatPath === "karma" ? karmaBlockRef.current : 0;
      return planPlayerHitSteps(block, rawDamage);
    },
    [character.combatPath]
  );

  /** 統一玩家受擊 impact 幀 */
  const applyPlayerImpactStep = useCallback(
    (step: { kind: "shield" | "shieldBreak" | "hp"; amount: number }) => {
      const amount = Math.max(0, Math.floor(step.amount));
      let displayHp = playerHpRef.current;
      let displayBlock =
        character.combatPath === "karma" ? karmaBlockRef.current : 0;

      if (step.kind === "shield" || step.kind === "shieldBreak") {
        playShieldHitSfx();
        if (character.combatPath === "karma" && amount > 0) {
          displayBlock = Math.max(0, displayBlock - amount);
          karmaBlockRef.current = displayBlock;
          setKarmaState((prev) => ({
            ...prev,
            block: displayBlock,
            damageTakenThisTurn: prev.damageTakenThisTurn + amount,
          }));
        }
      } else {
        playPlayerHitSfx();
        displayHp = Math.max(0, playerHpRef.current - amount);
        playerHpRef.current = displayHp;
        setPlayerHp(displayHp);
        if (character.combatPath === "karma" && amount > 0) {
          setKarmaState((prev) => ({
            ...prev,
            damageTakenThisTurn: prev.damageTakenThisTurn + amount,
          }));
        }
        setLastEnemyDamage(amount);
      }

      playerImpactIdRef.current += 1;
      const feedback: PlayerImpactFeedback = {
        id: playerImpactIdRef.current,
        kind: step.kind,
        amount,
        displayHp,
        displayBlock,
      };
      setPlayerImpactFeedback(feedback);

      if (displayHp <= 0) {
        runSessionIdRef.current = null;
        setRunSessionId(null);
        clearActiveRunSave();
        setRunSpirit(0);
        playGameOverSfx(true);
        setPhase("defeat");
        playLockRef.current = false;
        return { defeated: true, feedback };
      }
      return { defeated: false, feedback };
    },
    [character.combatPath]
  );

  const resolveEnemyDefend = useCallback((value: number) => {
    if (value <= 0) return;
    setEnemy((prev) => ({
      ...prev,
      block: (prev.block ?? 0) + value,
    }));
  }, []);

  /** 當前敵行動完全結束後：推進 Intent、再生，再允許抽牌 */
  const finishEnemyTurn = useCallback((): boolean => {
    if (phase === "defeat" || victoryStartedRef.current) {
      setEnemyTurnPlan(null);
      return false;
    }

    if (character.combatPath === "karma") {
      setKarmaState((prev) => convertLunzhuanAfterEnemyAttack(prev));
    }

    setEnemy((prev) => {
      let next = prev;
      if (next.passive === "regen") {
        const healed = applyRegenPassive(next);
        const healAmount = healed.currentHp - next.currentHp;
        if (healAmount > 0) setLastPassiveHeal(healAmount);
        next = healed;
      }
      return advanceEnemyIntent(next);
    });
    setEnemyTurnPlan(null);
    return true;
  }, [phase, character.combatPath]);

  /** 棄牌動畫結束後補抽；保持鎖定直到抽牌動畫結束 */
  const completeEndTurnDraw = useCallback(() => {
    if (victoryStartedRef.current || phase === "defeat") {
      playLockRef.current = false;
      return;
    }

    setDeckState((prev) => drawCards(prev, COMBAT_HAND_SIZE));
    playCardDrawSfx(COMBAT_HAND_SIZE);

    if (character.combatPath === "karma") {
      setKarmaState((prev) => beginKarmaPlayerTurn(prev));
    }
  }, [phase, character.combatPath]);

  const finishEndTurnSequence = useCallback(() => {
    playLockRef.current = false;
  }, []);

  const handleKarmaAutoPlayResolve = useCallback(() => {
    karmaAutoPlayApplyRef.current?.();
    karmaAutoPlayApplyRef.current = null;
  }, []);

  const handleKarmaAutoPlayFinished = useCallback(() => {
    setKarmaAutoPlayCard(null);
    queueMicrotask(() => {
      if (!victoryStartedRef.current) playLockRef.current = false;
    });
  }, []);

  const completeRewardNode = useCallback(
    (cardName: string | null, templateId?: CardTemplateId) => {
      if (!selectedTier || !currentMapNodeId || rewardDoneRef.current) return;
      rewardDoneRef.current = true;

      if (templateId) {
        setPermanentDeck((prev) => [...prev, templateId]);
      }

      const nextRunSpirit = runSpirit + pendingFloorReward;
      setRunSpirit(nextRunSpirit);

      const updatedMap = completeMapNode(dungeonMap, currentMapNodeId);
      setDungeonMap(updatedMap);

      const tierComplete =
        pendingTierComplete || isBossCleared(updatedMap);

      if (tierComplete) {
        setUnlockedAchievements((prev) => {
          if (prev.includes(selectedTier.achievementId)) return prev;
          return [...prev, selectedTier.achievementId];
        });

        const meta = getDungeonChapterMeta(selectedTier);
        stageClearDoneRef.current = false;

        if (chapterIndex < 4) {
          setStageClearInfo({
            kind: "advance",
            title: meta.breakthroughTitle,
            subtitle: `${meta.chapterLabel} · ${meta.realmLabel}`,
            description: meta.breakthroughDescription,
            buttonLabel: meta.breakthroughButton,
          });
          setBattlePhase("STAGE_CLEAR");
          return;
        }

        const convert = Math.floor(nextRunSpirit * 0.5);
        setStageClearInfo({
          kind: "ascend",
          title: "渡劫成功",
          subtitle: "五境圓滿 · 飛升在即",
          description: meta.breakthroughDescription,
          buttonLabel: "飛升",
          convertSpirit: convert,
        });
        setBattlePhase("STAGE_CLEAR");
        return;
      }

      returnToPath(
        cardName
          ? `擊敗敵人，獲得「${cardName}」。請擇下一途繼續。`
          : "擊敗敵人，已放棄法訣獎勵。請擇下一途繼續。"
      );
    },
    [
      selectedTier,
      currentMapNodeId,
      dungeonMap,
      pendingFloorReward,
      pendingTierComplete,
      runSpirit,
      chapterIndex,
      returnToPath,
    ]
  );

  const handleRewardSelect = useCallback(
    (templateId: CardTemplateId) => {
      completeRewardNode(CARD_TEMPLATES[templateId].name, templateId);
    },
    [completeRewardNode]
  );

  const handleRewardSkip = useCallback(() => {
    completeRewardNode(null);
  }, [completeRewardNode]);

  const handleStageClearContinue = useCallback(() => {
    if (!stageClearInfo || stageClearDoneRef.current) {
      return;
    }
    stageClearDoneRef.current = true;
    const info = stageClearInfo;

    if (info.kind === "advance") {
      const nextIndex = chapterIndex + 1;
      const nextTier = DUNGEON_TIERS[nextIndex];
      if (!nextTier) {
        stageClearDoneRef.current = false;
        return;
      }

      const heal = Math.floor(heroStats.maxHp * 0.25);
      setPlayerHp((hp) => Math.min(heroStats.maxHp, hp + heal));
      setChapterIndex(nextIndex);
      setSelectedTier(nextTier);
      setTierFloor(1);

      const freshMap = generateMoonNightMap(nextIndex + 1, nextTier.floors);
      if (process.env.NODE_ENV !== "production") {
        for (let step = 0; step < freshMap.length; step++) {
          for (const node of freshMap[step]) {
            if (step === 0 && node.status !== "available") {
              console.error("Advance chapter invalid first node", node);
            }
            if (step > 0 && node.status !== "locked") {
              console.error("Advance chapter leaked unlocked node", node);
            }
          }
        }
      }

      setDungeonMap(freshMap);
      setCurrentMapNodeId(null);
      setMapMessage(null);
      setActiveEvent(null);
      setActiveEventNodeId(null);
      setActiveRestNodeId(null);
      setActiveShopNodeId(null);
      setShopOfferIds([]);
      setEnemy(createNeutralEnemy());
      setIsInCombat(false);
      setCombatScreen("path");
      setActiveTab("combat");
      resetCombatState();
      return;
    }

    // ascend
    const convert = info.convertSpirit ?? 0;
    if (convert > 0) {
      setSpiritStones((s) => s + convert);
    }
    setRunSpirit(0);
    setTotalClears((c) => c + 1);
    if (
      calamityLevel === maxCalamityLevel &&
      maxCalamityLevel < MAX_CALAMITY_LEVEL
    ) {
      setMaxCalamityLevel(maxCalamityLevel + 1);
    }
    setUnlockedAchievements((prev) => {
      const id = selectedTier?.achievementId ?? "ach_ascension_clear";
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
    runSessionIdRef.current = null;
    setRunSessionId(null);
    clearActiveRunSave();
    resetPermanentDeck();
    returnToLobby(
      `渡劫成功！五境圓滿，餘砂化為靈石 +${convert}。`,
      true
    );
  }, [
    stageClearInfo,
    chapterIndex,
    heroStats.maxHp,
    calamityLevel,
    maxCalamityLevel,
    selectedTier,
    returnToLobby,
    resetPermanentDeck,
    resetCombatState,
  ]);

  const deckInfo = useMemo(
    () => ({
      draw: deckState.drawPile.length,
      discard: deckState.discardPile.length,
      exhaust: deckState.exhaustPile.length,
    }),
    [deckState]
  );

  const renderContent = () => {
    switch (activeTab) {
      case "lobby":
      case "characters":
        return (
          <div className="flex min-h-0 flex-1 flex-col">
            <LobbyView
              hero={hero}
              character={character}
              stats={heroStats}
              playerHp={playerHp}
              spiritStones={spiritStones}
              totalClears={totalClears}
              achievementCount={unlockedAchievements.length}
              deckCount={permanentDeck.length}
              lastRunMessage={lastRunMessage}
              hasActiveRun={hasActiveRun}
              runLabel={
                selectedTier
                  ? (() => {
                      const meta = getDungeonChapterMeta(selectedTier);
                      const base = `${meta.chapterLabel} · ${meta.realmLabel} · ${getCalamityLabel(calamityLevel)}`;
                      if (isInCombat) return `${base} · 戰鬥中`;
                      if (combatScreen === "path") return `${base} · 岔路`;
                      return base;
                    })()
                  : null
              }
              onEnterDungeon={enterTierSelect}
              onContinueGame={continueGame}
              onAbandonGame={abandonGame}
              onDismissRunMessage={dismissRunMessage}
            />
          </div>
        );
      case "combat":
        if (combatScreen === "tier-select") {
          return (
            <div className="flex min-h-0 flex-1 flex-col">
              <CultivationStartView
                maxCalamityLevel={maxCalamityLevel}
                selectedCalamity={pendingCalamity}
                onCalamityChange={setPendingCalamity}
                onStart={() => startCultivationRun(pendingCalamity)}
              />
            </div>
          );
        }
        if (combatScreen === "path" && selectedTier) {
          const meta = getDungeonChapterMeta(selectedTier);
          return (
            <PathChoiceView
              map={dungeonMap}
              choices={getAvailableNodes(dungeonMap)}
              tierName={selectedTier.name}
              chapterLabel={meta.chapterLabel}
              realmLabel={meta.realmLabel}
              runChapterIndex={chapterIndex}
              runChapterTotal={5}
              playerHp={playerHp}
              maxHp={heroStats.maxHp}
              runSpirit={runSpirit}
              completedCount={countCompletedNodes(dungeonMap)}
              totalCount={countTotalNodes(dungeonMap)}
              mapMessage={mapMessage}
              currentNodeId={
                getAvailableNodes(dungeonMap)[0]?.id ?? currentMapNodeId
              }
              onSelectNode={handleMapNodeSelect}
            />
          );
        }
        if (!isInCombat) {
          return null;
        }
        return (
          <CombatView
            key={`${currentMapNodeId ?? "battle"}-${battleInstanceId}`}
            hero={hero}
            heroStats={heroStats}
            enemy={enemy}
            tierName={selectedTier?.name}
            locationName={
              selectedTier
                ? getDungeonChapterMeta(selectedTier).locationName
                : undefined
            }
            tierFloor={tierFloor}
            totalFloors={selectedTier?.floors ?? 8}
            playerHp={playerHp}
            energy={energy}
            combatBuffs={combatBuffs}
            phase={phase}
            battlePhase={battlePhase}
            hand={deckState.hand}
            drawPileCount={deckInfo.draw}
            discardPileCount={deckInfo.discard}
            exhaustPileCount={deckInfo.exhaust}
            deckCount={permanentDeck.length}
            damagePopups={damagePopups}
            impactFeedback={impactFeedback}
            playerImpactFeedback={playerImpactFeedback}
            enemyTurnPlan={enemyTurnPlan}
            isShaking={isShaking}
            lastDamage={lastDamage}
            lastEnemyDamage={lastEnemyDamage}
            lastDodge={lastDodge}
            lastPassiveHeal={lastPassiveHeal}
            totalDamage={totalDamage}
            onPlayCard={playCard}
            onCombatImpact={resolveCombatImpact}
            onEndTurn={endTurn}
            takeEnemyHitSteps={takeEnemyHitSteps}
            applyPlayerImpactStep={applyPlayerImpactStep}
            resolveEnemyDefend={resolveEnemyDefend}
            finishEnemyTurn={finishEnemyTurn}
            onEndTurnDraw={completeEndTurnDraw}
            onEndTurnSequenceDone={finishEndTurnSequence}
            karmaMarks={karmaState.karmaMarks}
            block={karmaState.block}
            karmaMode={character.combatPath === "karma"}
            frostSlash={character.combatPath === "sword"}
            yinPullUsed={karmaState.yinPullUsedThisTurn}
            yangPullUsed={karmaState.yangPullUsedThisTurn}
            karmaAutoPlayCard={karmaAutoPlayCard}
            onKarmaAutoPlayResolve={handleKarmaAutoPlayResolve}
            onKarmaAutoPlayFinished={handleKarmaAutoPlayFinished}
            externalFeelToast={combatFeelToast}
            facePreview={cardFacePreview}
          />
        );
    }
  };

  const handleTabChange = useCallback(
    (tab: AppTab) => {
      if (tab === "characters") {
        setActiveTab("lobby");
        setCharacterSelectOpen(true);
        return;
      }
      setCharacterSelectOpen(false);
      setActiveTab(tab);
    },
    []
  );

  const showRunMenu =
    hasActiveRun &&
    activeTab === "combat" &&
    phase !== "defeat" &&
    // 結算／選牌／通關期間禁止退出，避免吞掉通關獎勵
    !(isInCombat && battlePhase !== "IN_BATTLE") &&
    (combatScreen === "path" ||
      combatScreen === "battle" ||
      isInCombat);

  if (!ready) {
    return (
      <div className="mobile-shell flex items-center justify-center">
        <p className="text-sm tracking-[0.4em] text-[#7aab9a]">載入中…</p>
      </div>
    );
  }

  return (
    <MobileFrame
      title="仙途"
      subtitle={
        isInCombat
          ? undefined
          : hasActiveRun && selectedTier
            ? (() => {
                const meta = getDungeonChapterMeta(selectedTier);
                return `${meta.chapterLabel} · ${meta.realmLabel} · 修行中`;
              })()
            : activeTab === "lobby"
              ? "天樞聖宗"
              : TAB_LABELS[activeTab]
      }
      immersive={activeTab === "lobby" && !isInCombat}
      compactHeader={isInCombat}
      bgmScene={isInCombat ? "combat" : "lobby"}
      inGameMenu={
        showRunMenu ? <InGameMenu onQuit={quitRun} /> : null
      }
      bottomNav={
        isInCombat ? null : (
          <BottomNav
            activeTab={characterSelectOpen ? "characters" : activeTab}
            onTabChange={handleTabChange}
            inCombat={hasActiveRun}
            combatLocked={false}
          />
        )
      }
    >
      {renderContent()}

      <CharacterSelectModal
        open={characterSelectOpen}
        characters={PLAYABLE}
        activeId={character.id}
        locked={hasActiveRun || selectedTier !== null}
        lockReason="請先結束或放棄本次修行後再切換角色"
        onConfirm={switchCharacter}
        onClose={() => setCharacterSelectOpen(false)}
      />

      <AspectDiscardModal
        open={Boolean(pendingDiscard)}
        aspectLabel={pendingDiscard?.aspect === "yin" ? "因牌" : "果牌"}
        candidates={
          pendingDiscard
            ? deckState.hand.filter((c) =>
                cardMatchesAspect(c, pendingDiscard.aspect)
              )
            : []
        }
        onChoose={confirmAspectDiscard}
      />

      {isInCombat && battlePhase === "VICTORY_ANIM" && (
        <VictoryAnimOverlay enemyName={defeatedEnemyName} />
      )}

      {isInCombat && battlePhase === "REWARD" && (
        <CardRewardModal
          rewardTemplateIds={rewardTemplateIds}
          onSelect={handleRewardSelect}
          onSkip={handleRewardSkip}
          enemyName={defeatedEnemyName}
          floorReward={pendingFloorReward}
          isTierComplete={pendingTierComplete}
          isEliteReward={pendingEliteReward}
          tierName={selectedTier?.name}
          tierFloor={tierFloor}
          totalFloors={selectedTier?.floors ?? 8}
        />
      )}

      {isInCombat && battlePhase === "STAGE_CLEAR" && stageClearInfo && (
        <StageClearOverlay
          title={stageClearInfo.title}
          subtitle={stageClearInfo.subtitle}
          description={stageClearInfo.description}
          buttonLabel={stageClearInfo.buttonLabel}
          onContinue={handleStageClearContinue}
        />
      )}

      {activeEvent && (
        <EventModal event={activeEvent} onChoose={handleEventChoice} />
      )}

      {activeRestNodeId && (
        <RestModal
          maxHp={heroStats.maxHp}
          currentHp={playerHp}
          onHeal={handleRestHeal}
          onGainSpirit={handleRestSpirit}
        />
      )}

      {activeShopNodeId && (
        <ShopModal
          offerIds={shopOfferIds}
          runSpirit={runSpirit}
          onBuy={handleShopBuy}
          onLeave={handleShopLeave}
        />
      )}

      {phase === "defeat" && (
        <DefeatOverlay
          onRestart={restartAfterDefeat}
          onReturnMenu={returnMenuAfterDefeat}
        />
      )}
    </MobileFrame>
  );
}
