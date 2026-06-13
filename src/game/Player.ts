import { Card } from "./Card";

export type PlayerType = "human" | "npc";
export type NPCPersonality = "greg" | "mabel" | "carl";

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  personality?: NPCPersonality;
  hand: Card[];
  calledRoshambo: boolean;
  seatIndex: number; // 0=bottom(human), 1=top, 2=left/right
}

export function createHumanPlayer(): Player {
  return {
    id: "human",
    name: "You",
    type: "human",
    hand: [],
    calledRoshambo: false,
    seatIndex: 0,
  };
}

export function createNPCPlayer(
  name: string,
  personality: NPCPersonality,
  seatIndex: number
): Player {
  return {
    id: `npc-${name.toLowerCase().replace(/\s/g, "-")}`,
    name,
    type: "npc",
    personality,
    hand: [],
    calledRoshambo: false,
    seatIndex,
  };
}
