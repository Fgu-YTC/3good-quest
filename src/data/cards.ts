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
  /** 戰場用短標籤，少敘事 */
  tag: string;
  icon: string;
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
    text: "澄清 1",
  },
  {
    id: "s2",
    name: "講清楚",
    cost: 1,
    type: "speak",
    power: 2,
    text: "澄清 2",
  },
  {
    id: "s3",
    name: "補上缺口",
    cost: 1,
    type: "do",
    power: 2,
    text: "澄清 2",
  },
  {
    id: "s4",
    name: "先不惡意",
    cost: 1,
    type: "heart",
    power: 2,
    text: "澄清 2",
  },
  {
    id: "s5",
    name: "方便清單",
    cost: 2,
    type: "give",
    power: 3,
    text: "澄清 3 · 方便",
    fourGive: "convenience",
  },
  {
    id: "s6",
    name: "一起上台",
    cost: 2,
    type: "give",
    power: 3,
    text: "澄清 3 · 歡喜",
    fourGive: "joy",
  },
  {
    id: "s7",
    name: "溫柔劃界",
    cost: 1,
    type: "speak",
    power: 2,
    text: "澄清 2",
  },
  {
    id: "s8",
    name: "下一步",
    cost: 2,
    type: "give",
    power: 3,
    text: "澄清 3 · 希望",
    fourGive: "hope",
  },
];

export const THREATS: Threat[] = [
  {
    id: "t1",
    name: "搶功風波",
    hp: 8,
    flavor: "成果被講成別人的",
    tag: "WAVE 1",
    icon: "搶",
    weakTo: ["speak", "do"],
  },
  {
    id: "t2",
    name: "群組洗版",
    hp: 10,
    flavor: "留言分裂成兩派",
    tag: "WAVE 2",
    icon: "洗",
    weakTo: ["speak", "heart"],
  },
  {
    id: "t3",
    name: "陰陽冷戰",
    hp: 12,
    flavor: "沒撕破臉但很重",
    tag: "WAVE 3",
    icon: "冷",
    weakTo: ["heart", "give"],
  },
  {
    id: "t4",
    name: "誤會巨獸",
    hp: 14,
    flavor: "Boss",
    tag: "BOSS",
    icon: "誤",
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
