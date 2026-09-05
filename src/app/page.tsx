"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import enemiesData from "@/data/enemies.json";
import startingDeckIds from "@/data/starting-deck.json";
import startingInventoryData from "@/data/starting-inventory.json";
import { MobileFrame } from "@/components/MobileFrame";
import { BottomNav } from "@/components/BottomNav";
import { LobbyView } from "@/components/LobbyView";
import { CombatView } from "@/components/CombatView";
import { TierSelectionView } from "@/components/TierSelectionView";
import { PathChoiceView } from "@/components/PathChoiceView";
import { InventoryView } from "@/components/InventoryView";
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
  equipItem,
  unequipItem,
} from "@/lib/equipment";
import {
  CARD_TEMPLATES,
  COMBAT_HAND_SIZE,
  createBattleDeck,
  discardHand,
  drawCards,
  MAX_ENERGY,
  pickRandomTemplateIds,
  playCardFromHand,
  getCardTemplate,
  type CardTemplateId,
} from "@/lib/battle-deck";
import {
  advanceEnemyIntent,
  applyBurnPassive,
  applyRegenPassive,
  getAllDungeonTiers,
  getCompletionSpiritReward,
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
import type { BattleDeckState } from "@/types/battle";
import type { Card } from "@/types/battle";
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
const INITIAL_DECK_IDS = startingDeckIds as CardTemplateId[];
const INITIAL_INVENTORY = createInitialInventory(startingInventoryData);
const EMPTY_DECK: BattleDeckState = {
  drawPile: [],
  hand: [],
  discardPile: [],
  exhaustPile: [],
};

const TAB_LABELS: Record<AppTab, string> = {
  lobby: "青雲宗 · 山門",
  combat: "天下祕境 · 試煉",
  inventory: "修士行囊",
};

function getInitialPermanentDeck(): CardTemplateId[] {
  return [...INITIAL_DECK_IDS];
}

function initBattleDeck(templateIds: CardTemplateId[]): BattleDeckState {
  return createBattleDeck(templateIds, COMBAT_HAND_SIZE);
}

function createInitialMetaState() {
  const permanentDeck = getInitialPermanentDeck();
  const inventory = createInitialInventory(startingInventoryData);
  const hero = getHero();
  const stats = calculateHeroStats(hero, inventory.equippedIds);
  return { permanentDeck, inventory, playerHp: stats.maxHp };
}

export default function GamePage() {
  const hero = getHero();

  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("lobby");
  const [combatScreen, setCombatScreen] = useState<CombatScreen>("tier-select");
  const [isInCombat, setIsInCombat] = useState(false);
  const [inventory, setInventory] = useState<InventoryState>(INITIAL_INVENTORY);
  const [permanentDeck, setPermanentDeck] = useState<CardTemplateId[]>([]);
  const [selectedTier, setSelectedTier] = useState<DungeonTier | null>(null);
  const [tierFloor, setTierFloor] = useState(1);
  const [totalClears, setTotalClears] = useState(0);
  const [spiritStones, setSpiritStones] = useState(hero.spiritStones);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(
    []
  );
  const [playerHp, setPlayerHp] = useState(hero.maxHp);
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

  const heroStats = useMemo(
    () => calculateHeroStats(hero, inventory.equippedIds),
    [hero, inventory.equippedIds]
  );

  useEffect(() => {
    const initial = createInitialMetaState();
    setPermanentDeck(initial.permanentDeck);
    setInventory(initial.inventory);
    setPlayerHp(initial.playerHp);
    setReady(true);
  }, []);

  useEffect(() => {
    setPlayerHp((hp) => Math.min(hp, heroStats.maxHp));
  }, [heroStats.maxHp]);

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
  }, []);

  const resetPermanentDeck = useCallback(() => {
    setPermanentDeck(getInitialPermanentDeck());
  }, []);

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
      setLastRunMessage(null);
      setMapMessage(null);
      setIsInCombat(true);
      setCombatScreen("battle");
      setActiveTab("combat");
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

  const continueGame = useCallback(() => {
    setActiveTab("combat");
    setLastRunMessage(null);
  }, []);

  const quitRun = useCallback(() => {
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

  const handleEquip = useCallback(
    (equipmentId: string) => {
      setInventory((prev) => equipItem(prev, equipmentId, hero.realm));
    },
    [hero.realm]
  );

  const handleUnequip = useCallback((equipmentId: string) => {
    setInventory((prev) => unequipItem(prev, equipmentId));
  }, []);

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

      const node = getMapNode(mapNodes, mapNodeId);
      setDefeatedEnemyName(enemyName);
      setRewardTemplateIds(pickRandomTemplateIds(3));
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
    []
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
        enemy.currentHp <= 0
      ) {
        return false;
      }
      if (energy < card.cost) return false;

      const template = getCardTemplate(card);
      if (!template) return false;

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

      setCombatBuffs({
        swordIntent: nextPlayer.swordIntent,
        dodge: nextPlayer.dodge,
        nextSwordBonus: nextPlayer.nextSwordBonus,
      });
      setEnergy(Math.min(MAX_ENERGY, energy + energyDelta));

      const newDeck = drawCards(afterPlay, draw);

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
        // 擊殺後保持鎖，避免再出牌；否則下一微任務解鎖
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
      addDamagePopup,
      checkVictory,
      selectedTier,
      currentMapNodeId,
      dungeonMap,
    ]
  );

  const endTurn = useCallback(() => {
    if (
      playLockRef.current ||
      victoryStartedRef.current ||
      phase !== "playing" ||
      battlePhase !== "IN_BATTLE" ||
      enemy.currentHp <= 0
    ) {
      return;
    }

    let newDeck = discardHand(deckState);
    setEnergy(MAX_ENERGY);
    setLastPassiveHeal(null);

    const intent = getEnemyIntent(enemy);
    const hitCount =
      enemy.attackPattern === "triple_slash" && intent.damage > 0 ? 3 : 1;

    let totalDmg = 0;
    let anyDodge = false;

    if (intent.damage > 0 && combatBuffs.dodge > 0) {
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

    setLastDodge(anyDodge);
    setLastEnemyDamage(totalDmg);
    const newPlayerHp = Math.max(0, playerHp - totalDmg);
    setPlayerHp(newPlayerHp);

    if (newPlayerHp <= 0) {
      setDeckState(newDeck);
      setPhase("defeat");
      return;
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
    newDeck = drawCards(newDeck, COMBAT_HAND_SIZE);
    setDeckState(newDeck);
    setLastDamage(null);
  }, [phase, battlePhase, enemy, deckState, playerHp, combatBuffs]);

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
    // 通關封印：清空本局地圖，回山門，不可再鑽回舊圖
    returnToLobby(stageClearMessage, true);
  }, [selectedTier, stageClearMessage, returnToLobby]);

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
        return (
          <div className="flex min-h-0 flex-1 flex-col">
            <LobbyView
              hero={hero}
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
      case "inventory":
        return (
          <InventoryView
            inventory={inventory}
            heroRealm={hero.realm}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
          />
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
            tierFloor={tierFloor}
            totalFloors={MOON_NIGHT_STEPS}
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
          />
        );
    }
  };

  const showRunMenu =
    hasActiveRun &&
    activeTab === "combat" &&
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
        hasActiveRun && selectedTier
          ? `${selectedTier.name} · 修行中`
          : activeTab === "lobby"
            ? "天樞聖宗"
            : TAB_LABELS[activeTab]
      }
      immersive={activeTab === "lobby" && !isInCombat}
      bgmScene={isInCombat ? "combat" : "lobby"}
      inGameMenu={
        showRunMenu ? <InGameMenu onQuit={quitRun} /> : null
      }
      bottomNav={
        isInCombat ? null : (
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            inCombat={hasActiveRun}
            combatLocked={false}
          />
        )
      }
    >
      {renderContent()}

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
