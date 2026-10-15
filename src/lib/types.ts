export type PlayerColor = 'w' | 'b';

export type ChatMessage = {
  id: string;
  playerId: string;
  name: string;
  text: string;
  at: number;
};

export type PublicGame = {
  id: string;
  code: string;
  fen: string;
  status: 'waiting' | 'active' | 'finished';
  players: {
    w?: { name: string; connected?: boolean };
    b?: { name: string; connected?: boolean };
  };
  lastMove?: { from: string; to: string };
  chat: ChatMessage[];
  result?: string;
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  /** Server clock. Older snapshots must not replace a newer board. */
  updatedAt?: number;
  /** Time left for each side, already counted down to the moment the server sent it. */
  clock?: { whiteMs: number; blackMs: number };
  /** Time used so far by the match and by each player, counted up to the moment the server sent it. */
  elapsed?: { gameMs: number; whiteMs: number; blackMs: number };
  /** How many moves can still be taken back, up to four. */
  backs?: number;
  /** How many taken-back moves can be played forward again, up to four. */
  forwards?: number;
  undone?: boolean;
};

export type Session = {
  gameId: string;
  playerId: string;
  color: PlayerColor;
  code: string;
  name: string;
};

/** A row on the home list. Player ids stay on this phone. */
export type GameSummary = {
  id: string;
  code: string;
  status: 'waiting' | 'active' | 'finished';
  turn: PlayerColor;
  yourColor: PlayerColor;
  you: string;
  opponent?: string;
  result?: string;
  updatedAt: number;
};

export type RootStackParamList = {
  Home: undefined;
  Join: { code?: string } | undefined;
  Game: { resume?: boolean; gameId?: string } | undefined;
  Themes: undefined;
};
