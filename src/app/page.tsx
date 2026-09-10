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
import { TierSelectionView } from "@/components/TierSelectionView";
import { PathChoiceView } from "@/components/PathChoiceView";
import { CharacterSelectModal } from "@/components/CharacterSelectModal";
import { CardRewardModal } from "@/components/CardRewardModal";
import { EventModal } from "@/components/EventModal";
import { InGameMenu } from "@/components/InGameMenu";
import { VictoryAnimOverlay } from "@/components/VictoryAnimOverlay";
import { StageClearOverlay } from "@/components/StageClearOverlay";
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
  applyPlayerDamageThroughBlock,
  resolveKarmaCardPlay,
  finishAspectDiscardAndDraw,
  canPlayAspectDiscardCard,
  aspectDiscardDenyToast,
  type KarmaCombatState,
  type PlayedCardRecord,
} from "@/lib/karma-combat";
import { buildCardFacePreviewFromKarma } from "@/lib/card-face-display";
import { AspectDiscardModal } from "@/components/AspectDiscardModal";
import {
  advanceEnemyIntent,
  applyBurnPassive,
  applyRegenPassive,
  getAllDungeonTiers,
  getCompletionSpiritReward,
  getDungeonChapterMeta,
  getDungeonTier,
  getEnemyForMapNode,
  getEnemyIntent,
  getFloorSpiritReward,
  getMapNodeSpiritReward,
} from "@/lib/dungeon";
import {
  completeMapNode,
  countCompletedNodes,
  countTotalNodes,
  getAvailableNodes,
  getMapNode,
  isBossCleared,
} from "@/lib/map";
import { generateMoonNightMap, MOON_NIGHT_STEPS } from "@/utils/mapGenerator";
import {
  INITIAL_COMBAT_BUFFS,
  resolveCardEffects,
  rollStackDodge,
  type CombatBuffs,
} from "@/lib/battle-resolve";
import { playStartCultivationSfx, playCardDrawSfx, playBattleWinSfx, playGameOverSfx } from "@/lib/combat-audio";
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

type CharacterProgress = {
  permanentDeck: CardTemplateId[];
  playerHp: number;
  spiritStones: number;
  totalClears: number;
};

const TAB_LABELS: Record<AppTab, string> = {
  lobby: "青雲宗 · 山門",
  combat: "天下秘境",
  characters: "選擇角色",
};

