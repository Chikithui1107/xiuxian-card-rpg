"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cardsData from "@/data/cards.json";
import enemiesData from "@/data/enemies.json";
import startingDeckIds from "@/data/starting-deck.json";
import startingInventoryData from "@/data/starting-inventory.json";
import { MobileFrame } from "@/components/MobileFrame";
import { BottomNav } from "@/components/BottomNav";
import { LobbyView } from "@/components/LobbyView";
import { CombatView } from "@/components/CombatView";
import { TierSelectionView } from "@/components/TierSelectionView";
import { InventoryView } from "@/components/InventoryView";
import { CardRewardModal } from "@/components/CardRewardModal";
import {
  calculateCardDamage,
  calculateHeroStats,
  getHero,
} from "@/lib/stats";
import {
  createInitialInventory,
  equipItem,
  unequipItem,
} from "@/lib/equipment";
import {
  createDeckState,
  discardAllHand,
  drawCards,
  drawToHandSize,
  expandDeckTemplates,
  HAND_SIZE,
  MAX_ENERGY,
  pickRandomCards,
  playCardFromHand,
  resetInstanceCounter,
  type DeckState,
} from "@/lib/deck";
import {
  applyBurnPassive,
  applyRegenPassive,
  getAllDungeonTiers,
  getCompletionSpiritReward,
  getDungeonTier,
  getEnemyForTierFloor,
  getFloorSpiritReward,
} from "@/lib/dungeon";
import type {
  AppTab,
  Card,
  CombatEnemy,
  CombatPhase,
  CombatScreen,
  DamagePopup,
  DungeonTier,
  Enemy,
  InventoryState,
} from "@/types/game";
import { HIGH_DAMAGE_THRESHOLD } from "@/types/game";

const CARD_POOL = cardsData as Card[];
const ENEMY_LIST = enemiesData as Enemy[];
const DUNGEON_TIERS = getAllDungeonTiers();
const INITIAL_DECK_IDS = startingDeckIds as string[];
const INITIAL_INVENTORY = createInitialInventory(startingInventoryData);
const EMPTY_DECK: DeckState = { drawPile: [], hand: [], discardPile: [] };

const TAB_LABELS: Record<AppTab, string> = {
  lobby: "青雲宗 · 山門",
  combat: "天下祕境 · 試煉",
  inventory: "修士行囊",
};

function initBattleDeck(permanentDeck: Card[]): DeckState {
  resetInstanceCounter();
  return drawCards(createDeckState(permanentDeck), HAND_SIZE);
}

