import type { Choice, FourGiveKey, ScoreKey } from "@/data/level1";
import { retrieveCards } from "@/data/knowledge";

export type ChatBubble = { name: string; text: string };

export type DirectResult = {
  headline: string;
  result: string;
  deltas: Partial<Record<ScoreKey, number>>;
  fourGives: FourGiveKey[];
  groupChat: ChatBubble[];
  verdict: string;
};

const FOUR: FourGiveKey[] = [
  "confidence",
  "joy",
  "hope",
  "convenience",
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function buildDirectPrompt(choices: Choice[]): string {
  const anchors = choices
    .map(
      (c) =>
        `- ${c.id}:「${c.label}」參考後果：${c.result}｜分數傾向 ${JSON.stringify(c.deltas)}｜四給 ${JSON.stringify(c.fourGives ?? [])}`,
    )
    .join("\n");

  return [
    "你是《三好關卡》的「爆點導演」，不是聊天機器人。",
    "玩家會寫下自己當下要說的話或要做的行動；你負責演出後果。",
    "規則：",
    "- 只輸出一段 JSON（不要 markdown、不要解釋）。",
    '- 格式：{"headline":"八字內標題","result":"2～4句現場後果","deltas":{"do":0,"speak":0,"heart":0},"fourGives":[],"groupChat":[{"name":"角色名","text":"一句話"}],"verdict":"一句導演評語"}',
    "- deltas 整數，範圍 -2～2；沒變動的維度可省略或填 0。",
    '- fourGives 只能從 "confidence","joy","hope","convenience" 選，可空陣列；只有玩家言行真正體現時才給。',
    "- groupChat 2～4 則，像群組/現場旁人反應，語氣自然、可好笑，不要說教。",
    "- 繁體中文；不要提任何真人宗教領袖名稱。",
    "- 可參考下列錨點（分數與四給請靠近合理錨點，但後果文案必須依玩家原文客製，禁止整段複製錨點）：",
    anchors,
  ].join("\n");
}

export function parseDirectJson(raw: string): DirectResult | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const data = JSON.parse(raw.slice(start, end + 1)) as Partial<DirectResult>;
    if (!data.headline || !data.result) return null;

    const deltas: Partial<Record<ScoreKey, number>> = {};
    for (const k of ["do", "speak", "heart"] as ScoreKey[]) {
      const v = data.deltas?.[k];
      if (typeof v === "number" && Number.isFinite(v)) {
        deltas[k] = clamp(Math.round(v), -2, 2);
      }
    }

    const fourGives = (data.fourGives ?? []).filter((g): g is FourGiveKey =>
      FOUR.includes(g as FourGiveKey),
    );

    const groupChat = (data.groupChat ?? [])
      .filter((b) => b && typeof b.name === "string" && typeof b.text === "string")
      .slice(0, 4)
      .map((b) => ({ name: b.name.slice(0, 12), text: b.text.slice(0, 80) }));

    return {
      headline: String(data.headline).slice(0, 20),
      result: String(data.result).slice(0, 400),
      deltas,
      fourGives,
      groupChat:
        groupChat.length > 0
          ? groupChat
          : [{ name: "路人", text: "……場面一度安靜。" }],
      verdict: String(data.verdict ?? "導演記下這一幕。").slice(0, 80),
    };
  } catch {
    return null;
  }
}

function pickAnchor(playerText: string, choices: Choice[]): Choice {
  const t = playerText;
  const scored = choices.map((c) => {
    let s = 0;
    if (/揭穿|搶功|是我|明明|幹|嗆|陰陽/.test(t) && /揭穿|陰陽|點名/.test(c.label))
      s += 3;
    if (/一起|我們|補充|分享|兩人|沒關係|先/.test(t) && /一起|補充|兩人|列|署名/.test(c.label))
      s += 3;
    if (/忍|算了|不說|已讀|撐完/.test(t) && /忍|算了|已讀/.test(c.label))
      s += 3;
    if (/方便|整理|清單|待辦|demo/.test(t) && /demo|署名|列/.test(c.label))
      s += 2;
    if (/希望|別慌|還有時間|加油/.test(t) && /別慌|列/.test(c.label)) s += 2;
    return { c, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0]!.c;
}

export function fallbackDirect(
  playerText: string,
  choices: Choice[],
): DirectResult {
  const anchor = pickAnchor(playerText, choices);
  const cards = retrieveCards(playerText, 1);
  const tip = cards[0]?.tip ?? "先把下一句話說清楚。";

  return {
    headline: "場面被你帶歪了？",
    result: `${anchor.result}（導演依你的原文「${playerText.slice(0, 24)}${playerText.length > 24 ? "…" : ""}」微調氣氛。）`,
    deltas: { ...anchor.deltas },
    fourGives: [...(anchor.fourGives ?? [])],
    groupChat: [
      { name: "阿澤", text: /揭穿|陰陽|點名/.test(playerText) ? "……好啦我知道了。" : "謝啦，我剛剛太衝。" },
      { name: "群組", text: /一起|我們|分享/.test(playerText) ? "這波處理得挺漂亮。" : "等等，發生什麼？" },
      { name: "導演旁白", text: tip },
    ],
    verdict: "快速導演模式：後果已套用最接近的劇本錨點。",
  };
}
