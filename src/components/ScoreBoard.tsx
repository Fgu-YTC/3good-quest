"use client";

import { SCORE_LABELS, type ScoreKey } from "@/data/level1";

const COLORS: Record<ScoreKey, string> = {
  do: "var(--score-do)",
  speak: "var(--score-speak)",
  heart: "var(--score-heart)",
};

export function ScoreBoard({ scores }: { scores: Record<ScoreKey, number> }) {
  return (
    <div className="score-board" aria-label="三好分數">
      {(Object.keys(SCORE_LABELS) as ScoreKey[]).map((key) => (
        <div key={key} className="score-pill">
          <span className="score-dot" style={{ background: COLORS[key] }} />
          <span className="score-label">{SCORE_LABELS[key]}</span>
          <span className="score-value">{scores[key]}</span>
        </div>
      ))}
    </div>
  );
}
