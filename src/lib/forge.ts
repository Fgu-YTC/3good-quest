import type { FourGiveKey } from "@/data/level1";
import type { CardType, GameCard, Threat } from "@/data/cards";
import { TYPE_LABELS } from "@/data/cards";

const TYPES: CardType[] = ["do", "speak", "heart", "give"];
const FOUR: FourGiveKey[] = [
  "confidence",
  "joy",
  "hope",
  "convenience",
];

export type ForgeContext = {
  threat: Threat;
  played: { name: string; type: CardType }[];
  wave: number;
  unlockedGives: FourGiveKey[];
};

export function buildForgePrompt(): string {
  return [
    "你是《三好關卡》的煉卡師。根據玩家這一波的出牌，鍛造 1 張可加入牌庫的新卡。",
    "只輸出 JSON（不要 markdown）：",
    '{"name":"卡名四字內","cost":1,"type":"do|speak|heart|give","power":1,"text":"效果描述一句","fourGive":null或"confidence|joy|hope|convenience"}',
    "規則：",
    "- cost 0～3；power 1～5；power 大致不要遠超 cost+2。",
    "- 繁體中文；卡名要有遊戲感，不要說教口號。",
    "- 不要提任何真人宗教領袖。",
    "- 若 type 是 give，可給 fourGive；否則 fourGive 必須 null。",
    "- 卡要呼應玩家本波打法（例如常出說好話就偏溝通牌）。",
  ].join("\n");
}

export function parseForgeJson(raw: string): GameCard | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const data = JSON.parse(raw.slice(start, end + 1)) as {
      name?: string;
      cost?: number;
      type?: string;
      power?: number;
      text?: string;
      fourGive?: string | null;
    };

    if (!data.name || !data.text || !data.type) return null;
    if (!TYPES.includes(data.type as CardType)) return null;

    const cost = Math.max(0, Math.min(3, Math.round(Number(data.cost) || 1)));
    const power = Math.max(1, Math.min(5, Math.round(Number(data.power) || 2)));
    const type = data.type as CardType;
    let fourGive: FourGiveKey | undefined;
    if (
      type === "give" &&
      data.fourGive &&
      FOUR.includes(data.fourGive as FourGiveKey)
    ) {
      fourGive = data.fourGive as FourGiveKey;
    }

    return {
      id: `forge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: String(data.name).slice(0, 8),
      cost,
      type,
      power,
      text: String(data.text).slice(0, 48),
      fourGive,
      forged: true,
    };
  } catch {
    return null;
  }
}

export function fallbackForge(ctx: ForgeContext): GameCard {
  const counts: Record<CardType, number> = {
    do: 0,
    speak: 0,
    heart: 0,
    give: 0,
  };
  for (const p of ctx.played) counts[p.type] += 1;
  const preferred =
    (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as CardType) ||
    "speak";

  const missing = FOUR.find((g) => !ctx.unlockedGives.includes(g));
  const useGive = preferred === "give" || ctx.wave >= 2;

  if (useGive && missing) {
    const names: Record<FourGiveKey, string> = {
      confidence: "信心火種",
      joy: "歡喜火花",
      hope: "希望短箋",
      convenience: "方便通道",
    };
    return {
      id: `forge-fb-${Date.now()}`,
      name: names[missing],
      cost: 2,
      type: "give",
      power: 3 + Math.min(1, ctx.wave),
      text: `鍛造卡：強化${TYPE_LABELS.give}，點亮「${missing}」。`,
      fourGive: missing,
      forged: true,
    };
  }

  const table: Record<CardType, { name: string; text: string }> = {
    do: { name: "實作補丁", text: "把破洞補上。造成澄清，偏做好事。" },
    speak: { name: "好話連招", text: "把難聽話翻成能聽的話。" },
    heart: { name: "存心護盾", text: "先護住善意，再處理衝突。" },
    give: { name: "四給碎片", text: "給場面多一點空間。" },
  };

  const t = table[preferred];
  return {
    id: `forge-fb-${Date.now()}`,
    name: t.name,
    cost: 1 + (ctx.wave > 1 ? 1 : 0),
    type: preferred,
    power: 2 + Math.min(2, ctx.wave),
    text: `鍛造卡：${t.text}`,
    forged: true,
  };
}
