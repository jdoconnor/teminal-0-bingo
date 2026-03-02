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
        className="min-h-screen bg-zinc-900 text-zinc-100 font-mono flex items-center justify-center p-4"
      >
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-2xl font-bold text-emerald-400 mb-2 tracking-tighter">TERMINAL 0</h1>
          <p className="text-zinc-400 text-sm mb-6">ESOTERIC SIGHTINGS BINGO</p>
          
          <h2 className="text-lg font-bold text-zinc-100 mb-4">JOIN EXISTING GAME</h2>
          
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label htmlFor="room-code" className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Enter 4-Character Room Code
              </label>
              <input
                id="room-code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="ABC1"
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-emerald-400 font-mono text-2xl tracking-widest text-center uppercase focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              disabled={joinCode.length !== 4}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-bold py-3 px-4 rounded transition-colors uppercase tracking-wide"
            >
              Join Game
            </button>
            
            <button
              type="button"
              onClick={() => setMode('select')}
              className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-bold py-2 px-4 rounded transition-colors uppercase tracking-wide text-sm"
            >
              Back
            </button>
          </form>
          
          <p className="text-xs text-zinc-500 mt-6 text-center">
            WARNING: REALITY MAY BE UNSTABLE
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-zinc-900 text-zinc-100 font-mono flex items-center justify-center p-4"
    >
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-2xl font-bold text-emerald-400 mb-2 tracking-tighter">TERMINAL 0</h1>
        <p className="text-zinc-400 text-sm mb-6">ESOTERIC SIGHTINGS BINGO</p>
        
        <h2 className="text-lg font-bold text-zinc-100 mb-4">SELECT MODE</h2>
        
        <div className="space-y-3">
          <button
            onClick={onCreateRoom}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-900 font-bold py-4 px-4 rounded transition-colors uppercase tracking-wide"
          >
            Create New Game
          </button>
          
          <button
            onClick={() => setMode('join')}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-zinc-900 font-bold py-4 px-4 rounded transition-colors uppercase tracking-wide"
          >
            Join Existing Game
          </button>
        </div>
        
        <p className="text-xs text-zinc-500 mt-6 text-center">
          WARNING: REALITY MAY BE UNSTABLE
        </p>
      </div>
    </motion.div>
  );
}