function createProgress(character: PlayableCharacter): CharacterProgress {
  return {
    permanentDeck: [...character.startingDeck],
    playerHp: character.maxHp,
    spiritStones: character.spiritStones,
    totalClears: 0,
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

/** 山門狀態下氣血應為滿值（秘境進度不跨重新整理保存） */
function fullHpProgress(
  character: PlayableCharacter,
  snap?: CharacterProgress
): CharacterProgress {
  const base = snap ?? createProgress(character);
  return {
    ...base,
    permanentDeck: sanitizeDeckForCharacter(character, base.permanentDeck),
    playerHp: character.maxHp,
  };
}

function initBattleDeck(templateIds: CardTemplateId[]): BattleDeckState {
  return createBattleDeck(templateIds, COMBAT_HAND_SIZE);
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
  const [totalClears, setTotalClears] = useState(0);
  const [spiritStones, setSpiritStones] = useState(1280);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(
    []
  );
  const [playerHp, setPlayerHp] = useState(60);
  const [lastRunMessage, setLastRunMessage] = useState<string | null>(null);

  const [enemy, setEnemy] = useState<CombatEnemy>(() => ({
    ...ENEMY_LIST[0],
    currentHp: ENEMY_LIST[0].maxHp,
  }));
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
  const [stageClearMessage, setStageClearMessage] = useState<string | null>(
    null
  );
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
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
  const [dungeonMap, setDungeonMap] = useState<MapNode[][]>([]);
  const [currentMapNodeId, setCurrentMapNodeId] = useState<string | null>(null);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<StoryEvent | null>(null);
  const [activeEventNodeId, setActiveEventNodeId] = useState<string | null>(
    null
  );
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
    const activeId = readStoredActiveId();
    const stored = readStoredProgress();
    const activeChar = getCharacter(activeId);
    const nextProgress: Record<string, CharacterProgress> = {};
    for (const c of PLAYABLE) {
      const snap = stored[c.id];
      nextProgress[c.id] =
        c.id === activeId
          ? fullHpProgress(c, snap)
          : {
              ...(snap ?? createProgress(c)),
              permanentDeck: sanitizeDeckForCharacter(
                c,
                snap?.permanentDeck ?? c.startingDeck
              ),
            };
    }
    const progress = nextProgress[activeId] ?? fullHpProgress(activeChar);
    setActiveCharacterId(activeId);
    setProgressByCharacter(nextProgress);
    setPermanentDeck(progress.permanentDeck);
    setPlayerHp(progress.playerHp);
    setSpiritStones(progress.spiritStones);
    setTotalClears(progress.totalClears);
    setInventory(createInitialInventory(startingInventoryData));
    setReady(true);
    try {
      localStorage.setItem(CHAR_PROGRESS_KEY, JSON.stringify(nextProgress));
      localStorage.setItem(ACTIVE_CHAR_KEY, activeId);
    } catch {
      /* ignore */
    }
  }, []);

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
      };
      const nextSnap = fullHpProgress(
        nextChar,
        progressByCharacter[nextId] ?? createProgress(nextChar)
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
        [nextId]: nextSnap,
      };
      setProgressByCharacter(merged);
      setActiveCharacterId(nextId);
      setPermanentDeck(nextSnap.permanentDeck);
      setPlayerHp(nextSnap.playerHp);
      setSpiritStones(nextSnap.spiritStones);
      setTotalClears(nextSnap.totalClears);
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
    setStageClearMessage(null);
    setDamagePopups([]);
    setLastDamage(null);
    setLastEnemyDamage(null);
    setLastDodge(false);
    setLastPassiveHeal(null);
    setTotalDamage(0);
    setRewardTemplateIds([]);
    setDefeatedEnemyName("");
    setPendingFloorReward(0);
    setPendingTierComplete(false);
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
      setActiveTab("lobby");
      setIsInCombat(false);
      setCombatScreen("tier-select");
      setSelectedTier(null);
      setTierFloor(1);
      setDungeonMap([]);
      setCurrentMapNodeId(null);
      setMapMessage(null);
      setActiveEvent(null);
      setActiveEventNodeId(null);
      resetCombatState();
      if (message) setLastRunMessage(message);
      if (healPlayer) setPlayerHp(heroStats.maxHp);
    },
    [heroStats.maxHp, resetCombatState]
  );

  const startBattleForMapNode = useCallback(
    (tier: DungeonTier, node: MapNode) => {
      const scaledEnemy = getEnemyForMapNode(tier, node, ENEMY_LIST);
      setEnemy(scaledEnemy);
      setTierFloor(node.tier + 1);
      setCurrentMapNodeId(node.id);
      setDeckState(initBattleDeck(permanentDeck));
      setEnergy(MAX_ENERGY);
      setPhase("playing");
      setBattlePhase("IN_BATTLE");
      victoryStartedRef.current = false;
      playLockRef.current = false;
      setDamagePopups([]);
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
    [permanentDeck]
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
        mapActionLockRef.current
      ) {
        return;
      }

      // 與「開始修行」同款：踏入岔路瞬間播 horror-hit
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
          mapActionLockRef.current = true;
          const heal = Math.floor(heroStats.maxHp * 0.3);
          setPlayerHp((hp) => Math.min(heroStats.maxHp, hp + heal));
          finishMapNode(node.id, `休整恢復 ${heal} 氣血`);
          queueMicrotask(() => {
            mapActionLockRef.current = false;
          });
          break;
        }
        case "shop": {
          mapActionLockRef.current = true;
          const stones = 80;
          setSpiritStones((s) => s + stones);
          finishMapNode(node.id, `坊市購得靈物，獲得 ${stones} 靈石`);
          queueMicrotask(() => {
            mapActionLockRef.current = false;
          });
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
    [selectedTier, startBattleForMapNode, finishMapNode, heroStats.maxHp, activeEvent]
  );

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
        setSpiritStones((s) => s + spiritDelta);
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
    playGameOverSfx();
    resetPermanentDeck();
    returnToLobby("已退出秘境，本次進度已重置", true);
  }, [returnToLobby, resetPermanentDeck]);

  const dismissRunMessage = useCallback(() => {
    setLastRunMessage(null);
  }, []);

  const abandonGame = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("確定退出本次秘境？當前進度將重置。")
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
    resetCombatState();
    setActiveTab("combat");
  }, [resetCombatState]);

  const startTierRun = useCallback(
    (tierId: string) => {
      const tier = getDungeonTier(tierId);
      if (!tier) return;
      playStartCultivationSfx();
      setSelectedTier(tier);
      setTierFloor(1);
      setDungeonMap(generateMoonNightMap());
      setCurrentMapNodeId(null);
      setMapMessage(null);
      setActiveEvent(null);
      setActiveEventNodeId(null);
      setIsInCombat(false);
      setCombatScreen("path");
      setActiveTab("combat");
      resetPermanentDeck();
      resetCombatState();
    },
    [resetCombatState, resetPermanentDeck]
  );

  const addDamagePopup = useCallback((damage: number) => {
    popupIdRef.current += 1;
    const popup: DamagePopup = {
      id: `popup_${popupIdRef.current}`,
      value: damage,
      isCrit: false,
      isHighDamage: damage >= HIGH_DAMAGE_THRESHOLD,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 20,
    };
    setDamagePopups((prev) => [...prev, popup]);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 350);
    setTimeout(() => {
      setDamagePopups((prev) => prev.filter((p) => p.id !== popup.id));
    }, 1100);
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
      setRewardTemplateIds(
        pickRandomTemplateIds(
          3,
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
            const newHp = Math.max(0, enemy.currentHp - dmg);
            setEnemy((prev) => ({ ...prev, currentHp: newHp }));
            setTotalDamage((prev) => prev + dmg);
            addDamagePopup(dmg);
            setLastDamage(dmg);
            checkVictory(
              newHp,
              enemy.name,
              selectedTier,
              currentMapNodeId,
              dungeonMap
            );
          } else {
            setLastDamage(null);
          }
          if (unlock) {
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
              setEnemy((prev) => {
                const newHp = Math.max(0, prev.currentHp - autoDealt);
                checkVictory(
                  newHp,
                  prev.name,
                  selectedTier,
                  currentMapNodeId,
                  dungeonMap
                );
                return { ...prev, currentHp: newHp };
              });
              setTotalDamage((prev) => prev + autoDealt);
              addDamagePopup(autoDealt);
              setLastDamage(autoDealt);
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
        const newHp = Math.max(0, enemy.currentHp - damage);
        setEnemy((prev) => ({ ...prev, currentHp: newHp }));
        setTotalDamage((prev) => prev + damage);
        addDamagePopup(damage);
        setLastDamage(damage);
        setDeckState(newDeck);
        checkVictory(
          newHp,
          enemy.name,
          selectedTier,
          currentMapNodeId,
          dungeonMap
        );
        queueMicrotask(() => {
          if (!victoryStartedRef.current) {
            playLockRef.current = false;
          }
        });
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
      addDamagePopup,
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
        const newHp = Math.max(0, enemy.currentHp - dealt);
        setEnemy((prev) => ({ ...prev, currentHp: newHp }));
        setTotalDamage((prev) => prev + dealt);
        addDamagePopup(dealt);
        setLastDamage(dealt);
        checkVictory(
          newHp,
          enemy.name,
          selectedTier,
          currentMapNodeId,
          dungeonMap
        );
      }
    },
    [
      pendingDiscard,
      deckState,
      karmaState,
      energy,
      enemy,
      addDamagePopup,
      checkVictory,
      selectedTier,
      currentMapNodeId,
      dungeonMap,
    ]
  );

  const endTurn = useCallback((): boolean => {
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

    const intent = getEnemyIntent(enemy);
    const hitCount =
      enemy.attackPattern === "triple_slash" && intent.damage > 0 ? 3 : 1;

    let totalDmg = 0;
    let anyDodge = false;

    if (
      character.combatPath === "sword" &&
      intent.damage > 0 &&
      combatBuffs.dodge > 0
    ) {
      anyDodge = rollStackDodge(combatBuffs.dodge);
      setCombatBuffs((prev) => ({ ...prev, dodge: 0 }));
    }

    if (!anyDodge) {
      for (let hit = 0; hit < hitCount; hit++) {
        let dmg: number = intent.damage;
        if (dmg > 0 && enemy.passive === "burn") {
          dmg = applyBurnPassive(dmg);
        }
        totalDmg += dmg;
      }
    }

    if (character.combatPath === "karma" && totalDmg > 0) {
      const blocked = applyPlayerDamageThroughBlock(karma, totalDmg);
      karma = blocked.state;
      totalDmg = blocked.hpDamage;
    }

    if (character.combatPath === "karma") {
      karma = convertLunzhuanAfterEnemyAttack(karma);
    }

    setLastDodge(anyDodge);
    setLastEnemyDamage(totalDmg);
    const newPlayerHp = Math.max(0, playerHp - totalDmg);
    setPlayerHp(newPlayerHp);

    // 先只更新棄牌後牌組；抽牌等棄牌動畫結束再進行
    setDeckState(newDeck);
    if (character.combatPath === "karma") {
      setKarmaState(karma);
    }

    if (newPlayerHp <= 0) {
      playGameOverSfx();
      setPhase("defeat");
      playLockRef.current = false;
      return false;
    }

    if (enemy.passive === "regen") {
      setEnemy((prev) => {
        const healed = applyRegenPassive(prev);
        const healAmount = healed.currentHp - prev.currentHp;
        if (healAmount > 0) setLastPassiveHeal(healAmount);
        return healed;
      });
    }

    setEnemy((prev) => advanceEnemyIntent(prev));
    setLastDamage(null);
    return true;
  }, [
    phase,
    battlePhase,
    enemy,
    deckState,
    playerHp,
    combatBuffs,
    character.combatPath,
    karmaState,
    pendingDiscard,
    karmaAutoPlayCard,
  ]);

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

  useEffect(() => {
    if (phase !== "defeat") return;
    const tierLabel = selectedTier?.name ?? "祕境";
    const timer = setTimeout(() => {
      resetPermanentDeck();
      returnToLobby(
        `${tierLabel} 第 ${tierFloor} 重失敗，已返回山門。`,
        true
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase, tierFloor, selectedTier, returnToLobby, resetPermanentDeck]);

  const completeRewardNode = useCallback(
    (cardName: string | null, templateId?: CardTemplateId) => {
      if (!selectedTier || !currentMapNodeId || rewardDoneRef.current) return;
      rewardDoneRef.current = true;

      if (templateId) {
        setPermanentDeck((prev) => [...prev, templateId]);
      }

      setSpiritStones((s) => s + pendingFloorReward);

      const updatedMap = completeMapNode(dungeonMap, currentMapNodeId);
      setDungeonMap(updatedMap);

      const tierComplete =
        pendingTierComplete || isBossCleared(updatedMap);

      if (tierComplete) {
        const completionBonus = getCompletionSpiritReward(selectedTier);
        const cardPart = cardName ? `獲得「${cardName}」、` : "已放棄劍訣獎勵，";
        stageClearDoneRef.current = false;
        setStageClearMessage(
          `通關【${selectedTier.name}】！斬殺魔首，${cardPart}${pendingFloorReward + completionBonus} 靈石，解鎖成就「${selectedTier.achievementName}」。`
        );
        setBattlePhase("STAGE_CLEAR");
        return;
      }

      returnToPath(
        cardName
          ? `擊敗敵人，獲得「${cardName}」。請擇下一途繼續。`
          : "擊敗敵人，已放棄劍訣獎勵。請擇下一途繼續。"
      );
    },
    [
      selectedTier,
      currentMapNodeId,
      dungeonMap,
      pendingFloorReward,
      pendingTierComplete,
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
    if (!selectedTier || !stageClearMessage || stageClearDoneRef.current) {
      return;
    }
    stageClearDoneRef.current = true;

    const completionBonus = getCompletionSpiritReward(selectedTier);
    setSpiritStones((s) => s + completionBonus);
    setTotalClears((c) => c + 1);
    setUnlockedAchievements((prev) => {
      if (prev.includes(selectedTier.achievementId)) return prev;
      return [...prev, selectedTier.achievementId];
    });
    // 通關封印：清空本局地圖與本局牌組成長，回山門
    resetPermanentDeck();
    returnToLobby(stageClearMessage, true);
  }, [selectedTier, stageClearMessage, returnToLobby, resetPermanentDeck]);

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
                  ? `${selectedTier.name}${
                      isInCombat
                        ? " · 戰鬥中"
                        : combatScreen === "path"
                          ? " · 岔路"
                          : ""
                    }`
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
              <TierSelectionView
                tiers={DUNGEON_TIERS}
                unlockedAchievements={unlockedAchievements}
                playerAttack={heroStats.attack}
                onSelectTier={startTierRun}
              />
            </div>
          );
        }
        if (combatScreen === "path" && selectedTier) {
          return (
            <PathChoiceView
              map={dungeonMap}
              choices={getAvailableNodes(dungeonMap)}
              tierName={selectedTier.name}
              playerHp={playerHp}
              maxHp={heroStats.maxHp}
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
            totalFloors={selectedTier?.floors ?? 3}
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
            isShaking={isShaking}
            lastDamage={lastDamage}
            lastEnemyDamage={lastEnemyDamage}
            lastDodge={lastDodge}
            lastPassiveHeal={lastPassiveHeal}
            totalDamage={totalDamage}
            onPlayCard={playCard}
            onEndTurn={endTurn}
            onEndTurnDraw={completeEndTurnDraw}
            onEndTurnSequenceDone={finishEndTurnSequence}
            karmaMarks={karmaState.karmaMarks}
            block={karmaState.block}
            karmaMode={character.combatPath === "karma"}
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
            ? `${selectedTier.name} · 修行中`
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
        lockReason="請先結束或退出本次修行後再切換角色"
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
          tierName={selectedTier?.name}
          tierFloor={tierFloor}
          totalFloors={MOON_NIGHT_STEPS}
        />
      )}

      {isInCombat && battlePhase === "STAGE_CLEAR" && (
        <StageClearOverlay
          tierName={selectedTier?.name}
          onContinue={handleStageClearContinue}
        />
      )}

      {activeEvent && (
        <EventModal event={activeEvent} onChoose={handleEventChoice} />
      )}

      {isInCombat && phase === "defeat" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="glass-panel-danger mx-4 w-full max-w-xs p-6 text-center">
            <p className="zone-label text-[#a85555]/80">真元耗盡</p>
            <h2 className="mt-2 text-xl font-bold tracking-widest text-[#c48888]">
              道途殞落
            </h2>
            <p className="mt-2 text-xs text-stone-500">
              {selectedTier
                ? `【${selectedTier.name}】關卡 ${tierFloor}`
                : "祕境試煉"}
              · 返回山門…
            </p>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
