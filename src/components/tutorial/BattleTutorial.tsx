"use client";

import { useEffect, useRef, useState } from "react";
import { CombatView } from "@/components/CombatView";
import { getHero, calculateHeroStats } from "@/lib/stats";
import { planPlayerHitSteps } from "@/lib/combat-feedback";
import type { EnemyTurnPlan } from "@/lib/combat-feedback";
import type { Card } from "@/types/battle";
import { createTutorialState, playTutorialCard, impactTutorialCard, endTutorialTurn, drawTutorialTurn, PRACTICE_ATTACK, PRACTICE_ENEMY_HP, type TutorialState, type TutorialOutcome } from "@/lib/tutorial";
import styles from "./BattleTutorial.module.css";

const hero = getHero("baiye");
const stats = calculateHeroStats(hero, []);
const COPY = {
  intent: ["① 先看對手意圖", "敵人血條旁的意圖表示下一動。這個練習幻象將攻擊 6 點；先看清，再出牌。"],
  guard: ["② 先守住這一擊", "將發光的「劍罡護體」向上拖出，點按可看詳情。花費 1 真元，獲得 7 劍罡。"],
  attack: ["③ 出劍並積蓄劍意", "打出「拂雪流光」：造成 7 傷害，並獲得 2 劍意。卡牌左上角是費用。"],
  end: ["④ 結束回合", "還剩 1 真元，也可以結束回合。點右下方「結束回合」：敵人行動後，補回真元並抽牌。"],
  charge: ["⑤ 防守成功，準備連招", "7 劍罡擋住了 6 傷害；新回合劍罡清空。打出「凝霜入鞘」，將劍意從 2 提升至 6。"],
  burst: ["⑥ 劍意化為傷害", "剩餘 2 真元足夠打出「一劍霜寒」。6 劍意會讓傷害變成 15＋6×3＝33。"],
  free: ["⑦ 輪到你自己決定", "指引已解除。觀察意圖、安排攻防，擊敗幻象。真元不足時可結束回合。"],
  won: ["試劍完成", "你已學會觀察意圖、出牌、真元、防守與劍意連招。"],
  lost: ["再試一次也沒關係", "練習失敗不影響任何修行進度。先看意圖，留出防守需要的真元。"],
} as const;

interface Props {
  replay: boolean;
  onFinish: (outcome: TutorialOutcome) => void;
  onCancel: () => void;
}

