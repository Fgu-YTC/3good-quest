"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  "我超火大怎麼辦？",
  "怎樣說才不被當刺？",
  "要不要當場揭穿？",
  "怎樣算做好事？",
];

export function MentorChat({ scene }: { scene: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "嗨，我是小好。這關有點燙嘴——想吐槽、想問招，都可以跟我說。回覆很短，求有用。",
    },
  ]);
  const [hint, setHint] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextHistory = [...messages, { role: "user" as const, content: trimmed }];
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
          history: nextHistory.slice(0, -1),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.error || "小好暫時接不到線，先選關卡選項吧。" },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply as string },
        ]);
        if (data.degraded && data.reason) setHint(String(data.reason));
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "訊號飄走了。你可以先做關卡選擇，稍後再來找我。" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`mentor-dock ${open ? "open" : ""}`}>
      {!open && (
        <button type="button" className="mentor-fab" onClick={() => setOpen(true)}>
          <span className="mentor-fab-face" aria-hidden>
            好
          </span>
          找小好聊聊
        </button>
      )}

      {open && (
        <section className="mentor-panel" aria-label="小好對話">
          <header className="mentor-header">
            <div>
              <strong>小好</strong>
              <span className="mentor-sub">關卡夥伴 · 可亂講</span>
            </div>
            <button type="button" className="ghost-btn" onClick={() => setOpen(false)}>
              收起
            </button>
          </header>

          <div className="mentor-messages">
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="bubble assistant typing">小好想一下…</div>}
            <div ref={bottomRef} />
          </div>

          {hint && <p className="mentor-hint">{hint}</p>}

          <div className="quick-row">
            {QUICK.map((q) => (
              <button key={q} type="button" className="chip" onClick={() => send(q)} disabled={loading}>
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
              placeholder="跟小好說點什麼…"
              maxLength={200}
              disabled={loading}
            />
            <button type="submit" className="primary-btn" disabled={loading || !input.trim()}>
              送出
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
