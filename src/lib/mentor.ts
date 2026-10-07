import { retrieveCards, type KnowledgeCard } from "@/data/knowledge";

export const MENTOR_NAME = "小好";

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

export function fallbackReply(userMessage: string, cards: KnowledgeCard[]): string {
  const top = cards[0];
  const lower = userMessage.toLowerCase();

  if (/死|自殺|不想活|傷害自己/.test(userMessage)) {
    return "這件事很重，我可能接不住全部。請先找信任的人或當地協助資源聊聊；遊戲這邊先陪你把眼前這關慢慢走。";
  }
  if (/氣|怒|幹|火大|受不了/.test(userMessage)) {
    return `火很大很正常。先深呼吸三秒——然後選一個「說得出去、又不會把橋燒掉」的回法。參考：${top.title}。${top.tip}`;
  }
  if (/搶功|功勞|偷/.test(userMessage) || lower.includes("credit")) {
    return `被搶功超不爽。重點不是當場毀滅他，是把事實講清楚、把下一步釘死。${top.tip}`;
  }
  if (/怎麼辦|幫我|該怎/.test(userMessage)) {
    return `別急著一次贏全部。先做最小一步：${top.tip} 選完關卡選項再來找我吐槽也行。`;
  }

  return `${top.body} ——我的建議：${top.tip}`;
}

export function pickCardsForMessage(message: string) {
  return retrieveCards(message, 3);
}
