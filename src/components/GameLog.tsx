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
    <div className="bg-zinc-900 p-3 sm:p-4 rounded border border-zinc-700 flex-1 min-h-[150px] max-h-[300px] overflow-y-auto">
      <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Sighting Log</h3>
      {allSeenItems.length === 0 ? (
        <p className="text-zinc-600 text-xs italic">Waiting for sightings...</p>
      ) : (
        <div ref={scrollRef} className="space-y-1">
          <AnimatePresence>
            {allSeenItems.map(({ item, players: seenByPlayers }, index) => (
              <motion.div
                key={`${item}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs bg-zinc-800 p-2 rounded border border-zinc-700"
              >
                <div className="text-zinc-300">{item}</div>
                <div className="text-emerald-400 text-[10px] mt-1">
                  Seen by: {seenByPlayers.join(', ')}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
