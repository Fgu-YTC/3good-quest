import { NextResponse } from "next/server";
import {
  buildCounselPrompt,
  buildReflectPrompt,
  buildSystemPrompt,
  fallbackCounsel,
  fallbackReflect,
  fallbackReply,
  parseCounselJson,
  pickCardsForMessage,
  type ChoiceOption,
} from "@/lib/mentor";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type Mode = "chat" | "counsel" | "reflect";

function numEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function callLlm(
  apiKey: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string | null> {
  const baseUrl = (
    process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

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
    return null;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function POST(req: Request) {
  let body: {
    message?: string;
    history?: ChatMessage[];
    scene?: string;
    mode?: Mode;
    choices?: ChoiceOption[];
    summary?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的請求" }, { status: 400 });
  }

  const mode: Mode = body.mode ?? "chat";
  const maxChars = numEnv("MAX_USER_CHARS", 200);
  const maxTurns = numEnv("MAX_HISTORY_TURNS", 6);
  const maxTokens = numEnv("MAX_REPLY_TOKENS", 220);
  const perMinute = numEnv("RATE_LIMIT_PER_MINUTE", 8);
  const perDay = numEnv("RATE_LIMIT_PER_DAY", 60);

  const message = (body.message ?? "").trim();
  if (mode !== "reflect" && !message) {
    return NextResponse.json({ error: "請輸入內容" }, { status: 400 });
  }
  if (message.length > maxChars) {
    return NextResponse.json(
      { error: `訊息太長（最多 ${maxChars} 字）` },
      { status: 400 },
    );
  }

  if (mode === "counsel" && (!body.choices || body.choices.length === 0)) {
    return NextResponse.json({ error: "缺少選項" }, { status: 400 });
  }

  const key = clientKeyFromRequest(req);
  const limit = checkRateLimit(key, perMinute, perDay);
  const cards = pickCardsForMessage(
    `${message} ${body.scene ?? ""} ${body.summary ?? ""}`,
  );
  const cardPayload = cards.map((c) => ({
    id: c.id,
    title: c.title,
    tip: c.tip,
  }));

  const degradedLimit = !limit.ok;
  const apiKey = process.env.OPENAI_API_KEY;

  // —— 軍師模式：解鎖選項用 ——
  if (mode === "counsel") {
    const choices = body.choices!;
    const fb = fallbackCounsel(message, cards, choices);

    if (degradedLimit || !apiKey) {
      return NextResponse.json({
        reply: fb.advice,
        advice: fb.advice,
        recommendId: fb.recommendId,
        why: fb.why,
        cards: cardPayload,
        degraded: true,
        reason: degradedLimit
          ? limit.reason === "minute"
            ? "說話太快，先用快速軍師"
            : "今日額度用完，先用快速軍師"
          : "未設定 API Key，使用內建軍師",
        retryAfterSec: degradedLimit ? limit.retryAfterSec : undefined,
      });
    }

    const messages: ChatMessage[] = [
      { role: "system", content: buildCounselPrompt(cards, choices) },
      {
        role: "system",
        content: `目前關卡情境：${body.scene ?? "（無）"}`,
      },
      ...(body.history ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-maxTurns),
      { role: "user", content: message },
    ];

    try {
      const raw = await callLlm(apiKey, messages, maxTokens);
      const parsed = raw ? parseCounselJson(raw, choices) : null;
      if (!parsed) {
        return NextResponse.json({
          reply: fb.advice,
          advice: fb.advice,
          recommendId: fb.recommendId,
          why: fb.why,
          cards: cardPayload,
          degraded: true,
          reason: "軍師解析失敗，改用快速建議",
          remainingMinute: limit.ok ? limit.remainingMinute : undefined,
          remainingDay: limit.ok ? limit.remainingDay : undefined,
        });
      }
      return NextResponse.json({
        reply: parsed.advice,
        advice: parsed.advice,
        recommendId: parsed.recommendId,
        why: parsed.why,
        cards: cardPayload,
        degraded: false,
        remainingMinute: limit.remainingMinute,
        remainingDay: limit.remainingDay,
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json({
        reply: fb.advice,
        advice: fb.advice,
        recommendId: fb.recommendId,
        why: fb.why,
        cards: cardPayload,
        degraded: true,
        reason: "連線失敗，改用快速軍師",
      });
    }
  }

  // —— 結算旁白 ——
  if (mode === "reflect") {
    const summary =
      (body.summary ?? "").trim() || message || "玩家完成本關。";
    const fb = fallbackReflect(summary);

    if (degradedLimit || !apiKey) {
      return NextResponse.json({
        reply: fb,
        cards: cardPayload,
        degraded: true,
        reason: degradedLimit ? "額度限制，使用快速結算" : "未設定 API Key",
      });
    }

    try {
      const raw = await callLlm(
        apiKey,
        [
          { role: "system", content: buildReflectPrompt(cards) },
          { role: "user", content: summary },
        ],
        maxTokens,
      );
      return NextResponse.json({
        reply: raw || fb,
        cards: cardPayload,
        degraded: !raw,
        remainingMinute: limit.remainingMinute,
        remainingDay: limit.remainingDay,
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json({
        reply: fb,
        cards: cardPayload,
        degraded: true,
        reason: "連線失敗，使用快速結算",
      });
    }
  }

  // —— 一般閒聊 ——
  if (degradedLimit || !apiKey) {
    return NextResponse.json({
      reply: fallbackReply(message, cards),
      cards: cardPayload,
      degraded: true,
      reason: degradedLimit
        ? limit.reason === "minute"
          ? "說話太快，先用快速建議"
          : "今日額度用完，先用快速建議"
        : "未設定 API Key，使用內建回覆",
      retryAfterSec: degradedLimit ? limit.retryAfterSec : undefined,
    });
  }

  const history = (body.history ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-maxTurns);

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
    const reply = await callLlm(apiKey, messages, maxTokens);
    return NextResponse.json({
      reply: reply || fallbackReply(message, cards),
      cards: cardPayload,
      degraded: !reply,
      reason: reply ? undefined : "模型無回應，改用快速建議",
      remainingMinute: limit.remainingMinute,
      remainingDay: limit.remainingDay,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      reply: fallbackReply(message, cards),
      cards: cardPayload,
      degraded: true,
      reason: "連線失敗，改用快速建議",
    });
  }
}
