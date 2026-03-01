import React, { useState } from 'react';

interface LobbyProps {
  onJoin: (name: string) => void;
}

export function Lobby({ onJoin }: LobbyProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-100 font-mono p-4">
      <div className="max-w-md w-full bg-zinc-800 border border-zinc-700 p-8 rounded-lg shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-center text-emerald-400 tracking-tighter">TERMINAL 0</h1>
        <p className="text-zinc-400 text-center mb-8 text-sm uppercase tracking-widest">Esoteric Sightings Bingo</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
              Passenger Identity
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-3 rounded focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="ENTER NAME..."
              autoFocus
              maxLength={12}
            />
          </div>
          
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-900 font-bold py-3 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
          >
            Enter Terminal
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-zinc-600">
          <p>WARNING: REALITY MAY BE UNSTABLE</p>
        </div>
      </div>
    </div>
  );
}
