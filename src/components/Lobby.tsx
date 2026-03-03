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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 p-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👁️</div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Terminal 0 Bingo</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Terminal 0 overflowed into your terminal.<br />
            <span className="font-semibold text-purple-600">Spot the escapees.</span>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="Enter your name"
              autoFocus
              maxLength={12}
            />
          </div>
          
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Game 🚀
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>✨ Get ready for some weird sightings!</p>
        </div>
      </div>
    </div>
  );
}
