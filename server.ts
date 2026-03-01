import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { GameState, Player, SIGHTINGS, ClientMessage, ServerMessage } from "./src/types";

const PORT = 3000;

// Game State
let gameState: GameState = {
  status: 'waiting',
  players: [],
  calledItems: [],
  winner: null,
  nextCallTime: null,
};

// Helper to broadcast state
const broadcastState = (wss: WebSocketServer) => {
  const message = JSON.stringify({ type: 'STATE_UPDATE', state: gameState });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Helper to generate a Bingo card
const generateCard = (): string[] => {
  const shuffled = [...SIGHTINGS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 25);
};

// Helper to check for Bingo
const checkBingo = (marked: boolean[]): boolean => {
  // Rows
  for (let i = 0; i < 5; i++) {
    if (marked.slice(i * 5, (i + 1) * 5).every(Boolean)) return true;
  }
  // Columns
  for (let i = 0; i < 5; i++) {
    if ([0, 1, 2, 3, 4].map(j => marked[i + j * 5]).every(Boolean)) return true;
  }
  // Diagonals
  if ([0, 6, 12, 18, 24].map(i => marked[i]).every(Boolean)) return true;
  if ([4, 8, 12, 16, 20].map(i => marked[i]).every(Boolean)) return true;

  return false;
};

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Game Loop
  setInterval(() => {
    if (gameState.status === 'playing') {
      // Check if we need to call a new item
      if (!gameState.nextCallTime || Date.now() >= gameState.nextCallTime) {
        // Pick a new item that hasn't been called yet
        const availableItems = SIGHTINGS.filter(item => !gameState.calledItems.includes(item));
        
        if (availableItems.length === 0) {
          // No more items! End game? Or just stop calling.
          gameState.status = 'ended';
          broadcastState(wss);
          return;
        }

        const nextItem = availableItems[Math.floor(Math.random() * availableItems.length)];
        gameState.calledItems.push(nextItem);
        gameState.nextCallTime = Date.now() + 5000; // New item every 5 seconds

        broadcastState(wss);
      }
    }
  }, 1000);

  wss.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substring(7);
    let playerIndex = -1;

    console.log(`Player connected: ${playerId}`);

    ws.send(JSON.stringify({ type: 'WELCOME', playerId }));
    ws.send(JSON.stringify({ type: 'STATE_UPDATE', state: gameState }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString()) as ClientMessage;

        if (data.type === 'JOIN') {
          const newPlayer: Player = {
            id: playerId,
            name: data.name.substring(0, 12) || 'Anonymous', // Limit name length
            card: generateCard(),
            marked: new Array(25).fill(false),
            hasBingo: false,
          };
          gameState.players.push(newPlayer);
          playerIndex = gameState.players.findIndex(p => p.id === playerId);
          broadcastState(wss);
        } else if (data.type === 'START') {
          if (gameState.status === 'waiting' || gameState.status === 'ended') {
            gameState.status = 'playing';
            gameState.calledItems = [];
            gameState.winner = null;
            gameState.nextCallTime = Date.now() + 3000; // Start in 3s
            // Reset all players
            gameState.players.forEach(p => {
              p.card = generateCard();
              p.marked = new Array(25).fill(false);
              p.hasBingo = false;
            });
            broadcastState(wss);
          }
        } else if (data.type === 'MARK') {
          if (gameState.status !== 'playing') return;
          
          const player = gameState.players.find(p => p.id === playerId);
          if (!player) return;

          const item = player.card[data.index];
          // Only allow marking if the item has been called
          if (gameState.calledItems.includes(item)) {
            player.marked[data.index] = true;
            
            if (checkBingo(player.marked)) {
              player.hasBingo = true;
              gameState.winner = player.name;
              gameState.status = 'ended';
            }
            broadcastState(wss);
          }
        }
      } catch (e) {
        console.error('Error processing message:', e);
      }
    });

    ws.on('close', () => {
      console.log(`Player disconnected: ${playerId}`);
      gameState.players = gameState.players.filter(p => p.id !== playerId);
      if (gameState.players.length === 0) {
        gameState.status = 'waiting';
        gameState.calledItems = [];
        gameState.winner = null;
      }
      broadcastState(wss);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving (if needed, though this is dev env)
    app.use(express.static('dist'));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
