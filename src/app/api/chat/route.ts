import { NextResponse } from "next/server";
import {
  buildSystemPrompt,
  fallbackReply,
  pickCardsForMessage,
} from "@/lib/mentor";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

function numEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function POST(req: Request) {
  let body: {
    message?: string;
    history?: ChatMessage[];
    scene?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的請求" }, { status: 400 });
  }

  const maxChars = numEnv("MAX_USER_CHARS", 200);
  const maxTurns = numEnv("MAX_HISTORY_TURNS", 6);
  const maxTokens = numEnv("MAX_REPLY_TOKENS", 220);
  const perMinute = numEnv("RATE_LIMIT_PER_MINUTE", 8);
  const perDay = numEnv("RATE_LIMIT_PER_DAY", 60);

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "請輸入內容" }, { status: 400 });
  }
  if (message.length > maxChars) {
    return NextResponse.json(
      { error: `訊息太長（最多 ${maxChars} 字）` },
      { status: 400 },
    );
  }

  const key = clientKeyFromRequest(req);
  const limit = checkRateLimit(key, perMinute, perDay);
  if (!limit.ok) {
    const cards = pickCardsForMessage(message);
    return NextResponse.json({
      reply: fallbackReply(message, cards),
      cards: cards.map((c) => ({ id: c.id, title: c.title, tip: c.tip })),
      degraded: true,
      reason: limit.reason === "minute" ? "說話太快，先用快速建議" : "今日額度用完，先用快速建議",
      retryAfterSec: limit.retryAfterSec,
    });
  }

  const cards = pickCardsForMessage(
    `${message} ${body.scene ?? ""}`,
  );
  const history = (body.history ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-maxTurns);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: fallbackReply(message, cards),
      cards: cards.map((c) => ({ id: c.id, title: c.title, tip: c.tip })),
      degraded: true,
      reason: "未設定 API Key，使用內建回覆",
    });
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(cards) },
  ];
  if (body.scene) {
    messages.push({
      role: "system",
      content: `目前關卡情境：${body.scene}`,
    });
  }
  messages.push(...history, { role: "user", content: message });

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("LLM error", res.status, errText.slice(0, 300));
      return NextResponse.json({
        reply: fallbackReply(message, cards),
        cards: cards.map((c) => ({ id: c.id, title: c.title, tip: c.tip })),
        degraded: true,
        reason: "模型暫時忙碌，改用快速建議",
      });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      fallbackReply(message, cards);

    return NextResponse.json({
      reply,
      cards: cards.map((c) => ({ id: c.id, title: c.title, tip: c.tip })),
      degraded: false,
      remainingMinute: limit.remainingMinute,
      remainingDay: limit.remainingDay,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      reply: fallbackReply(message, cards),
      cards: cards.map((c) => ({ id: c.id, title: c.title, tip: c.tip })),
      degraded: true,
      reason: "連線失敗，改用快速建議",
    });
  }
}
