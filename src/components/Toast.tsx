/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'error' | 'warn' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);

    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timerMap.current.delete(id);
    }, duration);
    timerMap.current.set(id, timer);
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = timerMap.current.get(id);
    if (timer) clearTimeout(timer);
    timerMap.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

const TYPE_STYLES: Record<ToastType, string> = {
  error: 'bg-red-600 text-white',
  warn:  'bg-yellow-500 text-white',
  info:  'bg-purple-600 text-white',
};

const TYPE_ICON: Record<ToastType, string> = {
  error: '⚠️',
  warn:  '🔌',
  info:  'ℹ️',
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-16 left-0 right-0 flex flex-col items-center gap-2 z-[100] px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-start gap-2 max-w-sm w-full rounded-xl px-4 py-3 shadow-xl text-sm font-medium ${TYPE_STYLES[toast.type]}`}
          >
            <span className="shrink-0 text-base leading-snug">{TYPE_ICON[toast.type]}</span>
            <span className="flex-1 leading-snug break-words">{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 opacity-70 hover:opacity-100 text-base leading-snug"
              aria-label="Dismiss"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
