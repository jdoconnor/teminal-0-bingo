import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Player } from '../types';

interface GameLogProps {
  players: Player[];
}

export function GameLog({ players }: GameLogProps) {
  // Collect all unique seen items from all players with who saw them
  const allSeenItems = useMemo(() => {
    const seenMap = new Map<string, string[]>();
    
    players.forEach(player => {
      player.seen.forEach(item => {
        if (!seenMap.has(item)) {
          seenMap.set(item, []);
        }
        seenMap.get(item)!.push(player.name);
      });
    });
    
    return Array.from(seenMap.entries()).map(([item, playerNames]) => ({
      item,
      players: playerNames,
    }));
  }, [players]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
    }
  }, [allSeenItems]);

  return (
    <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-3 sm:p-4 rounded-2xl shadow-md flex-1 min-h-[150px] max-h-[300px] overflow-y-auto">
      <h3 className="text-sm font-bold text-pink-700 mb-2">👀 Sightings</h3>
      {allSeenItems.length === 0 ? (
        <p className="text-gray-500 text-xs italic">No sightings yet...</p>
      ) : (
        <div ref={scrollRef} className="space-y-2">
          <AnimatePresence>
            {allSeenItems.map(({ item, players: seenByPlayers }, index) => (
              <motion.div
                key={`${item}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs bg-white p-2.5 rounded-xl shadow-sm border border-purple-100"
              >
                <div className="text-gray-700 font-medium">{item}</div>
                <div className="text-purple-600 text-[10px] mt-1 font-semibold">
                  Spotted by: {seenByPlayers.join(', ')}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
