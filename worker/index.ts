/// <reference types="@cloudflare/workers-types" />

import {DurableObject} from 'cloudflare:workers';
import type {ClientMessage, GameState, Player} from '../src/types';
import {LOOKS_SIGHTINGS, BEHAVIOR_SIGHTINGS, SMELL_SIGHTINGS, OBJECT_SIGHTINGS} from '../src/types';

interface Env {
  ASSETS: Fetcher;
  GAME_ROOM: DurableObjectNamespace;
}

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const createInitialState = (): GameState => ({
  status: 'waiting',
  players: [],
  winner: null,
  roomCode: generateRoomCode(),
  createdAt: Date.now(),
});

const decoder = new TextDecoder();

const broadcastableState = (state: GameState) => ({
  type: 'STATE_UPDATE',
  state,
});

const errorMessage = (message: string) => ({
  type: 'ERROR',
  message,
});

const generateCard = (): string[] => {
  // Balanced distribution: 6 looks, 6 behaviors, 6 smells, 7 objects = 25 total
  const pickRandom = (arr: string[], count: number): string[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };
  
  const card = [
    ...pickRandom(LOOKS_SIGHTINGS, 6),
    ...pickRandom(BEHAVIOR_SIGHTINGS, 6),
    ...pickRandom(SMELL_SIGHTINGS, 6),
    ...pickRandom(OBJECT_SIGHTINGS, 7),
  ];
  
  // Shuffle the combined card so categories aren't grouped
  return card.sort(() => Math.random() - 0.5);
};

const checkBingo = (marked: boolean[]): boolean => {
  for (let row = 0; row < 5; row++) {
    if (marked.slice(row * 5, (row + 1) * 5).every(Boolean)) {
      return true;
    }
  }

  for (let col = 0; col < 5; col++) {
    if ([0, 1, 2, 3, 4].map(idx => marked[col + idx * 5]).every(Boolean)) {
      return true;
    }
  }

  if ([0, 6, 12, 18, 24].map(idx => marked[idx]).every(Boolean)) {
    return true;
  }
  if ([4, 8, 12, 16, 20].map(idx => marked[idx]).every(Boolean)) {
    return true;
  }

  return false;
};

const worker: ExportedHandler<Env> = {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');
    
    // Handle WebSocket connections on /ws path or with Upgrade header
    if (url.pathname.startsWith('/ws') || upgradeHeader?.toLowerCase() === 'websocket') {
      // Extract room code from path like /ws/ABC1
      const pathParts = url.pathname.split('/');
      const roomCode = pathParts[2];
      
      // Require explicit room code - no default room
      if (!roomCode || roomCode.length !== 4) {
        return new Response('Invalid room code', { status: 400 });
      }
      
      const id = env.GAME_ROOM.idFromName(roomCode);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(request);
    }

    // Serve static assets if ASSETS binding is available
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // Fallback for missing ASSETS binding
    return new Response('Not found', { status: 404 });
  },
};

export default worker;

type ConnectionMeta = {
  playerId: string;
};

export class GameRoom extends DurableObject<Env> {
  private connections = new Map<WebSocket, ConnectionMeta>();
  private gameState: GameState = createInitialState();
  private ready: Promise<void> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private ensureReady() {
    if (!this.ready) {
      this.ready = (async () => {
        const stored = await this.ctx.storage.get<GameState>('state');
        if (stored) {
          // Check if room is older than 48 hours (48 * 60 * 60 * 1000 ms)
          const fortyEightHours = 48 * 60 * 60 * 1000;
          const isExpired = Date.now() - stored.createdAt > fortyEightHours;
          
          if (isExpired) {
            // Reset to initial state if expired
            this.gameState = createInitialState();
            await this.ctx.storage.put('state', this.gameState);
          } else {
            this.gameState = stored;
          }
        }
      })();
    }
    return this.ready;
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureReady();

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', {status: 426});
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const playerId = crypto.randomUUID();

    this.ctx.acceptWebSocket(server);
    this.connections.set(server, {playerId});

    server.send(JSON.stringify({type: 'WELCOME', playerId, roomCode: this.gameState.roomCode}));
    server.send(JSON.stringify(broadcastableState(this.gameState)));

    return new Response(null, {status: 101, webSocket: client});
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    await this.ensureReady();

    const connection = this.connections.get(ws);
    if (!connection) return;

    const raw = typeof message === 'string' ? message : decoder.decode(message);

    try {
      const data = JSON.parse(raw) as ClientMessage;
      if (data.type === 'JOIN') {
        await this.handleJoin(connection.playerId, data.name, data.savedPlayerId);
      } else if (data.type === 'START') {
        await this.handleStart();
      } else if (data.type === 'MARK') {
        await this.handleMark(connection.playerId, data.index);
      } else if (data.type === 'REGENERATE_CARD') {
        await this.handleRegenerateCard(connection.playerId);
      } else if (data.type === 'TOGGLE_SEEN') {
        await this.handleToggleSeen(connection.playerId, data.item);
      }
    } catch (error) {
      ws.send(JSON.stringify(errorMessage('Invalid payload')));
    }
  }

