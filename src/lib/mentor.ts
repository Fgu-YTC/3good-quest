import { retrieveCards, type KnowledgeCard } from "@/data/knowledge";

export const MENTOR_NAME = "小好";

export type ChoiceOption = { id: string; label: string };

export function buildSystemPrompt(cards: KnowledgeCard[]): string {
  const cardText = cards
    .map((c) => `【${c.title}】${c.body} 小提示：${c.tip}`)
    .join("\n");

  return [
    `你是《三好關卡》裡的遊戲夥伴「${MENTOR_NAME}」。`,
    "個性：簡短、溫暖、偶爾幽默，像靠譜隊友，不是講師。",
    "目標：幫玩家把當下麻煩拆成可選的下一步，呼應三好（做好事、說好話、存好心）與四給（信心、歡喜、希望、方便）。",
    "規則：",
    "- 回覆繁體中文，2～5 句，不要長篇說教。",
    "- 不要自稱大師、法師或任何真人宗教領袖。",
    "- 不提供醫療、法律、投資建議；遇到自傷／危急請溫柔建議尋求現實協助。",
    "- 可以吐槽局面，但語氣要「說好話」。",
    "- 優先參考下列遊戲原創提示卡；沒有對應就給一般性鼓勵並拉回關卡選擇。",
    "",
    "提示卡：",
    cardText,
  ].join("\n");
}

export function buildCounselPrompt(
  cards: KnowledgeCard[],
  choices: ChoiceOption[],
): string {
  const list = choices.map((c) => `- ${c.id}: ${c.label}`).join("\n");
  return [
    buildSystemPrompt(cards),
    "",
    "本回合你是「關卡軍師」：玩家必須聽你建議後才能選行動。",
    "請只輸出一段 JSON（不要 markdown）：",
    '{"advice":"給玩家的短建議（2～4句）","recommendId":"上方選項的id","why":"一句話為何推這個"}',
    "recommendId 必須是下列 id 之一：",
    list,
    "優先推薦較能兼顧說好話／做好事／存好心，或能點亮四給的選項；若玩家明顯想硬剛，也可推薦較衝的選項但要提醒代價。",
  ].join("\n");
}

export function buildReflectPrompt(cards: KnowledgeCard[]): string {
  return [
    buildSystemPrompt(cards),
    "",
    "本回合你是「結算旁白」：根據玩家本關的三好分數、四給解鎖與選擇摘要，用 3～5 句繁中做個人化短評。",
    "要好玩、具體，點出他哪一步最亮眼或最翻車；可提三好／四給，但不要說教。",
    "只輸出純文字，不要 JSON、不要標題。",
  ].join("\n");
}

export function fallbackReply(userMessage: string, cards: KnowledgeCard[]): string {
  const top = cards[0];

  if (/死|自殺|不想活|傷害自己/.test(userMessage)) {
    return "這件事很重，我可能接不住全部。請先找信任的人或當地協助資源聊聊；遊戲這邊先陪你把眼前這關慢慢走。";
  }
  if (/氣|怒|幹|火大|受不了/.test(userMessage)) {
    return `火很大很正常。先深呼吸三秒——然後選一個「說得出去、又不會把橋燒掉」的回法。參考：${top.title}。${top.tip}`;
  }
  if (/搶功|功勞|偷/.test(userMessage)) {
    return `被搶功超不爽。重點不是當場毀滅他，是把事實講清楚、把下一步釘死。${top.tip}`;
  }
  if (/怎麼辦|幫我|該怎/.test(userMessage)) {
    return `別急著一次贏全部。先做最小一步：${top.tip}`;
  }

  return `${top.body} ——我的建議：${top.tip}`;
}

export function fallbackCounsel(
  userMessage: string,
  cards: KnowledgeCard[],
  choices: ChoiceOption[],
): { advice: string; recommendId: string; why: string } {
  const soft = choices.find((c) =>
    /一起|微笑|方便|列|兩人|分享|補充/.test(c.label),
  );
  const hard = choices.find((c) => /揭穿|陰陽|已讀|點名/.test(c.label));
  const wantFight = /揭穿|幹掉|嗆|撕破|不爽|火大|報仇/.test(userMessage);
  const pick = (wantFight ? hard : soft) ?? soft ?? choices[0];

  return {
    advice: fallbackReply(userMessage, cards),
    recommendId: pick.id,
    why: wantFight
      ? "你火氣很大，這個選項最接近你的直覺——但代價也大。"
      : "這個選項比較容易同時顧到場面與後續合作。",
  };
}

export function fallbackReflect(summary: string): string {
  return `這關你這樣走下來：${summary.slice(0, 80)}${summary.length > 80 ? "…" : ""}。下次若想四給全開，記得「說清楚」之外，也留一點希望或方便給對方。小好隨時在。`;
}

export function pickCardsForMessage(message: string) {
  return retrieveCards(message, 3);
}

export function parseCounselJson(
  raw: string,
  choices: ChoiceOption[],
): { advice: string; recommendId: string; why: string } | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const data = JSON.parse(raw.slice(start, end + 1)) as {
      advice?: string;
      recommendId?: string;
      why?: string;
    };
    if (!data.advice || !data.recommendId) return null;
    if (!choices.some((c) => c.id === data.recommendId)) return null;
    return {
      advice: data.advice.trim(),
      recommendId: data.recommendId,
      why: (data.why ?? "").trim() || "我覺得這步比較穩。",
    };
  } catch {
    return null;
  }
}
