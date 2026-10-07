import { NextResponse } from "next/server";
import {
  buildForgePrompt,
  fallbackForge,
  parseForgeJson,
  type ForgeContext,
} from "@/lib/forge";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

function numEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function POST(req: Request) {
  let body: Partial<ForgeContext>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的請求" }, { status: 400 });
  }

  if (!body.threat || !Array.isArray(body.played)) {
    return NextResponse.json({ error: "缺少煉卡上下文" }, { status: 400 });
  }

  const ctx: ForgeContext = {
    threat: body.threat,
    played: body.played,
    wave: Number(body.wave) || 1,
    unlockedGives: body.unlockedGives ?? [],
  };

  const perMinute = numEnv("RATE_LIMIT_PER_MINUTE", 8);
  const perDay = numEnv("RATE_LIMIT_PER_DAY", 60);
  const key = clientKeyFromRequest(req);
  const limit = checkRateLimit(key, perMinute, perDay);
  const fb = fallbackForge(ctx);

  if (!limit.ok) {
    return NextResponse.json({
      card: fb,
      degraded: true,
      reason: "額度限制，使用規則煉卡",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      card: fb,
      degraded: true,
      reason: "未設定 API Key，使用規則煉卡",
    });
  }

  const baseUrl = (
    process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const user = [
    `威脅：${ctx.threat.name}（${ctx.threat.flavor}）`,
    `波次：${ctx.wave}`,
    `已解鎖四給：${ctx.unlockedGives.join(",") || "無"}`,
    `本波出牌：${ctx.played.map((p) => `${p.name}/${p.type}`).join("、") || "無"}`,
    "請煉一張新卡 JSON。",
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
          { role: "system", content: buildForgePrompt() },
          { role: "user", content: user },
        ],
        max_tokens: 220,
        temperature: 0.9,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({
        card: fb,
        degraded: true,
        reason: "煉卡爐過熱，改用規則煉卡",
      });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = parseForgeJson(
      data.choices?.[0]?.message?.content?.trim() ?? "",
    );

    return NextResponse.json({
      card: parsed ?? fb,
      degraded: !parsed,
      reason: parsed ? undefined : "煉卡解析失敗，改用規則煉卡",
      remainingMinute: limit.remainingMinute,
      remainingDay: limit.remainingDay,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      card: fb,
      degraded: true,
      reason: "連線失敗，改用規則煉卡",
    });
  }
}