  async webSocketClose(ws: WebSocket) {
    await this.ensureReady();

    const connection = this.connections.get(ws);
    this.connections.delete(ws);

    if (!connection) return;

    // During an active game keep the player in state so they can reconnect
    // and resume without losing their card or progress.
    if (this.gameState.status === 'playing' || this.gameState.status === 'ended') {
      return;
    }

    const beforeLength = this.gameState.players.length;
    this.gameState.players = this.gameState.players.filter(p => p.id !== connection.playerId);

    if (beforeLength !== this.gameState.players.length) {
      if (this.gameState.players.length === 0) {
        this.gameState = createInitialState();
        await this.persistState();
      } else {
        await this.persistAndBroadcast();
      }
    }
  }


  private async handleJoin(playerId: string, rawName: string, savedPlayerId?: string) {
    const safeName = (rawName?.trim() || 'Anonymous').slice(0, 12) || 'Anonymous';

    // During an active game, try to reconnect to the player's previous session
    // using the savedPlayerId stored in the client's localStorage.
    if (savedPlayerId && (this.gameState.status === 'playing' || this.gameState.status === 'ended')) {
      const existingPlayer = this.gameState.players.find(p => p.id === savedPlayerId);
      if (existingPlayer) {
        // Remap this new connection to the existing player ID so the client
        // continues to interact with their original card and progress.
        for (const [ws, meta] of this.connections.entries()) {
          if (meta.playerId === playerId) {
            this.connections.set(ws, {playerId: savedPlayerId});
            // Tell the client to use the restored player ID.
            ws.send(JSON.stringify({type: 'WELCOME', playerId: savedPlayerId, roomCode: this.gameState.roomCode}));
            break;
          }
        }
        existingPlayer.name = safeName;
        await this.persistAndBroadcast();
        return;
      }
    }

    let player = this.gameState.players.find(p => p.id === playerId);

    if (!player) {
      player = {
        id: playerId,
        name: safeName,
        card: generateCard(),
        marked: new Array(25).fill(false),
        seen: [], // Don't mark center until game starts
        hasBingo: false,
      } satisfies Player;
      this.gameState.players.push(player);
    } else {
      player.name = safeName;
    }

    await this.persistAndBroadcast();
  }

  private async handleStart() {
    if (this.gameState.status !== 'waiting' && this.gameState.status !== 'ended') {
      return;
    }

    // Store previous status before changing it
    const wasEnded = this.gameState.status === 'ended';
    
    this.gameState.status = 'playing';
    this.gameState.winner = null;

    // Only regenerate cards for players who don't have cards yet or if restarting from ended
    this.gameState.players = this.gameState.players.map(player => {
      // If game was ended, regenerate all cards. Otherwise, only generate for new players without cards
      const shouldRegenerateCard = wasEnded || !player.card || player.card.length === 0;
      
      if (shouldRegenerateCard) {
        const card = generateCard();
        const marked = new Array(25).fill(false);
        marked[12] = true; // Center tile is free
        return {
          ...player,
          card,
          marked,
          seen: [card[12]], // Center tile (index 12) is free
          hasBingo: false,
        };
      }
      
      // Keep existing card but ensure center is marked if not already
      if (!player.marked[12]) {
        player.marked[12] = true;
        if (!player.seen.includes(player.card[12])) {
          player.seen.push(player.card[12]);
        }
      }
      
      return player;
    });

    await this.persistAndBroadcast();
  }

  private async handleMark(playerId: string, index: number) {
    if (this.gameState.status !== 'playing') {
      return;
    }

    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return;

    player.marked[index] = true;

    if (checkBingo(player.marked)) {
      player.hasBingo = true;
      this.gameState.winner = player.name;
      this.gameState.status = 'ended';
    }

    await this.persistAndBroadcast();
  }

  private async handleRegenerateCard(playerId: string) {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Only allow regeneration during waiting or playing status
    if (this.gameState.status !== 'waiting' && this.gameState.status !== 'playing') {
      return;
    }

    // Generate new card and reset marked items
    const card = generateCard();
    const marked = new Array(25).fill(false);
    marked[12] = true; // Center tile is free
    player.card = card;
    player.marked = marked;
    player.seen = [card[12]]; // Center tile (index 12) is free
    player.hasBingo = false;

    await this.persistAndBroadcast();
  }

  private async handleToggleSeen(playerId: string, item: string) {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Toggle the item in the seen array
    const seenIndex = player.seen.indexOf(item);
    if (seenIndex >= 0) {
      // Item is already seen, remove it (mark as unseen)
      player.seen.splice(seenIndex, 1);
    } else {
      // Item is not seen, add it
      player.seen.push(item);
    }

    // Update marked array for bingo detection (only items on their card that are seen)
    player.marked = player.card.map(cardItem => player.seen.includes(cardItem));

    // Check for bingo
    if (checkBingo(player.marked)) {
      player.hasBingo = true;
      this.gameState.winner = player.name;
      this.gameState.status = 'ended';
    }

    await this.persistAndBroadcast();
  }

  private async persistState() {
    await this.ctx.storage.put('state', this.gameState);
  }

  private async persistAndBroadcast() {
    await this.persistState();
    this.broadcastState();
  }

  private broadcastState() {
    if (this.connections.size === 0) return;

    const payload = JSON.stringify(broadcastableState(this.gameState));
    for (const ws of this.connections.keys()) {
      try {
        ws.send(payload);
      } catch (error) {
        console.error('Failed to broadcast state', error);
      }
    }
  }
}
