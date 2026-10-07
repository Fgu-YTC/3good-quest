"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_FOUR_GIVES,
  EMPTY_SCORES,
  FOUR_GIVE_LABELS,
  LEVEL_1,
  type Choice,
  type FourGiveKey,
  type ScoreKey,
} from "@/data/level1";
import { MentorChat } from "@/components/MentorChat";
import { ScoreBoard } from "@/components/ScoreBoard";
import { FourGiveBoard } from "@/components/FourGiveBoard";

type Phase = "title" | "play" | "result-flash" | "ending";

const STORAGE_KEY = "3good-quest-progress-v1";

export function Game() {
  const [phase, setPhase] = useState<Phase>("title");
  const [stepIndex, setStepIndex] = useState(0);
  const [scores, setScores] = useState({ ...EMPTY_SCORES });
  const [gives, setGives] = useState({ ...EMPTY_FOUR_GIVES });
  const [lastChoice, setLastChoice] = useState<Choice | null>(null);
  const [lastUnlocked, setLastUnlocked] = useState<FourGiveKey[]>([]);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { clearedLevel1?: boolean };
        if (data.clearedLevel1) setCleared(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const step = LEVEL_1.steps[stepIndex];
  const sceneText = useMemo(
    () => `${LEVEL_1.title}。${LEVEL_1.hook} 目前：${step?.narrator ?? ""}`,
    [step],
  );

  const ending = useMemo(() => {
    return (
      LEVEL_1.endings.find((e) => e.when(scores, gives)) ??
      LEVEL_1.endings.at(-1)!
    );
  }, [scores, gives]);

  function startGame() {
    setScores({ ...EMPTY_SCORES });
    setGives({ ...EMPTY_FOUR_GIVES });
    setStepIndex(0);
    setLastChoice(null);
    setLastUnlocked([]);
    setPhase("play");
  }

  function pick(choice: Choice) {
    setScores((prev) => {
      const next = { ...prev };
      (Object.keys(choice.deltas) as ScoreKey[]).forEach((k) => {
        next[k] += choice.deltas[k] ?? 0;
      });
      return next;
    });

    const newly = (choice.fourGives ?? []).filter((key) => !gives[key]);
    if (choice.fourGives?.length) {
      setGives((prev) => {
        const next = { ...prev };
        for (const key of choice.fourGives!) next[key] = true;
        return next;
      });
    }
    setLastUnlocked(newly);
    setLastChoice(choice);
    setPhase("result-flash");
  }

  function continueAfterFlash() {
    if (stepIndex >= LEVEL_1.steps.length - 1) {
      setPhase("ending");
      setCleared(true);
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ clearedLevel1: true }),
        );
      } catch {
        /* ignore */
      }
      return;
    }
    setStepIndex((i) => i + 1);
    setLastChoice(null);
    setLastUnlocked([]);
    setPhase("play");
  }

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
            <p className="eyebrow">情境選擇 · 三好計分 · 四給收集</p>
            <h1>三好關卡</h1>
            <p className="lead">
              遇上麻煩事，選一步、看爆點。三好是你的操作分數；四給（信心、歡喜、希望、方便）是隱藏成就——選對路就能點亮。
            </p>
            <FourGiveBoard gives={EMPTY_FOUR_GIVES} />
            <div className="cta-row" style={{ marginTop: "1.25rem" }}>
              <button
                type="button"
                className="primary-btn large"
                onClick={startGame}
              >
                {cleared ? "再玩第一關" : "開始第一關"}
              </button>
            </div>
            <p className="fine-print">免登入 · 進度存在此裝置 · 開源 MIT</p>
          </section>
        )}

        {phase === "play" && step && (
          <section className="play-card enter">
            <p className="level-tag">第一關 · {LEVEL_1.title}</p>
            {stepIndex === 0 && <p className="hook">{LEVEL_1.hook}</p>}
            <p className="narrator">{step.narrator}</p>
            <h2 className="prompt">{step.prompt}</h2>
            <div className="choices">
              {step.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="choice-btn"
                  onClick={() => pick(c)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {phase === "result-flash" && lastChoice && (
          <section className="play-card enter flash">
            <p className="level-tag">結果</p>
            <p className="narrator">{lastChoice.result}</p>
            <div className="delta-row">
              {(Object.entries(lastChoice.deltas) as [ScoreKey, number][]).map(
                ([k, v]) =>
                  v !== 0 && (
                    <span
                      key={k}
                      className={`delta ${v > 0 ? "up" : "down"}`}
                    >
                      {k === "do"
                        ? "做好事"
                        : k === "speak"
                          ? "說好話"
                          : "存好心"}{" "}
                      {v > 0 ? `+${v}` : v}
                    </span>
                  ),
              )}
              {lastUnlocked.map((key) => (
                <span key={key} className="delta give">
                  解鎖四給 · {FOUR_GIVE_LABELS[key]}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="primary-btn"
              onClick={continueAfterFlash}
            >
              繼續
            </button>
          </section>
        )}

        {phase === "ending" && (
          <section className="play-card enter ending">
            <p className="level-tag">通關</p>
            <h2>{ending.title}</h2>
            <p className="narrator">{ending.blurb}</p>
            <ScoreBoard scores={scores} gives={gives} />
            <div style={{ marginTop: "1rem" }}>
              <FourGiveBoard gives={gives} />
            </div>
            <div className="cta-row">
              <button type="button" className="primary-btn" onClick={startGame}>
                重玩本關
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setPhase("title")}
              >
                回標題
              </button>
            </div>
            <p className="fine-print">
              挑戰：一輪點亮四給全開。第二關製作中。
            </p>
          </section>
        )}
      </main>

      {phase !== "title" && <MentorChat scene={sceneText} />}
    </div>
  );
}
