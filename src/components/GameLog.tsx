import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface GameLogProps {
  calledItems: string[];
}

export function GameLog({ calledItems }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [calledItems]);

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 h-64 flex flex-col">
      <h3 className="text-emerald-500 font-mono text-xs uppercase tracking-widest mb-2 border-b border-zinc-800 pb-2">
        Sighting Log
      </h3>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 font-mono text-sm scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {calledItems.map((item, index) => (
            <motion.div
              key={`${item}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-zinc-300 border-l-2 border-zinc-700 pl-2 py-1"
            >
              <span className="text-zinc-500 text-xs mr-2">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {item}
            </motion.div>
          ))}
          {calledItems.length === 0 && (
            <div className="text-zinc-600 italic text-center py-4">
              Waiting for sightings...
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
