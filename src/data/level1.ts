export type ScoreKey = "do" | "speak" | "heart";

export type Choice = {
  id: string;
  label: string;
  result: string;
  deltas: Partial<Record<ScoreKey, number>>;
  fourGive?: string;
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
    when: (scores: Record<ScoreKey, number>) => boolean;
    title: string;
    blurb: string;
  }[];
};

export const LEVEL_1: Level = {
  id: "level-1",
  title: "發表會前的搶功風波",
  hook: "明天就是社團成果發表。台上彩排時，同學阿澤把你熬夜做的互動頁講成「我這週趕出來的」。台下有人鼓掌，你的手機震了一下——群組開始洗「阿澤好猛」。",
  steps: [
    {
      id: "step-1",
      narrator: "你握著遙控筆的手有點熱。阿澤還在台上補刀：「細節我之後再調啦。」主持人看向你，問要不要補充。",
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
          fourGive: "給人面子，也給自己台阶",
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
      narrator: "休息室裡，阿澤湊過來小聲說：「剛才太緊張，口誤啦……你不會記恨吧？」群組還在刷截圖。",
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
          fourGive: "給人方便：把事實講清楚",
        },
        {
          id: "c2c",
          label: "「算了沒關係。」轉身就走。",
          result: "表面上和平，但你越想越氣。晚上做夢都在改那頁互動。",
          deltas: { heart: -1, speak: 0 },
        },
      ],
    },
    {
      id: "step-3",
      narrator: "晚上，指導老師在群組問：「互動頁是誰主導的？想請那位明天幫新生分享。」阿澤正在輸入中……又刪掉。",
      prompt: "你要怎麼回這則訊息？",
      choices: [
        {
          id: "c3a",
          label: "直接點名自己，並附上 commit 紀錄截圖。",
          result:
            "老師秒懂。阿澤私下道歉。你贏了名分，也讓全組看清界線——有點刺，但很清楚。",
          deltas: { do: 2, speak: 1, heart: 0 },
          fourGive: "給人信心：用事實說話",
        },
        {
          id: "c3b",
          label: "回：「我跟阿澤一起，明天我們兩人分享，我講互動、他講流程。」",
          result:
            "老師回「很好」。阿澤私訊你一串謝謝貼圖。新生場變成雙人舞台，氣氛意外熱絡。",
          deltas: { speak: 2, do: 1, heart: 2 },
          fourGive: "給人歡喜：把舞台變大",
        },
        {
          id: "c3c",
          label: "已讀不回，看阿澤要怎麼圓。",
          result: "十分鐘後阿澤自己坦白了。你沒出聲，卻在旁觀席吃到一點尷尬的甜點。",
          deltas: { heart: 1, speak: 0, do: 0 },
        },
      ],
    },
  ],
  endings: [
    {
      id: "ending-harmony",
      when: (s) => s.speak + s.do + s.heart >= 6 && s.speak >= 2,
      title: "結局：把火變成燈",
      blurb: "你沒讓場面炸掉，也沒吞下所有委屈。說好話＋把事做清楚，讓團隊還能一起走下一步。",
    },
    {
      id: "ending-justice",
      when: (s) => s.do >= 3 && s.speak < 2,
      title: "結局：真相很響，關係有點裂",
      blurb: "你守住了功勞與界線，但語氣與時機讓有些人站到對面。下次可以一樣清楚，但更暖一點。",
    },
    {
      id: "ending-quiet",
      when: () => true,
      title: "結局：安靜的餘震",
      blurb: "風波表面平息，心裡還有餘震。下次試試：少陰陽、多具體，把「做好事」說出口。",
    },
  ],
};

export const EMPTY_SCORES: Record<ScoreKey, number> = {
  do: 0,
  speak: 0,
  heart: 0,
};

export const SCORE_LABELS: Record<ScoreKey, string> = {
  do: "做好事",
  speak: "說好話",
  heart: "存好心",
};
