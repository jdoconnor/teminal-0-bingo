import React from 'react';
import { motion } from 'motion/react';

interface BingoCardProps {
  card: string[];
  marked: boolean[];
  calledItems: string[];
  onMark: (index: number) => void;
  disabled: boolean;
}

export function BingoCard({ card, marked, calledItems, onMark, disabled }: BingoCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto p-1 sm:p-4 bg-zinc-800 rounded-lg border border-zinc-700 shadow-xl">
      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {card.map((item, index) => {
          const isMarked = marked[index];
          const isCalled = calledItems.includes(item);
          
          return (
            <motion.button
              key={index}
              whileHover={!disabled && isCalled && !isMarked ? { scale: 1.05, zIndex: 10 } : {}}
              whileTap={!disabled && isCalled && !isMarked ? { scale: 0.95 } : {}}
              onClick={() => onMark(index)}
              disabled={disabled || isMarked || !isCalled}
              className={`
                relative flex items-center justify-center p-0.5 sm:p-1 
                text-[9px] xs:text-[10px] sm:text-xs md:text-sm 
                text-center leading-tight rounded select-none transition-colors duration-300
                aspect-[4/5] sm:aspect-square
                ${isMarked 
                  ? 'bg-emerald-600 text-zinc-900 font-bold border-emerald-500' 
                  : isCalled 
                    ? 'bg-zinc-700 text-zinc-100 cursor-pointer hover:bg-zinc-600 border-zinc-600' 
                    : 'bg-zinc-900 text-zinc-500 cursor-not-allowed border-zinc-800'}
                border
                w-full
                break-words hyphens-auto
              `}
            >
              <span className="w-full h-full flex items-center justify-center overflow-hidden px-0.5">
                {item}
              </span>
              {isMarked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
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
