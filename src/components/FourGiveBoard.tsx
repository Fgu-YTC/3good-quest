"use client";

import {
  FOUR_GIVE_BLURBS,
  FOUR_GIVE_LABELS,
  FOUR_GIVE_ORDER,
  type FourGiveKey,
} from "@/data/level1";

export function FourGiveBoard({
  gives,
  compact = false,
}: {
  gives: Record<FourGiveKey, boolean>;
  compact?: boolean;
}) {
  const unlocked = FOUR_GIVE_ORDER.filter((k) => gives[k]).length;

  return (
    <div
      className={`four-give-board ${compact ? "compact" : ""}`}
      aria-label="四給進度"
    >
      <div className="four-give-head">
        <span className="four-give-title">四給</span>
        <span className="four-give-count">
          {unlocked}/4
        </span>
      </div>
      <div className="four-give-grid">
        {FOUR_GIVE_ORDER.map((key) => {
          const on = gives[key];
          return (
            <div
              key={key}
              className={`four-give-chip ${on ? "on" : "off"}`}
              title={FOUR_GIVE_BLURBS[key]}
            >
              <span className="four-give-mark" aria-hidden>
                {on ? "✓" : "·"}
              </span>
              <span className="four-give-label">{FOUR_GIVE_LABELS[key]}</span>
              {!compact && (
                <span className="four-give-blurb">{FOUR_GIVE_BLURBS[key]}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
