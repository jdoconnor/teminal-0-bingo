import React from 'react';
import { motion } from 'motion/react';

interface BingoCardProps {
  card: string[];
  seen: string[];
  onToggleSeen: (item: string) => void;
  disabled: boolean;
}

export function BingoCard({ card, seen, onToggleSeen, disabled }: BingoCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto p-1 sm:p-4 bg-zinc-800 rounded-lg border border-zinc-700 shadow-xl">
      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {card.map((item, index) => {
          const isSeen = seen.includes(item);
          const canToggle = !disabled;
          
          return (
            <motion.button
              key={index}
              onClick={() => canToggle && onToggleSeen(item)}
              disabled={!canToggle}
              className={`
                relative flex items-center justify-center p-1 sm:p-2 
                text-[10px] xs:text-[11px] sm:text-xs md:text-sm 
                text-center leading-[1.1] rounded select-none transition-colors duration-300
                aspect-[4/5] sm:aspect-square
                font-medium
                ${isSeen
                  ? 'bg-emerald-600 border-emerald-400 text-zinc-900 shadow-lg shadow-emerald-500/50 cursor-pointer'
                  : 'bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600 hover:border-zinc-500 cursor-pointer'
                }
                border
                w-full
                overflow-hidden
              `}
            >
              <span className="w-full h-full flex items-center justify-center overflow-hidden px-1 text-ellipsis line-clamp-3">
                {item}
              </span>
              {isSeen && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={isSeen ? { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] } : {}}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-full h-full border-2 sm:border-4 border-emerald-400 rounded opacity-50" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
