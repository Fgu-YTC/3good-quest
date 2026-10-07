"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export type CounselResult = {
  advice: string;
  recommendId: string;
  why: string;
  degraded?: boolean;
};

type ChoiceOption = { id: string; label: string };

const DEFAULT_QUICK = [
  "我超火大怎麼辦？",
  "怎樣說才不被當刺？",
  "要不要當場揭穿？",
  "怎樣才算給人方便？",
];

export function MentorChat({
  scene,
  mode = "chat",
  choices,
  quick = DEFAULT_QUICK,
  embedded = false,
  resetKey,
  onCounseled,
  title = "小好",
  subtitle = "關卡夥伴",
}: {
  scene: string;
  mode?: "chat" | "counsel";
  choices?: ChoiceOption[];
  quick?: string[];
  embedded?: boolean;
  resetKey?: string | number;
  onCounseled?: (result: CounselResult) => void;
  title?: string;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(embedded);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const counseledRef = useRef(false);

  useEffect(() => {
    counseledRef.current = false;
    setHint(null);
    setInput("");
    setMessages([
      {
        role: "assistant",
        content:
          mode === "counsel"
            ? "先跟我說說你現在想怎麼做、火氣多大。聽完我的軍師建議，才能解鎖行動選項。"
            : "嗨，我是小好。想吐槽、想問招都可以。",
      },
    ]);
    if (embedded) setOpen(true);
  }, [resetKey, mode, embedded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextHistory = [
      ...messages,
      { role: "user" as const, content: trimmed },
    ];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    setHint(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          scene,
          mode,
          choices: mode === "counsel" ? choices : undefined,
          history: nextHistory.slice(0, -1),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.error || "小好暫時接不到線，再試一次。",
          },
        ]);
      } else {
        const advice = String(data.advice ?? data.reply ?? "");
        setMessages((m) => [...m, { role: "assistant", content: advice }]);
        if (data.degraded && data.reason) setHint(String(data.reason));

        if (
          mode === "counsel" &&
          data.recommendId &&
          !counseledRef.current
        ) {
          counseledRef.current = true;
          onCounseled?.({
            advice,
            recommendId: String(data.recommendId),
            why: String(data.why ?? ""),
            degraded: Boolean(data.degraded),
          });
        }
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "訊號飄走了，再跟我說一次吧。" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const panel = (
    <section
      className={`mentor-panel ${embedded ? "embedded" : ""}`}
      aria-label="小好對話"
    >
      <header className="mentor-header">
        <div>
          <strong>{title}</strong>
          <span className="mentor-sub">{subtitle}</span>
        </div>
        {!embedded && (
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setOpen(false)}
          >
            收起
          </button>
        )}
      </header>

      <div className="mentor-messages">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="bubble assistant typing">小好想一下…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {hint && <p className="mentor-hint">{hint}</p>}

      <div className="quick-row">
        {quick.map((q) => (
          <button
            key={q}
            type="button"
            className="chip"
            onClick={() => send(q)}
            disabled={loading}
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="mentor-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "counsel" ? "告訴小好你的直覺…" : "跟小好說點什麼…"
          }
          maxLength={200}
          disabled={loading}
        />
        <button
          type="submit"
          className="primary-btn"
          disabled={loading || !input.trim()}
        >
          送出
        </button>
      </form>
    </section>
  );

  if (embedded) {
    return <div className="mentor-embedded">{panel}</div>;
  }

  return (
    <div className={`mentor-dock ${open ? "open" : ""}`}>
      {!open && (
        <button
          type="button"
          className="mentor-fab"
          onClick={() => setOpen(true)}
        >
          <span className="mentor-fab-face" aria-hidden>
            好
          </span>
          找小好聊聊
        </button>
      )}
      {open && panel}
    </div>
  );
}
