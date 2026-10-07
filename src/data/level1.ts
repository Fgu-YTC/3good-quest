export type ScoreKey = "do" | "speak" | "heart";
export type FourGiveKey = "confidence" | "joy" | "hope" | "convenience";

export type Choice = {
  id: string;
  label: string;
  result: string;
  deltas: Partial<Record<ScoreKey, number>>;
  /** 本選項解鎖的四給（可多個，通常 0～1） */
  fourGives?: FourGiveKey[];
};

export type LevelStep = {
  id: string;
  narrator: string;
  prompt: string;
  choices: Choice[];
};

export type Level = {
  id: string;
  title: string;
  hook: string;
  steps: LevelStep[];
  endings: {
    id: string;
    when: (
      scores: Record<ScoreKey, number>,
      gives: Record<FourGiveKey, boolean>,
    ) => boolean;
    title: string;
    blurb: string;
  }[];
};

export const FOUR_GIVE_LABELS: Record<FourGiveKey, string> = {
  confidence: "給人信心",
  joy: "給人歡喜",
  hope: "給人希望",
  convenience: "給人方便",
};

export const FOUR_GIVE_BLURBS: Record<FourGiveKey, string> = {
  confidence: "用事實與肯定，讓人敢走下一步",
  joy: "讓場面變暖，大家笑得出來",
  hope: "不只喊加油，還給得出下一步",
  convenience: "把資訊與流程整理好，少麻煩別人",
};

export const LEVEL_1: Level = {
  id: "level-1",
  title: "發表會前的搶功風波",
  hook: "明天就是社團成果發表。台上彩排時，同學阿澤把你熬夜做的互動頁講成「我這週趕出來的」。台下有人鼓掌，你的手機震了一下——群組開始洗「阿澤好猛」。",
  steps: [
    {
      id: "step-1",
      narrator:
        "你握著遙控筆的手有點熱。阿澤還在台上補刀：「細節我之後再調啦。」主持人看向你，問要不要補充。",
      prompt: "這一秒，你怎麼辦？",
      choices: [
        {
          id: "c1a",
          label: "當場揭穿：「那頁是我做的。」",
          result:
            "現場瞬間安靜。有人起哄，阿澤臉紅到耳根。你出口氣，但群組開始分裂成兩派——戰火延燒到半夜。",
          deltas: { speak: -1, heart: -1, do: 1 },
        },
        {
          id: "c1b",
          label: "微笑補充：「這塊我們一起做，我負責互動、阿澤整合流程。」",
          result:
            "掌聲變得自然一點。阿澤愣了一下，點頭接話。台下有人私訊你：「這樣講很漂亮。」小好比了個讚。",
          deltas: { speak: 2, heart: 1, do: 1 },
          fourGives: ["joy"],
        },
        {
          id: "c1c",
          label: "忍住，什麼都不說，先把發表撐完。",
          result:
            "發表順利結束，但你胸口堵著。回座位時看到阿澤被圍著要聯絡方式，你假裝滑手機。",
          deltas: { heart: 0, speak: 0, do: 0 },
        },
      ],
    },
    {
      id: "step-2",
      narrator:
        "休息室裡，阿澤湊過來小聲說：「剛才太緊張，口誤啦……你不會記恨吧？」群組還在刷截圖。",
      prompt: "你回他什麼？",
      choices: [
        {
          id: "c2a",
          label: "「口誤？你講得好順欸。」陰陽怪氣送他離開。",
          result: "阿澤乾笑兩聲溜走。你爽了三秒，群組又多了「內鬨」標籤。",
          deltas: { speak: -2, heart: -1 },
        },
        {
          id: "c2b",
          label: "「明天簡報署名改清楚，今天先一起把 demo 穩掉。」",
          result:
            "阿澤愣住，然後認真點頭。你們花二十分鐘把貢獻表貼進群組——戰火居然熄了一半。",
          deltas: { do: 2, speak: 1, heart: 1 },
          fourGives: ["convenience"],
        },
        {
          id: "c2c",
          label: "「別慌，我們還有時間修。先列三件今晚要補的。」",
          result:
            "阿澤眼睛亮了一下。你們在白板列出三項待辦，群組怒火變成進度表——空氣鬆了一點。",
          deltas: { heart: 1, speak: 1, do: 1 },
          fourGives: ["hope"],
        },
      ],
    },
    {
      id: "step-3",
      narrator:
        "晚上，指導老師在群組問：「互動頁是誰主導的？想請那位明天幫新生分享。」阿澤正在輸入中……又刪掉。",
      prompt: "你要怎麼回這則訊息？",
      choices: [
        {
          id: "c3a",
          label: "直接點名自己，並附上 commit 紀錄截圖。",
          result:
            "老師秒懂。阿澤私下道歉。你贏了名分，也讓全組看清界線——有點刺，但很清楚。",
          deltas: { do: 2, speak: 1, heart: 0 },
          fourGives: ["confidence"],
        },
        {
          id: "c3b",
          label: "回：「我跟阿澤一起，明天我們兩人分享，我講互動、他講流程。」",
          result:
            "老師回「很好」。阿澤私訊你一串謝謝貼圖。新生場變成雙人舞台，氣氛意外熱絡。",
          deltas: { speak: 2, do: 1, heart: 2 },
          fourGives: ["joy", "confidence"],
        },
        {
          id: "c3c",
          label: "已讀不回，看阿澤要怎麼圓。",
          result:
            "十分鐘後阿澤自己坦白了。你沒出聲，卻在旁觀席吃到一點尷尬的甜點。",
          deltas: { heart: 1, speak: 0, do: 0 },
        },
      ],
    },
  ],
  endings: [
    {
      id: "ending-four-give",
      when: (_s, g) =>
        g.confidence && g.joy && g.hope && g.convenience,
      title: "結局：四給全開",
      blurb:
        "信心、歡喜、希望、方便你都摸到了。這關不只沒炸掉，還把人往前推了一小步——這就是好玩又有用的玩法。",
    },
    {
      id: "ending-harmony",
      when: (s, g) =>
        s.speak + s.do + s.heart >= 6 &&
        s.speak >= 2 &&
        Object.values(g).filter(Boolean).length >= 2,
      title: "結局：把火變成燈",
      blurb:
        "你沒讓場面炸掉，也沒吞下所有委屈。三好加分、四給有亮——團隊還能一起走下一步。",
    },
    {
      id: "ending-justice",
      when: (s) => s.do >= 3 && s.speak < 2,
      title: "結局：真相很響，關係有點裂",
      blurb:
        "你守住了功勞與界線，但四給幾乎沒點亮。下次可以一樣清楚，順便給人一點方便或希望。",
    },
    {
      id: "ending-quiet",
      when: () => true,
      title: "結局：安靜的餘震",
      blurb:
        "風波表面平息。再試一輪：看看能不能點亮「給人希望」或「給人方便」——結局會不一樣。",
    },
  ],
};

export const EMPTY_SCORES: Record<ScoreKey, number> = {
  do: 0,
  speak: 0,
  heart: 0,
};

export const EMPTY_FOUR_GIVES: Record<FourGiveKey, boolean> = {
  confidence: false,
  joy: false,
  hope: false,
  convenience: false,
};

export const SCORE_LABELS: Record<ScoreKey, string> = {
  do: "做好事",
  speak: "說好話",
  heart: "存好心",
};

export const FOUR_GIVE_ORDER: FourGiveKey[] = [
  "confidence",
  "joy",
  "hope",
  "convenience",
];
