export type Player = {
  id: string;
  name: string;
  card: string[]; // 25 items
  marked: boolean[]; // 25 booleans
  hasBingo: boolean;
};

export type GameState = {
  status: 'waiting' | 'playing' | 'ended';
  players: Player[];
  calledItems: string[];
  winner: string | null;
  nextCallTime: number | null;
};

export type ClientMessage =
  | { type: 'JOIN'; name: string }
  | { type: 'MARK'; index: number }
  | { type: 'START' };

export type ServerMessage =
  | { type: 'STATE_UPDATE'; state: GameState }
  | { type: 'ERROR'; message: string }
  | { type: 'WELCOME'; playerId: string };

export const SIGHTINGS = [
  "A passenger who is clearly a time traveler",
  "The sound of a dial-up modem over the intercom",
  "A gate that wasn't there yesterday",
  "Luggage wrapped in tinfoil",
  "A pilot reading 'How to Fly for Dummies'",
  "Security scanning a ghost",
  "A flight listed as 'Departing Yesterday'",
  "Vending machine selling hopes and dreams",
  "Carpet pattern that moves when you look away",
  "A child speaking Latin backwards",
  "Someone paying with gold doubloons",
  "A service dog that is actually a wolf",
  "The smell of ozone and old books",
  "An escalator going to nowhere",
  "A TSA agent with three eyes",
  "Announcement for a flight to Atlantis",
  "Passenger vanishing into the duty-free shop",
  "Shadows detaching from their owners",
  "Clock hands moving counter-clockwise",
  "A suitcase leaking glowing green fluid",
  "Someone wearing a spacesuit casually",
  "Flight number 666 to Helheim",
  "A bird that speaks human",
  "The infinite hallway",
  "A window showing a different weather than outside",
  "A janitor mopping up stardust",
  "Someone arguing with a reflection",
  "Ticket printed on papyrus",
  "Announcement in a dead language",
  "Unattended baggage that is vibrating",
  "Pilot who looks exactly like you",
  "Flight to a city that doesn't exist",
  "Vending machine dispensing ancient coins",
  "Bird flying indoors that glows",
  "Someone reading a newspaper from 1920",
  "A cat wearing a tiny pilot hat",
  "Luggage carousel going backwards",
  "Announcement: 'Please do not feed the void'",
  "Passenger with a translucent hand",
  "Security check for 'soul purity'",
  "Flight delayed due to 'temporal anomaly'",
  "Someone telepathically ordering coffee",
  "A suitcase that growls",
  "Gate agent levitating slightly",
  "Passenger with a third arm",
  "Announcement: 'Boarding for the Astral Plane'",
  "Someone paying with a soul gem",
  "A dog that barks in binary",
  "The exit sign points to a wall",
  "A clock with 13 hours"
];
