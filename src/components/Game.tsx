"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_FOUR_GIVES,
  EMPTY_SCORES,
  FOUR_GIVE_LABELS,
  LEVEL_1,
  SCORE_LABELS,
  type FourGiveKey,
  type ScoreKey,
} from "@/data/level1";
import type { DirectResult } from "@/lib/direct";
import { ScoreBoard } from "@/components/ScoreBoard";
import { FourGiveBoard } from "@/components/FourGiveBoard";

type Phase = "title" | "compose" | "resolving" | "result" | "ending";

const STORAGE_KEY = "3good-quest-progress-v2";

const SEEDS = [
  "當場補一句：這塊互動是我做的，流程阿澤整合。",
  "先忍下來，發表後再私下把貢獻表貼群組。",
  "微笑說我們一起做的，邀他明天一起分享。",
  "陰陽一句「口誤講得好順」，然後滑手機。",
];

export function Game() {
  const [phase, setPhase] = useState<Phase>("title");
  const [stepIndex, setStepIndex] = useState(0);
  const [scores, setScores] = useState({ ...EMPTY_SCORES });
  const [gives, setGives] = useState({ ...EMPTY_FOUR_GIVES });
  const [draft, setDraft] = useState("");
  const [last, setLast] = useState<DirectResult | null>(null);
  const [lastUnlocked, setLastUnlocked] = useState<FourGiveKey[]>([]);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [degradedReason, setDegradedReason] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

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
    setDraft("");
    setLast(null);
    setLastUnlocked([]);
    setActionLog([]);
    setError(null);
    setDegradedReason(null);
    setHighlight(null);
    setPhase("compose");
  }

  async function submitAction() {
    const text = draft.trim();
    if (!text || !step) return;
    setPhase("resolving");
    setError(null);
    setDegradedReason(null);

    try {
      const res = await fetch("/api/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerText: text,
          scene: sceneText,
          prompt: step.prompt,
          choices: step.choices,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "導演開天窗了，再試一次");
        setPhase("compose");
        return;
      }

      const result = data as DirectResult & { degraded?: boolean; reason?: string };
      const newly = (result.fourGives ?? []).filter((k) => !gives[k]);

      setScores((prev) => {
        const next = { ...prev };
        (Object.keys(result.deltas ?? {}) as ScoreKey[]).forEach((k) => {
          next[k] += result.deltas[k] ?? 0;
        });
        return next;
      });
      if (result.fourGives?.length) {
        setGives((prev) => {
          const next = { ...prev };
          for (const k of result.fourGives) next[k] = true;
          return next;
        });
      }

      setLastUnlocked(newly);
      setLast(result);
      setActionLog((log) => [...log, `「${text}」→ ${result.headline}`]);
      if (result.degraded && result.reason) {
        setDegradedReason(String(result.reason));
      }
      setPhase("result");
    } catch {
      setError("連線飄走了，再送一次");
      setPhase("compose");
    }
  }

  async function goEnding(
    nextScores: Record<ScoreKey, number>,
    nextGives: Record<FourGiveKey, boolean>,
    log: string[],
  ) {
    const finalEnding =
      LEVEL_1.endings.find((e) => e.when(nextScores, nextGives)) ??
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

    const scoreLine = (Object.keys(SCORE_LABELS) as ScoreKey[])
      .map((k) => `${SCORE_LABELS[k]}${nextScores[k]}`)
      .join("、");
    const giveLine = (Object.keys(FOUR_GIVE_LABELS) as FourGiveKey[])
      .filter((k) => nextGives[k])
      .map((k) => FOUR_GIVE_LABELS[k])
      .join("、");
    const summary = [
      `結局：${finalEnding.title}`,
      `三好：${scoreLine}`,
      `四給：${giveLine || "尚未點亮"}`,
      `玩家行動剪輯：${log.join(" / ")}`,
      "請用導演口吻給 3～5 句個人化短評，不要 JSON。",
    ].join("\n");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "reflect", summary }),
      });
      const data = await res.json();
      setHighlight(String(data.reply ?? finalEnding.blurb));
    } catch {
      setHighlight(finalEnding.blurb);
    }
  }

  function continueAfterResult() {
    if (stepIndex >= LEVEL_1.steps.length - 1) {
      void goEnding(scores, gives, actionLog);
      return;
    }
    setStepIndex((i) => i + 1);
    setDraft("");
    setLast(null);
    setLastUnlocked([]);
    setDegradedReason(null);
    setPhase("compose");
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
            <p className="eyebrow">你寫台詞 · AI 演爆點</p>
            <h1>三好關卡</h1>
            <p className="lead">
              不是跟 AI 聊天。你寫下當下要說的話／要做的事，AI 當「爆點導演」——生成現場後果、群組反應，並結算三好與四給。
            </p>
            <ul className="feature-list">
              <li>
                <strong>玩家創作</strong>：每一幕自己寫行動
              </li>
              <li>
                <strong>AI 導演</strong>：客製後果＋旁人吐槽氣泡
              </li>
              <li>
                <strong>分數系統</strong>：三好加減、四給收集、多結局
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
            <p className="fine-print">免登入 · AI 是過關引擎（無 Key 走快速導演）</p>
          </section>
        )}

        {(phase === "compose" || phase === "resolving") && step && (
          <section className="play-card enter wide">
            <p className="level-tag">
              第一關 · 第 {stepIndex + 1}/{LEVEL_1.steps.length} 幕 · 寫下你的行動
            </p>
            {stepIndex === 0 && <p className="hook">{LEVEL_1.hook}</p>}
            <p className="narrator">{step.narrator}</p>
            <h2 className="prompt">{step.prompt}</h2>

            <label className="compose-label" htmlFor="action-draft">
              你會說／做什麼？（AI 會依這段演後果）
            </label>
            <textarea
              id="action-draft"
              className="compose-box"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={200}
              rows={4}
              placeholder="例如：我微笑說這塊我們一起做……"
              disabled={phase === "resolving"}
            />
            <div className="compose-meta">
              <span>{draft.trim().length}/200</span>
              {error && <span className="compose-error">{error}</span>}
            </div>

            <div className="quick-row">
              {SEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  disabled={phase === "resolving"}
                  onClick={() => setDraft(s)}
                >
                  靈感：{s.slice(0, 10)}…
                </button>
              ))}
            </div>

            <button
              type="button"
              className="primary-btn large"
              style={{ marginTop: "1rem" }}
              disabled={phase === "resolving" || !draft.trim()}
              onClick={() => void submitAction()}
            >
              {phase === "resolving" ? "導演開拍中…" : "讓 AI 導演開拍"}
            </button>
          </section>
        )}

        {phase === "result" && last && (
          <section className="play-card enter wide">
            <p className="level-tag">爆點 · {last.headline}</p>
            <p className="narrator">{last.result}</p>

            <div className="group-chat" aria-label="現場與群組反應">
              {last.groupChat.map((b, i) => (
                <div key={`${b.name}-${i}`} className="chat-row">
                  <span className="chat-name">{b.name}</span>
                  <span className="chat-text">{b.text}</span>
                </div>
              ))}
            </div>

            <p className="verdict">導演：{last.verdict}</p>

            <div className="delta-row">
              {(Object.entries(last.deltas) as [ScoreKey, number][]).map(
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
            </div>
            {degradedReason && (
              <p className="mentor-hint">{degradedReason}</p>
            )}
            <button
              type="button"
              className="primary-btn"
              onClick={continueAfterResult}
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
              <p className="counsel-label">導演剪輯短評（AI）</p>
              <p className="narrator">{highlight ?? "剪輯中…"}</p>
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
          </section>
        )}
      </main>
    </div>
  );
}
