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
import { MapView } from "@/components/MapView";
import { InventoryView } from "@/components/InventoryView";
import { CardRewardModal } from "@/components/CardRewardModal";
import { InGameMenu } from "@/components/InGameMenu";
import { VictoryAnimOverlay } from "@/components/VictoryAnimOverlay";
import { StageClearOverlay } from "@/components/StageClearOverlay";
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
  getMapNode,
  isBossCleared,
} from "@/lib/map";
import { generateMoonNightMap } from "@/utils/mapGenerator";
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
      resetCombatState();
      if (message) setLastRunMessage(message);
      if (healPlayer) setPlayerHp(heroStats.maxHp);
    },
    [heroStats.maxHp, resetCombatState]
  );

  const returnToTierSelect = useCallback(
    (message: string | null = null, healPlayer = false) => {
      setActiveTab("combat");
      setIsInCombat(false);
      setCombatScreen("tier-select");
      setSelectedTier(null);
      setTierFloor(1);
      setDungeonMap([]);
      setCurrentMapNodeId(null);
      setMapMessage(null);
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

  const returnToMap = useCallback(
    (message: string | null = null) => {
      setIsInCombat(false);
      setCombatScreen("map");
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
      returnToMap(message);
    },
    [returnToMap]
  );

  const handleMapNodeSelect = useCallback(
    (node: MapNode) => {
      if (!selectedTier || node.status !== "available") return;

      switch (node.type) {
        case "combat":
        case "elite":
        case "boss":
          startBattleForMapNode(selectedTier, node);
          break;
        case "rest": {
          const heal = Math.floor(heroStats.maxHp * 0.3);
          setPlayerHp((hp) => Math.min(heroStats.maxHp, hp + heal));
          finishMapNode(node.id, `休整恢復 ${heal} 氣血`);
          break;
        }
        case "shop": {
          const stones = 80;
          setSpiritStones((s) => s + stones);
          finishMapNode(node.id, `坊市購得靈物，獲得 ${stones} 靈石`);
          break;
        }
        case "event": {
          if (Math.random() < 0.5) {
            const heal = Math.floor(heroStats.maxHp * 0.15);
            setPlayerHp((hp) => Math.min(heroStats.maxHp, hp + heal));
            finishMapNode(node.id, `機緣巧合，恢復 ${heal} 氣血`);
          } else {
            const stones = 50;
            setSpiritStones((s) => s + stones);
            finishMapNode(node.id, `路遇散修饋贈 ${stones} 靈石`);
          }
          break;
        }
      }
    },
    [selectedTier, startBattleForMapNode, finishMapNode, heroStats.maxHp]
  );

  const hasActiveRun = selectedTier !== null && dungeonMap.length > 0;

  const continueGame = useCallback(() => {
    setActiveTab("combat");
    setLastRunMessage(null);
  }, []);

  const quitRun = useCallback(() => {
    resetPermanentDeck();
    returnToLobby("已放棄本次修行。", true);
  }, [returnToLobby, resetPermanentDeck]);

  const abandonGame = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("確定放棄本次修行？進度將無法恢復。")
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
      setIsInCombat(false);
      setCombatScreen("map");
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
    (card: Card) => {
      if (phase !== "playing" || battlePhase !== "IN_BATTLE" || enemy.currentHp <= 0)
        return;
      if (energy < card.cost) return;

      const template = getCardTemplate(card);
      if (!template) return;

      const { deck: afterPlay, played } = playCardFromHand(
        deckState,
        card.instanceId
      );
      if (!played) return;

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
        return;
      }

      setLastDamage(null);
      setDeckState(newDeck);
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
    if (phase !== "playing" || battlePhase !== "IN_BATTLE" || enemy.currentHp <= 0)
      return;

    let newDeck = discardHand(deckState);
    setEnergy(MAX_ENERGY);
    setLastPassiveHeal(null);
    setLastDodge(false);

    const intent = getEnemyIntent(enemy);
    let dmg: number = intent.damage;
    if (dmg > 0 && enemy.passive === "burn") {
      dmg = applyBurnPassive(dmg);
    }

    if (dmg > 0 && combatBuffs.dodge > 0) {
      const dodged = rollStackDodge(combatBuffs.dodge);
      setCombatBuffs((prev) => ({ ...prev, dodge: 0 }));
      if (dodged) dmg = 0;
      setLastDodge(dodged);
    }

    setLastEnemyDamage(dmg);
    const newPlayerHp = Math.max(0, playerHp - dmg);
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
      returnToTierSelect(
        `${tierLabel} 第 ${tierFloor} 重失敗，已返回試煉選擇。`,
        true
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase, tierFloor, selectedTier, returnToTierSelect, resetPermanentDeck]);

  const completeRewardNode = useCallback(
    (cardName: string | null) => {
      if (!selectedTier || !currentMapNodeId) return;

      setSpiritStones((s) => s + pendingFloorReward);

      const updatedMap = completeMapNode(dungeonMap, currentMapNodeId);
      setDungeonMap(updatedMap);

      const tierComplete =
        pendingTierComplete || isBossCleared(updatedMap);

      if (tierComplete) {
        const completionBonus = getCompletionSpiritReward(selectedTier);
        const cardPart = cardName ? `獲得「${cardName}」、` : "已放棄劍訣獎勵，";
        setStageClearMessage(
          `通關【${selectedTier.name}】！斬殺魔首，${cardPart}${pendingFloorReward + completionBonus} 靈石，解鎖成就「${selectedTier.achievementName}」。`
        );
        setBattlePhase("STAGE_CLEAR");
        return;
      }

      returnToMap(
        cardName
          ? `擊敗敵人，獲得「${cardName}」。選擇下一節點繼續。`
          : "擊敗敵人，已放棄劍訣獎勵。選擇下一節點繼續。"
      );
    },
    [
      selectedTier,
      currentMapNodeId,
      dungeonMap,
      pendingFloorReward,
      pendingTierComplete,
      returnToMap,
    ]
  );

  const handleRewardSelect = useCallback(
    (templateId: CardTemplateId) => {
      setPermanentDeck((prev) => [...prev, templateId]);
      completeRewardNode(CARD_TEMPLATES[templateId].name);
    },
    [completeRewardNode]
  );

  const handleRewardSkip = useCallback(() => {
    completeRewardNode(null);
  }, [completeRewardNode]);

  const handleStageClearContinue = useCallback(() => {
    if (!selectedTier || !stageClearMessage) return;

    const completionBonus = getCompletionSpiritReward(selectedTier);
    setSpiritStones((s) => s + completionBonus);
    setTotalClears((c) => c + 1);
    setUnlockedAchievements((prev) => {
      if (prev.includes(selectedTier.achievementId)) return prev;
      return [...prev, selectedTier.achievementId];
    });
    returnToTierSelect(stageClearMessage);
  }, [selectedTier, stageClearMessage, returnToTierSelect]);

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
                ? `${selectedTier.name}${isInCombat ? " · 戰鬥中" : " · 地圖"}`
                : null
            }
            onEnterDungeon={enterTierSelect}
            onContinueGame={continueGame}
            onAbandonGame={abandonGame}
          />
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
            <div className="flex flex-col gap-3">
              {lastRunMessage && (
                <div className="mx-3 mt-3 glass-panel-gold px-3 py-2.5 text-center text-xs text-[#c9a84c]">
                  {lastRunMessage}
                </div>
              )}
              <TierSelectionView
                tiers={DUNGEON_TIERS}
                unlockedAchievements={unlockedAchievements}
                playerAttack={heroStats.attack}
                onSelectTier={startTierRun}
                onBack={() => returnToLobby(null, false)}
              />
            </div>
          );
        }
        if (combatScreen === "map" && selectedTier) {
          return (
              <MapView
                map={dungeonMap}
                tierName={selectedTier.name}
                playerHp={playerHp}
                maxHp={heroStats.maxHp}
                currentNodeId={currentMapNodeId}
                mapMessage={mapMessage}
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
            totalFloors={10}
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

  if (!ready) {
    return (
      <div className="mobile-shell flex items-center justify-center">
        <p className="text-sm tracking-[0.4em] text-[#7aab9a]">載入中…</p>
      </div>
    );
  }

  return (
    <MobileFrame
      title="修仙卡牌錄"
      subtitle={TAB_LABELS[activeTab]}
      inGameMenu={
        activeTab === "combat" &&
        ((combatScreen === "map" && selectedTier !== null) ||
          (isInCombat &&
            phase === "playing" &&
            battlePhase === "IN_BATTLE")) ? (
          <InGameMenu onQuit={quitRun} />
        ) : null
      }
      bottomNav={
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          inCombat={
            (isInCombat &&
              phase === "playing" &&
              battlePhase === "IN_BATTLE") ||
            (selectedTier !== null && combatScreen === "map")
          }
          combatLocked={
            isInCombat &&
            (phase === "defeat" || battlePhase !== "IN_BATTLE")
          }
        />
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
          totalFloors={10}
        />
      )}

      {isInCombat && battlePhase === "STAGE_CLEAR" && (
        <StageClearOverlay
          tierName={selectedTier?.name}
          onContinue={handleStageClearContinue}
        />
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
              · 返回試煉選擇…
            </p>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
