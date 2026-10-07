"use client";

import { useMemo, useState } from "react";
import {
  EMPTY_FOUR_GIVES,
  EMPTY_SCORES,
  FOUR_GIVE_LABELS,
  type FourGiveKey,
  type ScoreKey,
} from "@/data/level1";
import {
  THREATS,
  TYPE_LABELS,
  calcDamage,
  cloneStarterDeck,
  shuffle,
  type GameCard,
} from "@/data/cards";
import { ScoreBoard } from "@/components/ScoreBoard";
import { FourGiveBoard } from "@/components/FourGiveBoard";

type Phase = "title" | "battle" | "forge" | "victory" | "defeat";

const ENERGY_MAX = 3;
const HAND_SIZE = 5;
const CHAOS_LIMIT = 5;

function drawCards(
  deck: GameCard[],
  discard: GameCard[],
  n: number,
): { hand: GameCard[]; deck: GameCard[]; discard: GameCard[] } {
  let d = [...deck];
  let disc = [...discard];
  const hand: GameCard[] = [];
  for (let i = 0; i < n; i++) {
    if (d.length === 0) {
      d = shuffle(disc);
      disc = [];
    }
    const c = d.shift();
    if (c) hand.push(c);
  }
  return { hand, deck: d, discard: disc };
}

