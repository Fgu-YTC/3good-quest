import type { FourGiveKey, ScoreKey } from "@/data/level1";

export type CardType = ScoreKey | "give";

export type GameCard = {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  power: number;
  text: string;
  fourGive?: FourGiveKey;
  forged?: boolean;
};

export type Threat = {
  id: string;
  name: string;
  hp: number;
  flavor: string;
  weakTo: CardType[];
};

export const TYPE_LABELS: Record<CardType, string> = {
  do: "做好事",
  speak: "說好話",
  heart: "存好心",
  give: "四給",
};

export const STARTER_DECK: GameCard[] = [
  {
    id: "s1",
    name: "深呼吸",
    cost: 0,
    type: "heart",
    power: 1,
    text: "先把火壓住。造成 1 點澄清。",
  },
  {
    id: "s2",
    name: "說清楚事實",
    cost: 1,
    type: "speak",
    power: 2,
    text: "不陰陽，只講發生什麼。造成 2 點澄清。",
  },
  {
    id: "s3",
    name: "補一刀善意",
    cost: 1,
    type: "do",
    power: 2,
    text: "動手把事情補上。造成 2 點澄清。",
  },
  {
    id: "s4",
    name: "先假設無惡意",
    cost: 1,
    type: "heart",
    power: 2,
    text: "給彼此一個台階下。造成 2 點澄清。",
  },
  {
    id: "s5",
    name: "給人方便清單",
    cost: 2,
    type: "give",
    power: 3,
    text: "把待辦整理好丟出去。造成 3 點澄清，點亮「給人方便」。",
    fourGive: "convenience",
  },
  {
    id: "s6",
    name: "一起上台",
    cost: 2,
    type: "give",
    power: 3,
    text: "把舞台變大。造成 3 點澄清，點亮「給人歡喜」。",
    fourGive: "joy",
  },
  {
    id: "s7",
    name: "溫柔劃界",
    cost: 1,
    type: "speak",
    power: 2,
    text: "講界線，但不放火。造成 2 點澄清。",
  },
  {
    id: "s8",
    name: "下一步希望",
    cost: 2,
    type: "give",
    power: 3,
    text: "給出可執行的一小步。造成 3 點澄清，點亮「給人希望」。",
    fourGive: "hope",
  },
];

export const THREATS: Threat[] = [
  {
    id: "t1",
    name: "搶功風波",
    hp: 8,
    flavor: "台上有人把你的成果講成自己的。澄清值清掉它！",
    weakTo: ["speak", "do"],
  },
  {
    id: "t2",
    name: "群組洗版",
    hp: 10,
    flavor: "截圖與留言開始分裂成兩派。快把火勢壓下去。",
    weakTo: ["speak", "heart"],
  },
  {
    id: "t3",
    name: "陰陽冷戰",
    hp: 12,
    flavor: "沒人撕破臉，但空氣重到能滴水。需要真心與四給。",
    weakTo: ["heart", "give"],
  },
  {
    id: "t4",
    name: "最終誤會怪",
    hp: 14,
    flavor: "所有餘波凝成一隻大誤會。用你築好的牌庫收尾！",
    weakTo: ["do", "give", "speak"],
  },
];

export function cloneStarterDeck(): GameCard[] {
  return STARTER_DECK.map((c, i) => ({
    ...c,
    id: `${c.id}-${i}-${Math.random().toString(36).slice(2, 7)}`,
  }));
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function calcDamage(
  card: GameCard,
  threat: Threat,
): { damage: number; weak: boolean } {
  const weak = threat.weakTo.includes(card.type);
  return { damage: card.power + (weak ? 1 : 0), weak };
}
