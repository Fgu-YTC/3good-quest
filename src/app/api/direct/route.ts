import { NextResponse } from "next/server";
import type { Choice } from "@/data/level1";
import {
  buildDirectPrompt,
  fallbackDirect,
  parseDirectJson,
} from "@/lib/direct";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

function numEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function POST(req: Request) {
  let body: {
    playerText?: string;
    scene?: string;
    prompt?: string;
    choices?: Choice[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的請求" }, { status: 400 });
  }

  const playerText = (body.playerText ?? "").trim();
  const maxChars = numEnv("MAX_USER_CHARS", 200);
  const maxTokens = numEnv("MAX_REPLY_TOKENS", 420);
  const perMinute = numEnv("RATE_LIMIT_PER_MINUTE", 8);
  const perDay = numEnv("RATE_LIMIT_PER_DAY", 60);

  if (!playerText) {
    return NextResponse.json({ error: "請先寫下你的行動" }, { status: 400 });
  }
  if (playerText.length > maxChars) {
    return NextResponse.json(
      { error: `太長了（最多 ${maxChars} 字）` },
      { status: 400 },
    );
  }
  if (!body.choices?.length) {
    return NextResponse.json({ error: "缺少關卡錨點" }, { status: 400 });
  }

  const key = clientKeyFromRequest(req);
  const limit = checkRateLimit(key, perMinute, perDay);
  const fb = fallbackDirect(playerText, body.choices);

  if (!limit.ok) {
    return NextResponse.json({
      ...fb,
      degraded: true,
      reason:
        limit.reason === "minute"
          ? "操作太快，改用快速導演"
          : "今日額度用完，改用快速導演",
      retryAfterSec: limit.retryAfterSec,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ...fb,
      degraded: true,
      reason: "未設定 API Key，使用快速導演",
    });
  }

  const baseUrl = (
    process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const userBlock = [
    `情境：${body.scene ?? ""}`,
    `當下問題：${body.prompt ?? ""}`,
    `玩家寫下的行動／台詞："""${playerText}"""`,
    "請依玩家原文演出後果 JSON。",
  ].join("\n");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildDirectPrompt(body.choices) },
          { role: "user", content: userBlock },
        ],
        max_tokens: maxTokens,
        temperature: 0.85,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("direct LLM error", res.status, errText.slice(0, 300));
      return NextResponse.json({
        ...fb,
        degraded: true,
        reason: "導演忙碌，改用快速模式",
      });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = parseDirectJson(raw);
    if (!parsed) {
      return NextResponse.json({
        ...fb,
        degraded: true,
        reason: "導演腳本解析失敗，改用快速模式",
      });
    }

    return NextResponse.json({
      ...parsed,
      degraded: false,
      remainingMinute: limit.remainingMinute,
      remainingDay: limit.remainingDay,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      ...fb,
      degraded: true,
      reason: "連線失敗，改用快速導演",
    });
  }
}
