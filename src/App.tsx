/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { GameState, ClientMessage, ServerMessage } from './types';
import { Lobby } from './components/Lobby';
import { BingoCard } from './components/BingoCard';
import { GameLog } from './components/GameLog';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);

    socket.onopen = () => {
      console.log('Connected to server');
      setError(null);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === 'STATE_UPDATE') {
          setGameState(message.state);
        } else if (message.type === 'WELCOME') {
          setPlayerId(message.playerId);
        } else if (message.type === 'ERROR') {
          setError(message.message);
        }
      } catch (e) {
        console.error('Failed to parse message', e);
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from server');
      setError('Connection lost. Reconnecting...');
      // Simple reconnect logic could go here, but for now just show error
    };

    ws.current = socket;

    return () => {
      socket.close();
    };
  }, []);

  const handleJoin = (name: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'JOIN', name }));
    }
  };

  const handleStart = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'START' }));
    }
  };

  const handleMark = (index: number) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'MARK', index }));
    }
  };

  if (!gameState || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900 text-zinc-100">
        <div className="animate-pulse text-emerald-500 font-mono">INITIALIZING TERMINAL CONNECTION...</div>
      </div>
    );
  }

  const player = gameState.players.find(p => p.id === playerId);
  const isJoined = !!player;

  if (!isJoined) {
    return <Lobby onJoin={handleJoin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 font-mono flex flex-col">
      {/* Header */}
      <header className="bg-zinc-800 border-b border-zinc-700 p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-emerald-400 tracking-tighter hidden sm:block">TERMINAL 0</h1>
          <div className="bg-zinc-900 px-3 py-1 rounded border border-zinc-700 text-xs">
            STATUS: <span className={gameState.status === 'playing' ? 'text-emerald-400 animate-pulse' : 'text-yellow-500'}>{gameState.status.toUpperCase()}</span>
          </div>
          <div className="text-xs text-zinc-500">
            PLAYERS: {gameState.players.length}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Passenger</div>
            <div className="font-bold text-emerald-100">{player.name}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col-reverse md:flex-row">
        {/* Left Panel: Game Log & Info */}
        <div className="w-full md:w-1/3 lg:w-1/4 bg-zinc-800/50 border-t md:border-t-0 md:border-r border-zinc-700 p-2 sm:p-4 flex flex-col space-y-2 sm:space-y-4 overflow-y-auto max-h-[40vh] md:max-h-full">
          <div className="bg-zinc-900 p-3 sm:p-4 rounded border border-zinc-700">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Mission Control</h2>
            {gameState.status === 'waiting' || gameState.status === 'ended' ? (
              <button
                onClick={handleStart}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-900 font-bold py-2 px-4 rounded transition-colors uppercase tracking-wide text-xs sm:text-sm"
              >
                {gameState.status === 'ended' ? 'Re-Initialize Sequence' : 'Initiate Sequence'}
              </button>
            ) : (
              <div className="text-center text-zinc-400 text-sm py-2">
                Scanning for anomalies...
              </div>
            )}
          </div>

          <GameLog calledItems={gameState.calledItems} />

          <div className="bg-zinc-900 p-3 sm:p-4 rounded border border-zinc-700 flex-1 min-h-[100px]">
             <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Manifest</h2>
             <ul className="space-y-2">
                {gameState.players.map(p => (
                  <li key={p.id} className={`flex justify-between items-center text-xs sm:text-sm ${p.id === playerId ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    <span className="truncate max-w-[120px]">{p.name} {p.id === playerId && '(YOU)'}</span>
                    {p.hasBingo && <span className="text-yellow-400 font-bold text-[10px] bg-yellow-400/10 px-1.5 py-0.5 rounded">BINGO</span>}
                  </li>
                ))}
             </ul>
          </div>
        </div>

        {/* Right Panel: Bingo Card */}
        <div className="flex-1 p-2 sm:p-4 md:p-8 flex items-start md:items-center justify-center bg-zinc-900 relative overflow-y-auto">
          <div className="w-full max-w-2xl">
            <BingoCard
              card={player.card}
              marked={player.marked}
              calledItems={gameState.calledItems}
              onMark={handleMark}
              disabled={gameState.status !== 'playing' || player.hasBingo}
            />
          </div>
          
          {/* Winner Overlay */}
          <AnimatePresence>
            {gameState.winner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-zinc-800 border-2 border-emerald-500 p-6 sm:p-8 rounded-lg shadow-2xl max-w-md text-center w-full"
                >
                  <h2 className="text-2xl sm:text-4xl font-bold text-emerald-400 mb-2 tracking-tighter">SEQUENCE COMPLETE</h2>
                  <p className="text-zinc-300 mb-6 text-sm sm:text-base">
                    Passenger <span className="text-white font-bold">{gameState.winner}</span> has successfully identified the pattern.
                  </p>
                  <button
                    onClick={handleStart}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-900 font-bold py-3 px-6 rounded transition-colors uppercase tracking-wide text-sm"
                  >
                    Reset Simulation
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800 p-2 text-center text-[10px] text-zinc-600 uppercase tracking-widest">
        Terminal 0 // Secure Connection // v1.0.0
      </footer>
    </div>
  );
}

