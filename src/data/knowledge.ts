export type KnowledgeCard = {
  id: string;
  tags: string[];
  title: string;
  body: string;
  tip: string;
  scoreHint: "do" | "speak" | "heart" | "give";
};

/** 遊戲原創導讀卡：給小好檢索用，非任何外部著作全文 */
export const KNOWLEDGE_CARDS: KnowledgeCard[] = [
  {
    id: "k01",
    tags: ["說好話", "吵架", "群組", "口氣"],
    title: "先把火關掉再說道理",
    body: "對罵很爽三秒，之後聊天室會變戰場。先承認對方情緒，再說事實，比較容易被聽進去。",
    tip: "試著用「我聽到你很急」開頭，而不是「你根本不懂」。",
    scoreHint: "speak",
  },
  {
    id: "k02",
    tags: ["做好事", "幫忙", "搶功", "功勞"],
    title: "功勞可以分，善意比較香",
    body: "被搶功時硬槓不一定贏。把貢獻講清楚、把下一步補上，往往比當下翻臉更有用。",
    tip: "公開場合用事實補一句，私下再談界線。",
    scoreHint: "do",
  },
  {
    id: "k03",
    tags: ["存好心", "誤會", "生氣", "嫉妒"],
    title: "先假設對方不是來害你",
    body: "存好心不是當爛好人，是先把「惡意解讀」暫停三秒，再決定要不要硬剛。",
    tip: "問一句：「你剛剛是不是時間很趕？」常常能改結局。",
    scoreHint: "heart",
  },
  {
    id: "k04",
    tags: ["給人方便", "截止", "壓力", "團隊"],
    title: "方便別人，也是幫未來的自己",
    body: "把檔案整理好、進度講明白，是給隊友方便，也減少自己半夜被@。",
    tip: "丟連結時順便寫「哪頁要改」「幾點前要回」。",
    scoreHint: "give",
  },
  {
    id: "k05",
    tags: ["給人信心", "鼓勵", "失敗", "翻車"],
    title: "一句話就能把人扶起來",
    body: "指出問題前先肯定努力，對方比較願意改，你也比較不像在踩人。",
    tip: "「方向對，細節再修」比「你超爛」有用一百倍。",
    scoreHint: "give",
  },
  {
    id: "k06",
    tags: ["給人歡喜", "幽默", "化解", "氣氛"],
    title: "笑點要暖，不要酸",
    body: "幽默能拆炸彈，但酸話會再埋一顆。好笑的標準是：聽的人也笑得出來。",
    tip: "拿自己開涮可以，拿別人痛處開玩笑就別。",
    scoreHint: "speak",
  },
  {
    id: "k07",
    tags: ["給人希望", "卡關", "放棄", "下一步"],
    title: "別只說加油，給一個下一步",
    body: "希望不是空喊。幫對方拆成「今天能做的一小步」，才算真的給希望。",
    tip: "「先交一頁大綱」比「你一定可以」更落地。",
    scoreHint: "give",
  },
  {
    id: "k08",
    tags: ["道歉", "說好話", "修復"],
    title: "道歉要短、要具體",
    body: "好的道歉講清楚傷到哪、自己會改什麼；別用「可是你也…」把責任踢回去。",
    tip: "一句「剛才用詞太衝，抱歉」常常比長篇辯護有用。",
    scoreHint: "speak",
  },
  {
    id: "k09",
    tags: ["界線", "做好事", "爛好人"],
    title: "做好事也要有邊界",
    body: "幫忙到把自己燃盡，之後會變抱怨機器。能做的說清楚，做不到的也老實講。",
    tip: "「這段我可以，那頁要請你扛」也是一種做好事。",
    scoreHint: "do",
  },
  {
    id: "k10",
    tags: ["謠言", "傳話", "群組"],
    title: "不傳第二手火",
    body: "聽來的版本先核對。轉發怒火很便宜，收拾關係很貴。",
    tip: "不確定就私訊當事人，別先公開開庭。",
    scoreHint: "heart",
  },
];

export function retrieveCards(query: string, limit = 3): KnowledgeCard[] {
  const q = query.toLowerCase();
  const scored = KNOWLEDGE_CARDS.map((card) => {
    let score = 0;
    for (const tag of card.tags) {
      if (q.includes(tag.toLowerCase()) || tag.toLowerCase().includes(q.slice(0, 2))) {
        score += 3;
      }
    }
    if (card.title.includes(query) || card.body.includes(query)) score += 2;
    for (const word of query.split(/\s+/).filter(Boolean)) {
      if (card.body.includes(word) || card.tags.some((t) => t.includes(word))) score += 1;
    }
    return { card, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return KNOWLEDGE_CARDS.slice(0, limit);
  }
  return scored.slice(0, limit).map((x) => x.card);
}
