"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_FOUR_GIVES,
  EMPTY_SCORES,
  FOUR_GIVE_LABELS,
  LEVEL_1,
  SCORE_LABELS,
  type Choice,
  type FourGiveKey,
  type ScoreKey,
} from "@/data/level1";
import { MentorChat, type CounselResult } from "@/components/MentorChat";
import { ScoreBoard } from "@/components/ScoreBoard";
import { FourGiveBoard } from "@/components/FourGiveBoard";

type Phase = "title" | "consult" | "act" | "result-flash" | "ending";

const STORAGE_KEY = "3good-quest-progress-v1";

export function Game() {
  const [phase, setPhase] = useState<Phase>("title");
  const [stepIndex, setStepIndex] = useState(0);
  const [scores, setScores] = useState({ ...EMPTY_SCORES });
  const [gives, setGives] = useState({ ...EMPTY_FOUR_GIVES });
  const [lastChoice, setLastChoice] = useState<Choice | null>(null);
  const [lastUnlocked, setLastUnlocked] = useState<FourGiveKey[]>([]);
  const [cleared, setCleared] = useState(false);
  const [counsel, setCounsel] = useState<CounselResult | null>(null);
  const [choiceLog, setChoiceLog] = useState<string[]>([]);
  const [aiReflect, setAiReflect] = useState<string | null>(null);
  const [reflectLoading, setReflectLoading] = useState(false);

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
    setCounsel(null);
    setChoiceLog([]);
    setAiReflect(null);
    setPhase("consult");
  }

  function onCounseled(result: CounselResult) {
    setCounsel(result);
    setPhase("act");
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

    const followed =
      counsel?.recommendId === choice.id ? "（採納小好建議）" : "（走自己的路）";
    setChoiceLog((log) => [
      ...log,
      `第${stepIndex + 1}步：${choice.label}${followed}`,
    ]);

    setLastUnlocked(newly);
    setLastChoice(choice);
    setPhase("result-flash");
  }

  async function fetchReflect(
    nextScores: Record<ScoreKey, number>,
    nextGives: Record<FourGiveKey, boolean>,
    log: string[],
    endingTitle: string,
  ) {
    setReflectLoading(true);
    setAiReflect(null);
    const scoreLine = (Object.keys(SCORE_LABELS) as ScoreKey[])
      .map((k) => `${SCORE_LABELS[k]}${nextScores[k]}`)
      .join("、");
    const giveLine = (Object.keys(FOUR_GIVE_LABELS) as FourGiveKey[])
      .filter((k) => nextGives[k])
      .map((k) => FOUR_GIVE_LABELS[k])
      .join("、");
    const summary = [
      `結局：${endingTitle}`,
      `三好：${scoreLine}`,
      `四給：${giveLine || "尚未點亮"}`,
      `選擇：${log.join(" / ")}`,
    ].join("\n");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "reflect", summary }),
      });
      const data = await res.json();
      setAiReflect(String(data.reply ?? "這關辛苦了。"));
    } catch {
      setAiReflect("這關你有走完，很重要。下次再找小好當軍師吧。");
    } finally {
      setReflectLoading(false);
    }
  }

  function continueAfterFlash() {
    if (stepIndex >= LEVEL_1.steps.length - 1) {
      const finalEnding =
        LEVEL_1.endings.find((e) => e.when(scores, gives)) ??
        LEVEL_1.endings.at(-1)!;
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
      void fetchReflect(scores, gives, choiceLog, finalEnding.title);
      return;
    }
    setStepIndex((i) => i + 1);
    setLastChoice(null);
    setLastUnlocked([]);
    setCounsel(null);
    setPhase("consult");
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
            <p className="eyebrow">AI 軍師主線 · 三好計分 · 四給收集</p>
            <h1>三好關卡</h1>
            <p className="lead">
              每一幕都要先跟 AI 夥伴「小好」請示，聽完建議才解鎖行動。你的選擇改寫三好分數與四給；通關時小好還會給個人化短評。
            </p>
            <ul className="feature-list">
              <li>
                <strong>請示小好</strong>：說出直覺，取得軍師建議與推薦行動
              </li>
              <li>
                <strong>做出選擇</strong>：可採納建議，也可故意走自己的路
              </li>
              <li>
                <strong>結算短評</strong>：AI 依你本關表現說一句公道話
              </li>
            </ul>
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
            <p className="fine-print">
              免登入 · AI 為過關必要步驟（無 Key 時走內建軍師）
            </p>
          </section>
        )}

        {(phase === "consult" || phase === "act") && step && (
          <section className="play-card enter wide">
            <p className="level-tag">
              第一關 · 第 {stepIndex + 1}/{LEVEL_1.steps.length} 幕 ·{" "}
              {phase === "consult" ? "請示小好" : "選擇行動"}
            </p>
            {stepIndex === 0 && phase === "consult" && (
              <p className="hook">{LEVEL_1.hook}</p>
            )}
            <p className="narrator">{step.narrator}</p>
            <h2 className="prompt">{step.prompt}</h2>

            {phase === "consult" && (
              <>
                <p className="ai-gate">
                  行動選項已鎖定——先跟小好說一句你的想法，取得軍師建議後才會解鎖。
                </p>
                <MentorChat
                  embedded
                  mode="counsel"
                  scene={sceneText}
                  choices={step.choices.map((c) => ({
                    id: c.id,
                    label: c.label,
                  }))}
                  resetKey={`${LEVEL_1.id}-${step.id}`}
                  onCounseled={onCounseled}
                  subtitle="AI 軍師 · 必要步驟"
                />
              </>
            )}

            {phase === "act" && counsel && (
              <>
                <div className="counsel-banner">
                  <p className="counsel-label">小好推薦</p>
                  <p className="counsel-why">{counsel.why}</p>
                  {counsel.degraded && (
                    <p className="mentor-hint">目前為快速軍師模式</p>
                  )}
                </div>
                <div className="choices">
                  {step.choices.map((c) => {
                    const recommended = c.id === counsel.recommendId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`choice-btn ${recommended ? "recommended" : ""}`}
                        onClick={() => pick(c)}
                      >
                        {recommended && (
                          <span className="rec-badge">小好推</span>
                        )}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="ghost-btn"
                  style={{ marginTop: "0.75rem" }}
                  onClick={() => {
                    setCounsel(null);
                    setPhase("consult");
                  }}
                >
                  再問小好一次
                </button>
              </>
            )}
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
                      {SCORE_LABELS[k]} {v > 0 ? `+${v}` : v}
                    </span>
                  ),
              )}
              {lastUnlocked.map((key) => (
                <span key={key} className="delta give">
                  解鎖四給 · {FOUR_GIVE_LABELS[key]}
                </span>
              ))}
              {counsel?.recommendId === lastChoice.id ? (
                <span className="delta up">採納 AI 建議</span>
              ) : (
                <span className="delta">自走路線</span>
              )}
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
            <div className="reflect-box">
              <p className="counsel-label">小好的結算短評（AI）</p>
              <p className="narrator">
                {reflectLoading
                  ? "小好正在回看你這一關…"
                  : (aiReflect ?? "…")}
              </p>
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
              挑戰：採納或反抗小好建議，都能玩出不同結局；四給全開另有彩蛋結局。
            </p>
          </section>
        )}
      </main>

      {phase !== "title" && phase !== "consult" && (
        <MentorChat
          scene={sceneText}
          mode="chat"
          subtitle="閒聊加開 · 不影響進度"
        />
      )}
    </div>
  );
}