export function Game() {
  const [phase, setPhase] = useState<Phase>("title");
  const [wave, setWave] = useState(0);
  const [deck, setDeck] = useState<GameCard[]>([]);
  const [hand, setHand] = useState<GameCard[]>([]);
  const [discard, setDiscard] = useState<GameCard[]>([]);
  const [energy, setEnergy] = useState(ENERGY_MAX);
  const [threatHp, setThreatHp] = useState(0);
  const [chaos, setChaos] = useState(0);
  const [scores, setScores] = useState({ ...EMPTY_SCORES });
  const [gives, setGives] = useState({ ...EMPTY_FOUR_GIVES });
  const [playedThisWave, setPlayedThisWave] = useState<
    { name: string; type: GameCard["type"] }[]
  >([]);
  const [log, setLog] = useState<string[]>([]);
  const [offer, setOffer] = useState<GameCard | null>(null);
  const [forgeHint, setForgeHint] = useState<string | null>(null);
  const [forging, setForging] = useState(false);

  const threat = THREATS[wave] ?? THREATS[THREATS.length - 1]!;
  const weakHint = useMemo(
    () => threat.weakTo.map((t) => TYPE_LABELS[t]).join("／"),
    [threat],
  );

  function startRun() {
    const starter = shuffle(cloneStarterDeck());
    const drawn = drawCards(starter, [], HAND_SIZE);
    setDeck(drawn.deck);
    setHand(drawn.hand);
    setDiscard(drawn.discard);
    setWave(0);
    setEnergy(ENERGY_MAX);
    setThreatHp(THREATS[0]!.hp);
    setChaos(0);
    setScores({ ...EMPTY_SCORES });
    setGives({ ...EMPTY_FOUR_GIVES });
    setPlayedThisWave([]);
    setLog(["新的一局：用卡牌澄清誤會，邊打邊築牌。"]);
    setOffer(null);
    setForgeHint(null);
    setPhase("battle");
  }

  function pushLog(line: string) {
    setLog((L) => [line, ...L].slice(0, 8));
  }

  function playCard(card: GameCard) {
    if (phase !== "battle" || energy < card.cost) return;

    const { damage, weak } = calcDamage(card, threat);
    const nextHp = Math.max(0, threatHp - damage);
    const nextPlayed = [
      ...playedThisWave,
      { name: card.name, type: card.type },
    ];
    const nextGives = card.fourGive
      ? { ...gives, [card.fourGive]: true }
      : gives;

    setEnergy((e) => e - card.cost);
    setHand((h) => h.filter((c) => c.id !== card.id));
    setDiscard((d) => [...d, card]);
    setThreatHp(nextHp);
    setPlayedThisWave(nextPlayed);

    if (card.type !== "give") {
      setScores((s) => ({
        ...s,
        [card.type as ScoreKey]: s[card.type as ScoreKey] + 1,
      }));
    }
    if (card.fourGive) {
      setGives(nextGives);
    }

    pushLog(
      `打出「${card.name}」澄清 ${damage}${weak ? "（剋屬＋1）" : ""}`,
    );

    if (nextHp <= 0) {
      void beginForge(nextPlayed, nextGives);
    }
  }

  function endTurn() {
    if (phase !== "battle") return;
    const nextChaos = chaos + 1;
    setChaos(nextChaos);
    pushLog(`回合結束：威脅蔓延，混亂 +1（${nextChaos}/${CHAOS_LIMIT}）`);

    if (nextChaos >= CHAOS_LIMIT) {
      setPhase("defeat");
      return;
    }

    const drawn = drawCards(deck, [...discard, ...hand], HAND_SIZE);
    setHand(drawn.hand);
    setDeck(drawn.deck);
    setDiscard(drawn.discard);
    setEnergy(ENERGY_MAX);
  }

  async function beginForge(
    played = playedThisWave,
    giveState = gives,
  ) {
    setPhase("forge");
    setForging(true);
    setOffer(null);
    setForgeHint(null);
    pushLog(`清除「${threat.name}」！煉卡爐啟動…`);

    try {
      const res = await fetch("/api/forge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threat,
          played,
          wave: wave + 1,
          unlockedGives: (Object.keys(giveState) as FourGiveKey[]).filter(
            (k) => giveState[k],
          ),
        }),
      });
      const data = await res.json();
      setOffer(data.card as GameCard);
      if (data.degraded && data.reason) setForgeHint(String(data.reason));
    } catch {
      setForgeHint("煉卡連線失敗，給你一張應急卡");
      setOffer({
        id: `emergency-${Date.now()}`,
        name: "應急好話",
        cost: 1,
        type: "speak",
        power: 2,
        text: "連線失敗時的備援牌。",
        forged: true,
      });
    } finally {
      setForging(false);
    }
  }

  function takeCard(yes: boolean) {
    if (!offer) return;
    let nextDeck = [...deck, ...hand, ...discard];
    if (yes) {
      nextDeck = [...nextDeck, { ...offer, id: `${offer.id}-owned` }];
      pushLog(`築牌：將「${offer.name}」加入牌庫`);
    } else {
      pushLog(`你略過了「${offer.name}」`);
    }

    const nextWave = wave + 1;
    if (nextWave >= THREATS.length) {
      setDeck(nextDeck);
      setHand([]);
      setDiscard([]);
      setPhase("victory");
      return;
    }

    const reshuffled = shuffle(nextDeck);
    const drawn = drawCards(reshuffled, [], HAND_SIZE);
    setDeck(drawn.deck);
    setHand(drawn.hand);
    setDiscard(drawn.discard);
    setWave(nextWave);
    setThreatHp(THREATS[nextWave]!.hp);
    setEnergy(ENERGY_MAX);
    setPlayedThisWave([]);
    setOffer(null);
    setPhase("battle");
    pushLog(`下一波：${THREATS[nextWave]!.name}`);
  }

  const giveCount = (Object.keys(gives) as FourGiveKey[]).filter(
    (k) => gives[k],
  ).length;

  return (
    <div className="game-shell">
      <div className="atmosphere" aria-hidden />

      <header className="top-bar">
        <div className="brand-mark">
          <span className="brand-kanji">三好</span>
          <span className="brand-name">關卡</span>
        </div>
        {phase !== "title" && <ScoreBoard scores={scores} gives={gives} />}
      </header>

      <main className="stage">
        {phase === "title" && (
          <section className="title-card enter">
            <p className="eyebrow">築牌 Roguelike · AI 煉卡</p>
            <h1>三好關卡</h1>
            <p className="lead">
              用卡牌澄清誤會。打完一波，AI
              煉師依你的出牌鍛造新卡——選進牌庫，越打牌組越長。
            </p>
            <ul className="feature-list">
              <li>
                <strong>戰鬥</strong>：花費專注打出做好事／說好話／存好心／四給
              </li>
              <li>
                <strong>築牌</strong>：每清一波威脅，決定要不要納入新卡
              </li>
              <li>
                <strong>AI</strong>：煉卡師（不是聊天室）
              </li>
            </ul>
            <FourGiveBoard gives={EMPTY_FOUR_GIVES} />
            <div className="cta-row" style={{ marginTop: "1.25rem" }}>
              <button
                type="button"
                className="primary-btn large"
                onClick={startRun}
              >
                開始築牌
              </button>
            </div>
            <p className="fine-print">
              {THREATS.length} 波威脅 · 混亂達 {CHAOS_LIMIT} 失敗 · MIT 開源
            </p>
          </section>
        )}

        {(phase === "battle" || phase === "forge") && (
          <section className="play-card enter wide card-table">
            <div className="battle-top">
              <div>
                <p className="level-tag">
                  第 {wave + 1}/{THREATS.length} 波 · {threat.name}
                </p>
                <p className="narrator">{threat.flavor}</p>
                <p className="weak-line">弱點傾向：{weakHint}</p>
              </div>
              <div className="meters">
                <div className="meter">
                  <span>威脅</span>
                  <strong>
                    {Math.max(0, threatHp)}/{threat.hp}
                  </strong>
                  <div className="meter-bar">
                    <i
                      style={{
                        width: `${Math.max(0, (threatHp / threat.hp) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="meter chaos">
                  <span>混亂</span>
                  <strong>
                    {chaos}/{CHAOS_LIMIT}
                  </strong>
                </div>
                <div className="meter">
                  <span>專注</span>
                  <strong>
                    {energy}/{ENERGY_MAX}
                  </strong>
                </div>
              </div>
            </div>

            <p className="deck-meta">
              牌庫 {deck.length} · 手牌 {hand.length} · 棄牌 {discard.length} ·
              四給 {giveCount}/4
            </p>

            {phase === "battle" && (
              <>
                <div className="hand-row">
                  {hand.map((card) => {
                    const afford = energy >= card.cost;
                    const { damage, weak } = calcDamage(card, threat);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        className={`card-tile type-${card.type} ${afford ? "" : "disabled"}`}
                        disabled={!afford}
                        onClick={() => playCard(card)}
                      >
                        <div className="card-cost">{card.cost}</div>
                        <div className="card-name">{card.name}</div>
                        <div className="card-type">
                          {TYPE_LABELS[card.type]}
                        </div>
                        <div className="card-text">{card.text}</div>
                        <div className="card-power">
                          澄清 {damage}
                          {weak ? " ★" : ""}
                        </div>
                        {card.forged && (
                          <span className="forge-tag">鍛造</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="cta-row">
                  <button type="button" className="ghost-btn" onClick={endTurn}>
                    結束回合
                  </button>
                </div>
              </>
            )}

            {phase === "forge" && (
              <div className="forge-panel">
                <p className="counsel-label">AI 煉卡師</p>
                {forging && <p className="narrator">爐火正旺，卡片成形中…</p>}
                {!forging && offer && (
                  <>
                    <div className={`card-tile large type-${offer.type}`}>
                      <div className="card-cost">{offer.cost}</div>
                      <div className="card-name">{offer.name}</div>
                      <div className="card-type">
                        {TYPE_LABELS[offer.type]}
                      </div>
                      <div className="card-text">{offer.text}</div>
                      <div className="card-power">澄清 {offer.power}</div>
                      {offer.fourGive && (
                        <div className="card-give">
                          {FOUR_GIVE_LABELS[offer.fourGive]}
                        </div>
                      )}
                      <span className="forge-tag">新卡</span>
                    </div>
                    {forgeHint && <p className="mentor-hint">{forgeHint}</p>}
                    <div className="cta-row">
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => takeCard(true)}
                      >
                        加入牌庫
                      </button>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => takeCard(false)}
                      >
                        略過
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <ul className="battle-log">
              {log.map((line, i) => (
                <li key={`${line}-${i}`}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {phase === "victory" && (
          <section className="play-card enter ending">
            <p className="level-tag">通關</p>
            <h2>牌庫長成你的樣子</h2>
            <p className="narrator">
              你清完所有威脅。最終牌庫 {deck.length}{" "}
              張——每一張鍛造卡都是這局的足跡。
            </p>
            <ScoreBoard scores={scores} gives={gives} />
            <div style={{ marginTop: "1rem" }}>
              <FourGiveBoard gives={gives} />
            </div>
            <div className="cta-row">
              <button type="button" className="primary-btn" onClick={startRun}>
                再築一局
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setPhase("title")}
              >
                回標題
              </button>
            </div>
          </section>
        )}

        {phase === "defeat" && (
          <section className="play-card enter ending">
            <p className="level-tag">失敗</p>
            <h2>混亂爆炸了</h2>
            <p className="narrator">
              威脅蔓延太久。下次試著對弱點出牌，或更積極結束威脅再煉卡。
            </p>
            <div className="cta-row">
              <button type="button" className="primary-btn" onClick={startRun}>
                重來
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
