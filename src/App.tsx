/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { GameState, ClientMessage, ServerMessage } from './types';
import { RoomSelector } from './components/RoomSelector';
import { Lobby } from './components/Lobby';
import { BingoCard } from './components/BingoCard';
import { GameLog } from './components/GameLog';
import { ConfirmModal } from './components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const hasAutoJoined = useRef(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Get room code from URL hash (e.g., #ABC1)
    const urlRoomCode = window.location.hash.slice(1);

    // If no room code, don't connect yet - show room selection UI
    if (!urlRoomCode || urlRoomCode.length !== 4) {
      return;
    }

    // Set room code from URL immediately - this is the source of truth
    setRoomCode(urlRoomCode);

    const connect = () => {
      if (!isMounted.current) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const socket = new WebSocket(`${protocol}//${host}/ws/${urlRoomCode}`);
      ws.current = socket;

      socket.onopen = () => {
        if (!isMounted.current) return;
        console.log('Connected to server');
        reconnectAttempts.current = 0;
        setError(null);
      };

      socket.onmessage = (event) => {
        if (!isMounted.current) return;
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          if (message.type === 'STATE_UPDATE') {
            setGameState(message.state);
          } else if (message.type === 'WELCOME') {
            setPlayerId(message.playerId);
            // Room code already set from URL - don't override it

            // Auto-join with saved name if available and not already joined this session
            if (!hasAutoJoined.current) {
              const savedName = localStorage.getItem(`terminal0_player_name_${urlRoomCode}`);
              if (savedName) {
                hasAutoJoined.current = true;
                // Include the previously-stored player ID so the server can
                // restore our card rather than generating a brand-new one.
                const savedPlayerId = localStorage.getItem(`terminal0_player_id_${urlRoomCode}`);
                setTimeout(() => {
                  if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                      type: 'JOIN',
                      name: savedName,
                      ...(savedPlayerId ? { savedPlayerId } : {}),
                    }));
                  }
                }, 100);
              }
            }

            // Persist the authoritative player ID returned by the server.
            // On a reconnect the server may reply with our OLD id (after session
            // restore), so we always overwrite with whatever the server says.
            localStorage.setItem(`terminal0_player_id_${urlRoomCode}`, message.playerId);
          } else if (message.type === 'ERROR') {
            setError(message.message);
          }
        } catch (e) {
          console.error('Failed to parse message', e);
        }
      };

      socket.onclose = () => {
        if (!isMounted.current) return;
        console.log('Disconnected from server');

        // Exponential backoff: 1s, 2s, 4s, 8s, cap at 16s
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 16000);
        reconnectAttempts.current += 1;

        setError(`Connection lost. Reconnecting in ${Math.round(delay / 1000)}s…`);

        // Allow auto-join to fire again on the next connection so the player
        // seamlessly re-enters the game.
        hasAutoJoined.current = false;

        reconnectTimeout.current = setTimeout(() => {
          if (isMounted.current) {
            connect();
          }
        }, delay);
      };
    };

    connect();

    return () => {
      isMounted.current = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      ws.current?.close();
    };
  }, []);

  const handleJoin = (name: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Save name (and current playerId if we have one) so we can restore
      // the session on reconnect / page refresh.
      if (roomCode) {
        localStorage.setItem(`terminal0_player_name_${roomCode}`, name);
        if (playerId) {
          localStorage.setItem(`terminal0_player_id_${roomCode}`, playerId);
        }
      }
      ws.current.send(JSON.stringify({ type: 'JOIN', name }));
    }
  };

  const handleStart = () => {
    console.log('handleStart called', { 
      hasWs: !!ws.current, 
      readyState: ws.current?.readyState,
      OPEN: WebSocket.OPEN 
    });
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log('Sending START message');
      ws.current.send(JSON.stringify({ type: 'START' }));
    } else {
      console.error('WebSocket not ready', ws.current?.readyState);
    }
  };

  const handleMark = (index: number) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'MARK', index }));
    }
  };

  const handleToggleSeen = (item: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'TOGGLE_SEEN', item }));
    }
  };

  const handleRegenerateCard = () => {
    setShowNewCardModal(true);
  };

  const confirmRegenerateCard = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'REGENERATE_CARD' }));
    }
    setShowNewCardModal(false);
  };

  const handleCreateRoom = () => {
    // Generate a new 4-character room code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    // Set the hash and reload to connect
    window.location.hash = code;
    window.location.reload();
  };

  const handleJoinRoom = (code: string) => {
    // Set the hash and reload to connect
    window.location.hash = code;
    window.location.reload();
  };

  const handleShareRoom = async () => {
    const shareUrl = window.location.href;
    
    // Try to use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Terminal 0 Bingo',
          text: `Join my Terminal 0 Bingo game! Room code: ${roomCode}`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if (err instanceof Error && err.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      // Fallback to clipboard
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert(`Share this link: ${text}`);
    });
  };

  // Show room selector if no valid room code in URL
  const urlRoomCode = window.location.hash.slice(1);
  if (!urlRoomCode || urlRoomCode.length !== 4) {
    return <RoomSelector onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
  }

  if (!gameState || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
        <div className="animate-pulse text-white font-bold text-xl">Loading...</div>
      </div>
    );
  }

  const player = gameState.players.find(p => p.id === playerId);
  const isJoined = !!player;

  if (!isJoined) {
    return <Lobby onJoin={handleJoin} />;
  }

  // Don't show cards until game has started (status is 'playing')
  const showCards = gameState.status === 'playing' || gameState.status === 'ended';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex flex-col">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hidden sm:block">Terminal 0 Bingo</h1>
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1.5 rounded-full text-xs font-semibold">
            <span className={gameState.status === 'playing' ? 'text-purple-700 animate-pulse' : 'text-pink-700'}>{gameState.status === 'playing' ? '🎮 Playing' : gameState.status === 'waiting' ? '⏳ Waiting' : '🏆 Ended'}</span>
          </div>
          <div className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
            👥 {gameState.players.length}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {roomCode && (
            <div className="text-right">
              <div className="text-xs text-gray-500 font-medium">Room</div>
              <div className="flex items-center space-x-2">
                <div className="font-bold text-purple-600 text-lg">{roomCode}</div>
                <button
                  onClick={handleShareRoom}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                  title="Share room link"
                >
                  Share
                </button>
              </div>
            </div>
          )}
          <div className="text-right">
            <div className="text-xs text-gray-500 font-medium">Player</div>
            <div className="font-bold text-gray-800">{player.name}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col-reverse md:flex-row">
        {/* Left Panel: Game Log & Info */}
        <div className="w-full md:w-1/3 lg:w-1/4 bg-white/90 backdrop-blur-sm p-3 sm:p-4 flex flex-col space-y-3 overflow-y-auto max-h-[40vh] md:max-h-full">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 rounded-2xl shadow-md space-y-2">
            <h2 className="text-sm font-bold text-purple-700 mb-2">🎮 Game Controls</h2>
            {(gameState.status === 'waiting' || gameState.status === 'ended') && (
              <button
                onClick={handleStart}
                className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg text-sm"
              >
                {gameState.status === 'ended' ? '🔄 Play Again' : '▶️ Start Game'}
              </button>
            )}
            {(gameState.status === 'waiting' || gameState.status === 'playing') && (
              <button
                onClick={handleRegenerateCard}
                className="w-full bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-md hover:shadow-lg text-sm"
                title="Get a new random card (loses progress)"
              >
                🔀 New Card
              </button>
            )}
          </div>

          <GameLog players={gameState.players} />

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-3 sm:p-4 rounded-2xl shadow-md flex-1 min-h-[100px]">
             <h2 className="text-sm font-bold text-blue-700 mb-2">👥 Players</h2>
             <ul className="space-y-2">
                {gameState.players.map(p => (
                  <li key={p.id} className={`flex justify-between items-center text-sm ${p.id === playerId ? 'font-bold text-purple-700' : 'text-gray-600'}`}>
                    <span className="truncate max-w-[120px]">{p.name} {p.id === playerId && '(You)'}</span>
                    {p.hasBingo && <span className="text-yellow-600 font-bold text-xs bg-yellow-200 px-2 py-1 rounded-full">🎉 BINGO!</span>}
                  </li>
                ))}
             </ul>
          </div>
        </div>

        {/* Right Panel: Bingo Card */}
        <div className="flex-1 p-2 sm:p-4 md:p-8 flex items-start md:items-center justify-center relative overflow-y-auto">
          <div className="w-full max-w-2xl">
            {showCards ? (
              <BingoCard
                card={player.card}
                seen={player.seen}
                onToggleSeen={handleToggleSeen}
                disabled={gameState.status !== 'playing' || player.hasBingo}
              />
            ) : (
              <div className="text-center space-y-4 bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
                  ⏳ Waiting to Start
                </div>
                <div className="text-gray-600 text-base">
                  {gameState.players.length === 1 ? (
                    <>Share the room code with friends to begin!</>
                  ) : (
                    <>Any player can start the game</>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Winner Overlay */}
          <AnimatePresence>
            {gameState.winner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl max-w-md text-center w-full"
                >
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">BINGO!</h2>
                  <p className="text-gray-700 mb-6 text-base sm:text-lg">
                    <span className="font-bold text-purple-600">{gameState.winner}</span> wins!
                  </p>
                  <button
                    onClick={handleStart}
                    className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl text-base"
                  >
                    🔄 Play Again
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showNewCardModal}
        onConfirm={confirmRegenerateCard}
        onCancel={() => setShowNewCardModal(false)}
        title="Reset Your Card?"
        message="Getting a new card will reset all your marked sightings. This cannot be undone."
        confirmText="Get New Card"
        cancelText="Keep Current"
      />

      {/* Footer */}
      <footer className="bg-white/90 backdrop-blur-sm p-3 text-center text-xs text-gray-500">
        Terminal 0 Bingo · Made with 💜
      </footer>
    </div>
  );
}

