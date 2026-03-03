import React, { useState } from 'react';
import { motion } from 'motion/react';

interface RoomSelectorProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
}

export function RoomSelector({ onCreateRoom, onJoinRoom }: RoomSelectorProps) {
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'select' | 'join'>('select');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length === 4) {
      onJoinRoom(code);
    }
  };

  if (mode === 'join') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center p-4"
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎮</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">Terminal 0 Bingo</h1>
            <p className="text-gray-600 text-sm">Join a game</p>
          </div>
          
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label htmlFor="room-code" className="block text-sm font-semibold text-gray-700 mb-2">
                Room Code
              </label>
              <input
                id="room-code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="ABC1"
                className="w-full bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl px-4 py-4 text-purple-600 font-bold text-3xl tracking-widest text-center uppercase focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              disabled={joinCode.length !== 4}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              Join Game 🚀
            </button>
            
            <button
              type="button"
              onClick={() => setMode('select')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              ← Back
            </button>
          </form>
          
          <p className="text-xs text-gray-500 mt-6 text-center">
            ✨ Enter the 4-character code shared by your friend
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center p-4"
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">Terminal 0 Bingo</h1>
          <p className="text-gray-600">Spot weird things at the airport!</p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={onCreateRoom}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold py-5 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl text-lg"
          >
            🎯 Create New Game
          </button>
          
          <button
            onClick={() => setMode('join')}
            className="w-full bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white font-bold py-5 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl text-lg"
          >
            🚪 Join Game
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-8 text-center">
          ✨ A fun multiplayer bingo game for airports
        </p>
      </div>
    </motion.div>
  );
}
