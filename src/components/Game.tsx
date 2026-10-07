"use client";

import { useEffect, useMemo, useState } from "react";
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

type Floater = { id: string; text: string; kind: "hit" | "weak" | "chaos" };

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
  const [offer, setOffer] = useState<GameCard | null>(null);
  const [forgeHint, setForgeHint] = useState<string | null>(null);
  const [forging, setForging] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [shake, setShake] = useState(false);
  const [pulseClear, setPulseClear] = useState(false);

  const threat = THREATS[wave] ?? THREATS[THREATS.length - 1]!;
  const weakHint = useMemo(
    () => threat.weakTo.map((t) => TYPE_LABELS[t]).join(" "),
    [threat],
  );

  useEffect(() => {
    if (floaters.length === 0) return;
    const t = window.setTimeout(() => {
      setFloaters((f) => f.slice(1));
    }, 700);
    return () => window.clearTimeout(t);
  }, [floaters]);

  function spawnFloater(text: string, kind: Floater["kind"]) {
    setFloaters((f) => [
      ...f,
      { id: `${Date.now()}-${Math.random()}`, text, kind },
    ]);
  }

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
    setOffer(null);
    setForgeHint(null);
    setFloaters([]);
    setPhase("battle");
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
    setShake(true);
    window.setTimeout(() => setShake(false), 280);
    spawnFloater(`-${damage}`, weak ? "weak" : "hit");

    if (card.type !== "give") {
      setScores((s) => ({
        ...s,
        [card.type as ScoreKey]: s[card.type as ScoreKey] + 1,
      }));
    }
    if (card.fourGive) setGives(nextGives);

    if (nextHp <= 0) {
      setPulseClear(true);
      window.setTimeout(() => setPulseClear(false), 500);
      void beginForge(nextPlayed, nextGives);
    }
  }

  function endTurn() {
    if (phase !== "battle") return;
    const nextChaos = chaos + 1;
    setChaos(nextChaos);
    spawnFloater("混亂+1", "chaos");

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
      setForgeHint("備援煉卡");
      setOffer({
        id: `emergency-${Date.now()}`,
        name: "應急好話",
        cost: 1,
        type: "speak",
        power: 2,
        text: "澄清 2",
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
  }

  return (
    <div className={`game-shell arena-mode ${phase}`}>
      <div className="atmosphere" aria-hidden />

      <header className="top-bar arena-bar">
        <div className="brand-mark">
          <span className="brand-kanji">三好</span>
          <span className="brand-name">關卡</span>
        </div>
        {phase !== "title" && phase !== "battle" && (
          <ScoreBoard scores={scores} gives={gives} />
        )}
        {phase === "battle" && (
          <div className="compact-hud">
            <span>牌庫 {deck.length}</span>
            <span>棄 {discard.length}</span>
            <span>
              四給{" "}
              {(Object.keys(gives) as FourGiveKey[]).filter((k) => gives[k])
                .length}
              /4
            </span>
          </div>
        )}
      </header>

      <main className={`stage ${phase === "battle" || phase === "forge" ? "arena-stage" : ""}`}>
        {phase === "title" && (
          <section className="title-card enter title-tight">
            <p className="eyebrow">築牌對戰</p>
            <h1>三好關卡</h1>
            <p className="lead tight">
              出牌清威脅 → AI 煉新卡 → 築你的牌庫
            </p>
            <div className="title-stats">
              <div>
                <b>{THREATS.length}</b>
                <span>波次</span>
              </div>
              <div>
                <b>{ENERGY_MAX}</b>
                <span>專注／回</span>
              </div>
              <div>
                <b>{CHAOS_LIMIT}</b>
                <span>混亂上限</span>
              </div>
            </div>
            <button
              type="button"
              className="primary-btn large"
              onClick={startRun}
            >
              PLAY
            </button>
          </section>
        )}

        {(phase === "battle" || phase === "forge") && (
          <section className="arena enter">
            <div className="arena-rail">
              <span className="wave-chip">{threat.tag}</span>
              <div className="energy-pips" aria-label="專注">
                {Array.from({ length: ENERGY_MAX }).map((_, i) => (
                  <i
                    key={i}
                    className={i < energy ? "on" : "off"}
                  />
                ))}
              </div>
              <div className="chaos-pips" aria-label="混亂">
                {Array.from({ length: CHAOS_LIMIT }).map((_, i) => (
                  <i key={i} className={i < chaos ? "on" : "off"} />
                ))}
              </div>
            </div>

            <div
              className={`threat-stage ${shake ? "shake" : ""} ${pulseClear ? "cleared" : ""}`}
            >
              <div className="threat-avatar" aria-hidden>
                {threat.icon}
              </div>
              <h2 className="threat-name">{threat.name}</h2>
              <p className="threat-tagline">{threat.flavor}</p>
              <div className="hp-wrap">
                <div className="hp-bar">
                  <i
                    style={{
                      width: `${Math.max(0, (threatHp / threat.hp) * 100)}%`,
                    }}
                  />
                </div>
                <strong>
                  {Math.max(0, threatHp)} / {threat.hp}
                </strong>
              </div>
              <div className="weak-pills">
                {threat.weakTo.map((t) => (
                  <span key={t}>{TYPE_LABELS[t]}</span>
                ))}
              </div>

              <div className="floater-layer" aria-hidden>
                {floaters.map((f) => (
                  <span key={f.id} className={`floater ${f.kind}`}>
                    {f.text}
                  </span>
                ))}
              </div>
            </div>

            {phase === "battle" && (
              <>
                <div className="hand-fan">
                  {hand.map((card, index) => {
                    const afford = energy >= card.cost;
                    const { damage, weak } = calcDamage(card, threat);
                    const tilt = (index - (hand.length - 1) / 2) * 4;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        className={`card-tile fan type-${card.type} ${afford ? "" : "disabled"} ${weak ? "is-weak" : ""}`}
                        style={{
                          transform: `rotate(${tilt}deg)`,
                          zIndex: index,
                        }}
                        disabled={!afford}
                        onClick={() => playCard(card)}
                      >
                        <div className="card-cost">{card.cost}</div>
                        <div className="card-name">{card.name}</div>
                        <div className="card-type">{TYPE_LABELS[card.type]}</div>
                        <div className="card-power">
                          {damage}
                          {weak ? "★" : ""}
                        </div>
                        {card.forged && <span className="forge-tag">鍛</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="arena-actions">
                  <button type="button" className="end-turn-btn" onClick={endTurn}>
                    結束回合
                  </button>
                  <span className="hint-mini">弱點：{weakHint}</span>
                </div>
              </>
            )}

            {phase === "forge" && (
              <div className="forge-overlay">
                <p className="forge-title">CLEAR · 煉卡</p>
                {forging && <div className="forge-spinner" />}
                {!forging && offer && (
                  <>
                    <div className={`card-tile large type-${offer.type}`}>
                      <div className="card-cost">{offer.cost}</div>
                      <div className="card-name">{offer.name}</div>
                      <div className="card-type">{TYPE_LABELS[offer.type]}</div>
                      <div className="card-text">{offer.text}</div>
                      <div className="card-power">{offer.power}</div>
                      {offer.fourGive && (
                        <div className="card-give">
                          {FOUR_GIVE_LABELS[offer.fourGive]}
                        </div>
                      )}
                      <span className="forge-tag">NEW</span>
                    </div>
                    {forgeHint && <p className="hint-mini">{forgeHint}</p>}
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
          </section>
        )}

        {phase === "victory" && (
          <section className="play-card enter ending">
            <p className="eyebrow">VICTORY</p>
            <h2>牌庫 {deck.length} 張</h2>
            <ScoreBoard scores={scores} gives={gives} />
            <div style={{ marginTop: "1rem" }}>
              <FourGiveBoard gives={gives} />
            </div>
            <div className="cta-row">
              <button type="button" className="primary-btn" onClick={startRun}>
                再來一局
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setPhase("title")}
              >
                標題
              </button>
            </div>
          </section>
        )}

        {phase === "defeat" && (
          <section className="play-card enter ending">
            <p className="eyebrow">DEFEAT</p>
            <h2>混亂爆了</h2>
            <p className="lead tight">對弱點出牌，盡快走完威脅。</p>
            <button type="button" className="primary-btn" onClick={startRun}>
              RETRY
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
