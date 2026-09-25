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
};

export type Session = {
  gameId: string;
  playerId: string;
  color: PlayerColor;
  code: string;
  name: string;
};

export type RootStackParamList = {
  Home: undefined;
  Join: undefined;
  Game: { resume?: boolean } | undefined;
  Themes: undefined;
};