export function BattleTutorial({ replay, onFinish, onCancel }: Props) {
  const [started, setStarted] = useState(false);
  const [session, setSession] = useState(0);
  const [state, setState] = useState(createTutorialState);
  const current = useRef(state);
  const alive = useRef(true);
  const generation = useRef(0);
  const isCurrent = () => alive.current && generation.current === session;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    alive.current = true;
    titleRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", escape);
    return () => { alive.current = false; window.removeEventListener("keydown", escape); };
  }, [onCancel]);
  const update = (next: TutorialState) => {
    if (!alive.current) return;
    current.current = next;
    setState(next);
  };
  const play = (card: Card): boolean => {
    if (!isCurrent()) return false;
    const before = current.current;
    const next = playTutorialCard(before, card.instanceId);
    if (next === before) {
      setNotice(before.busy ? "正在結算，請稍候。" : "請先完成上方提示的動作；自由練習時可自行出牌。");
      return false;
    }
    setNotice("");
    update(next);
    return true;
  };
  const endTurn = (): EnemyTurnPlan | false => {
    if (!isCurrent()) return false;
    const before = current.current;
    const next = endTutorialTurn(before);
    if (next === before) {
      setNotice("請先完成上方的出牌練習，再結束回合。");
      return false;
    }
    setNotice("");
    update(next);
    return { intentType: "attack", label: "試劍", dodged: false, hits: [PRACTICE_ATTACK], defendValue: 0, kind: "attack" };
  };
  const finish = (outcome: TutorialOutcome) => { alive.current = false; onFinish(outcome); };
  const cancel = () => { alive.current = false; onCancel(); };
  const restart = () => { generation.current += 1; update(createTutorialState()); setNotice(""); setSession(generation.current); };
  const done = state.step === "won" || state.step === "lost";

  if (!started || done) return (
    <section className={styles.root} aria-label="白夜新手教學">
      <div className={styles.card}>
        <p className={styles.eyebrow}>白夜 · 試劍指引</p>
        <h2 ref={titleRef} tabIndex={-1}>{!started ? (replay ? "重看新手教學" : "出發前，先試一劍") : COPY[state.step][0]}</h2>
        <p>{!started ? "約 2–3 分鐘，親手學會出牌、防守和劍意連招。使用正式卡牌規則，練習牌序固定。" : COPY[state.step][1]}</p>
        <p>這是獨立練習，不消耗靈石、不發放獎勵，也不改變角色與修行存檔。中途離開後，下次從頭練習。</p>
        {state.step === "won" && <p>正式修行中，生命會跨戰鬥保留；獎勵牌只加入本輪牌組，不合適可以跳過。路線上可選修整恢復生命。</p>}
        {!started ? <>
          <button className={styles.primary} onClick={() => setStarted(true)}>開始教學</button>
          <button className={styles.secondary} onClick={() => finish("skipped")}>{replay ? "返回遊戲" : "我已熟悉，跳過"}</button>
          {!replay && <button className={styles.secondary} onClick={cancel}>返回出發準備</button>}
        </> : state.step === "won" ?
          <button className={styles.primary} onClick={() => finish("completed")}>{replay ? "完成，返回遊戲" : "完成，開始修行"}</button> : <>
          <button className={styles.primary} onClick={restart}>重新練習</button>
          <button className={styles.secondary} onClick={() => finish("skipped")}>{replay ? "返回遊戲" : "跳過教學，開始修行"}</button>
        </>}
      </div>
    </section>
  );

  return (
    <section className={styles.root} data-step={state.step} aria-label="白夜新手教學">
      <div className={styles.toolbar}>
        <span>試劍指引 · 第 {state.turn} 回合</span>
        <button onClick={() => finish("skipped")}>{replay ? "退出教學" : "跳過教學"}</button>
      </div>
      <div className={styles.guide} aria-live="polite" aria-atomic="true">
        <h2>{COPY[state.step][0]}</h2>
        <p>{COPY[state.step][1]}</p>
        {notice && <p className={styles.notice}>{notice}</p>}
        {state.step === "intent" && <button onClick={() => update({ ...current.current, step: "guard" })}>看懂了，練習防守</button>}
      </div>
      <div className={styles.battle}>
        <CombatView key={session}
          hero={hero} heroStats={stats}
          enemy={{ id: "tutorial-phantom", name: "試劍幻象", realm: "練習", maxHp: PRACTICE_ENEMY_HP, currentHp: state.enemyHp, attackDamage: PRACTICE_ATTACK, description: "以妖狼形態練習攻防，不計入正式修行。", monsterSprite: "demon_wolf", pendingIntent: { type: "attack", value: PRACTICE_ATTACK, label: "試劍" } }}
          playerHp={state.hp} energy={state.energy} combatBuffs={state.buffs}
          phase="playing" battlePhase="IN_BATTLE" hand={state.deck.hand}
          drawPileCount={state.deck.drawPile.length} discardPileCount={state.deck.discardPile.length}
          exhaustPileCount={state.deck.exhaustPile.length} deckCount={8}
          damagePopups={[]} isShaking={false} lastDamage={state.lastDamage}
          lastEnemyDamage={null} totalDamage={PRACTICE_ENEMY_HP - state.enemyHp} frostSlash
          onPlayCard={play}
          onCombatImpact={() => { if (isCurrent()) update(impactTutorialCard(current.current)); }}
          onEndTurn={endTurn}
          takeEnemyHitSteps={damage => planPlayerHitSteps(current.current.buffs.swordGuard, damage)}
          applyPlayerImpactStep={hit => {
            const s = current.current;
            if (!isCurrent()) return { defeated: true };
            const hp = hit.kind === "hp" ? Math.max(0, s.hp - hit.amount) : s.hp;
            const buffs = hit.kind !== "hp" ? { ...s.buffs, swordGuard: Math.max(0, s.buffs.swordGuard - hit.amount) } : s.buffs;
            update({ ...s, hp, buffs, step: hp === 0 ? "lost" : s.step });
            return { defeated: hp === 0 };
          }}
          finishEnemyTurn={() => isCurrent() && current.current.hp > 0}
          onEndTurnDraw={() => { if (isCurrent()) update(drawTutorialTurn(current.current)); }}
          onEndTurnSequenceDone={() => { if (isCurrent()) update({ ...current.current, busy: false }); }}
        />
      </div>
    </section>
  );
}
