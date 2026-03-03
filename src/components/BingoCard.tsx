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
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-4 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {card.map((item, index) => {
          const isSeen = seen.includes(item);
          const canToggle = !disabled;
          
          return (
            <motion.button
              key={index}
              onClick={() => canToggle && onToggleSeen(item)}
              disabled={!canToggle}
              whileTap={canToggle ? { scale: 0.95 } : {}}
              className={`
                relative flex items-center justify-center p-1.5 sm:p-2.5 
                text-[9px] xs:text-[10px] sm:text-xs md:text-sm 
                text-center leading-tight rounded-xl select-none transition-all duration-200
                aspect-square
                font-semibold
                ${isSeen
                  ? 'bg-gradient-to-br from-pink-400 to-purple-500 text-white shadow-lg hover:shadow-xl cursor-pointer'
                  : 'bg-gradient-to-br from-blue-100 to-purple-100 text-gray-700 hover:from-blue-200 hover:to-purple-200 cursor-pointer shadow-md'
                }
                w-full
                overflow-hidden
              `}
            >
              <span className="w-full h-full flex items-center justify-center overflow-hidden px-0.5 sm:px-1 line-clamp-3">
                {item}
              </span>
              {isSeen && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 text-xl sm:text-2xl"
                >
                  ✓
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