function createInitialMetaState() {
  const permanentDeck = expandDeckTemplates(INITIAL_DECK_IDS, CARD_POOL);
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
  const [permanentDeck, setPermanentDeck] = useState<Card[]>([]);
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
  const [deckState, setDeckState] = useState<DeckState>(EMPTY_DECK);
  const popupIdRef = useRef(0);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [phase, setPhase] = useState<CombatPhase>("playing");
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [lastDamage, setLastDamage] = useState<ReturnType<
    typeof calculateCardDamage
  > | null>(null);
  const [lastEnemyDamage, setLastEnemyDamage] = useState<number | null>(null);
  const [lastPassiveHeal, setLastPassiveHeal] = useState<number | null>(null);
  const [totalDamage, setTotalDamage] = useState(0);
  const [rewardCards, setRewardCards] = useState<Card[]>([]);
  const [defeatedEnemyName, setDefeatedEnemyName] = useState("");
  const [pendingFloorReward, setPendingFloorReward] = useState(0);
  const [pendingTierComplete, setPendingTierComplete] = useState(false);

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

  const resetCombatState = useCallback(() => {
    setPhase("playing");
    setDamagePopups([]);
    setLastDamage(null);
    setLastEnemyDamage(null);
    setLastPassiveHeal(null);
    setTotalDamage(0);
    setRewardCards([]);
    setDefeatedEnemyName("");
    setPendingFloorReward(0);
    setPendingTierComplete(false);
    setDeckState(EMPTY_DECK);
  }, []);

  const returnToLobby = useCallback(
    (message: string | null = null, healPlayer = false) => {
      setActiveTab("lobby");
      setIsInCombat(false);
      setCombatScreen("tier-select");
      setSelectedTier(null);
      setTierFloor(1);
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
      resetCombatState();
      if (message) setLastRunMessage(message);
      if (healPlayer) setPlayerHp(heroStats.maxHp);
    },
    [heroStats.maxHp, resetCombatState]
  );

  const startBattleForFloor = useCallback(
    (tier: DungeonTier, floorInTier: number) => {
      const scaledEnemy = getEnemyForTierFloor(tier, floorInTier, ENEMY_LIST);
      setEnemy(scaledEnemy);
      setDeckState(initBattleDeck(permanentDeck));
      setEnergy(MAX_ENERGY);
      setPhase("playing");
      setDamagePopups([]);
      setLastDamage(null);
      setLastEnemyDamage(null);
      setLastPassiveHeal(null);
      setTotalDamage(0);
      setLastRunMessage(null);
      setIsInCombat(true);
      setCombatScreen("battle");
      setActiveTab("combat");
    },
    [permanentDeck]
  );

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
      startBattleForFloor(tier, 1);
    },
    [startBattleForFloor]
  );

  const handleEquip = useCallback((equipmentId: string) => {
    setInventory((prev) => equipItem(prev, equipmentId));
  }, []);

  const handleUnequip = useCallback((equipmentId: string) => {
    setInventory((prev) => unequipItem(prev, equipmentId));
  }, []);

  const addDamagePopup = useCallback(
    (result: ReturnType<typeof calculateCardDamage>) => {
      popupIdRef.current += 1;
      const popup: DamagePopup = {
        id: `popup_${popupIdRef.current}`,
        value: result.damage,
        isCrit: result.isCrit,
        isHighDamage: result.damage >= HIGH_DAMAGE_THRESHOLD,
        x: 30 + Math.random() * 40,
        y: 20 + Math.random() * 20,
      };
      setDamagePopups((prev) => [...prev, popup]);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 350);
      setTimeout(() => {
        setDamagePopups((prev) => prev.filter((p) => p.id !== popup.id));
      }, 1100);
    },
    []
  );

  const checkVictory = useCallback(
    (newHp: number, enemyName: string, tier: DungeonTier | null, floorInTier: number) => {
      if (newHp <= 0 && tier) {
        setPhase("victory");
        setDefeatedEnemyName(enemyName);
        setRewardCards(pickRandomCards(CARD_POOL, 3));
        const floorReward = getFloorSpiritReward(tier);
        setPendingFloorReward(floorReward);
        setPendingTierComplete(floorInTier >= tier.floors);
      }
    },
    []
  );

  const playCard = useCallback(
    (instance: { instanceId: string; card: Card }) => {
      if (phase !== "playing" || enemy.currentHp <= 0) return;
      if (energy < instance.card.energyCost) return;

      const { state: afterPlay, played } = playCardFromHand(
        deckState,
        instance.instanceId
      );
      if (!played) return;

      const result = calculateCardDamage(heroStats, played.card);
      setLastDamage(result);
      setEnergy((e) => e - played.card.energyCost);

      const newHp = Math.max(0, enemy.currentHp - result.damage);
      setEnemy((prev) => ({ ...prev, currentHp: newHp }));
      setTotalDamage((prev) => prev + result.damage);
      addDamagePopup(result);

      setDeckState(drawToHandSize(afterPlay, HAND_SIZE));
      checkVictory(newHp, enemy.name, selectedTier, tierFloor);
    },
    [
      phase,
      enemy,
      energy,
      deckState,
      heroStats,
      addDamagePopup,
      checkVictory,
      selectedTier,
      tierFloor,
    ]
  );

  const endTurn = useCallback(() => {
    if (phase !== "playing" || enemy.currentHp <= 0) return;

    let newDeck = discardAllHand(deckState);
    setEnergy(MAX_ENERGY);
    setLastPassiveHeal(null);

    let dmg = enemy.attackDamage;
    if (enemy.passive === "burn") {
      dmg = applyBurnPassive(dmg);
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

    newDeck = drawCards(newDeck, HAND_SIZE);
    setDeckState(newDeck);
    setLastDamage(null);
  }, [phase, enemy, deckState, playerHp]);

  useEffect(() => {
    if (phase !== "defeat") return;
    const tierLabel = selectedTier?.name ?? "祕境";
    const timer = setTimeout(() => {
      returnToTierSelect(
        `${tierLabel} 第 ${tierFloor} 重失敗，已返回試煉選擇。`,
        true
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase, tierFloor, selectedTier, returnToTierSelect]);

  const handleRewardSelect = useCallback(
    (card: Card) => {
      if (!selectedTier) return;

      setPermanentDeck((prev) => [...prev, card]);
      setSpiritStones((s) => s + pendingFloorReward);

      const isLastFloor = tierFloor >= selectedTier.floors;

      if (!isLastFloor) {
        const nextFloor = tierFloor + 1;
        setTierFloor(nextFloor);
        startBattleForFloor(selectedTier, nextFloor);
        return;
      }

      const completionBonus = getCompletionSpiritReward(selectedTier);
      setSpiritStones((s) => s + completionBonus);
      setTotalClears((c) => c + 1);

      setUnlockedAchievements((prev) => {
        if (prev.includes(selectedTier.achievementId)) return prev;
        return [...prev, selectedTier.achievementId];
      });

      returnToTierSelect(
        `通關【${selectedTier.name}】！獲得「${card.name}」、${pendingFloorReward + completionBonus} 靈石，解鎖成就「${selectedTier.achievementName}」。`
      );
    },
    [
      selectedTier,
      tierFloor,
      pendingFloorReward,
      startBattleForFloor,
      returnToTierSelect,
    ]
  );

  const deckInfo = useMemo(
    () => ({
      draw: deckState.drawPile.length,
      discard: deckState.discardPile.length,
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
            onEnterDungeon={enterTierSelect}
          />
        );
      case "inventory":
        return (
          <InventoryView
            inventory={inventory}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
          />
        );
      case "combat":
        if (!isInCombat || combatScreen === "tier-select") {
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
        return (
          <CombatView
            hero={hero}
            heroStats={heroStats}
            enemy={enemy}
            tierName={selectedTier?.name}
            tierFloor={tierFloor}
            totalFloors={selectedTier?.floors}
            playerHp={playerHp}
            energy={energy}
            phase={phase}
            hand={deckState.hand}
            drawPileCount={deckInfo.draw}
            discardPileCount={deckInfo.discard}
            deckCount={permanentDeck.length}
            damagePopups={damagePopups}
            isShaking={isShaking}
            lastDamage={lastDamage}
            lastEnemyDamage={lastEnemyDamage}
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
      bottomNav={
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          inCombat={isInCombat && phase === "playing"}
        />
      }
    >
      {renderContent()}

      {isInCombat && phase === "victory" && (
        <CardRewardModal
          rewardCards={rewardCards}
          onSelect={handleRewardSelect}
          enemyName={defeatedEnemyName}
          floorReward={pendingFloorReward}
          isTierComplete={pendingTierComplete}
          tierName={selectedTier?.name}
          tierFloor={tierFloor}
          totalFloors={selectedTier?.floors}
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
                ? `【${selectedTier.name}】第 ${tierFloor} 重`
                : "祕境試煉"}
              · 返回試煉選擇…
            </p>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
