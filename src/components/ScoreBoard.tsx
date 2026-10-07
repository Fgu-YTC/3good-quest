"use client";

import { SCORE_LABELS, type ScoreKey } from "@/data/level1";
import { FourGiveBoard } from "@/components/FourGiveBoard";
import type { FourGiveKey } from "@/data/level1";

const COLORS: Record<ScoreKey, string> = {
  do: "var(--score-do)",
  speak: "var(--score-speak)",
  heart: "var(--score-heart)",
};

export function ScoreBoard({
  scores,
  gives,
}: {
  scores: Record<ScoreKey, number>;
  gives: Record<FourGiveKey, boolean>;
}) {
  return (
    <div className="hud-boards">
      <div className="score-board" aria-label="三好分數">
        {(Object.keys(SCORE_LABELS) as ScoreKey[]).map((key) => (
          <div key={key} className="score-pill">
            <span className="score-dot" style={{ background: COLORS[key] }} />
            <span className="score-label">{SCORE_LABELS[key]}</span>
            <span className="score-value">{scores[key]}</span>
          </div>
        ))}
      </div>
      <FourGiveBoard gives={gives} compact />
    </div>
  );
}
