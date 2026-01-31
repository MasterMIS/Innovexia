"use client";

import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoaderContext = createContext<{
  showLoader: () => void;
  hideLoader: () => void;
  isLoading: boolean;
} | undefined>(undefined);

export const useLoader = () => {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error('useLoader must be used within LoaderProvider');
  return ctx;
};

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader, isLoading }}>
      {children}

      {/* Global Loader Overlay */}
      <AnimatePresence>
        {isLoading && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Loader */}
            <motion.div
              className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-[9999] max-w-sm mx-auto px-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-8 flex flex-col items-center gap-4">
                {/* Animated Spinner */}
                <div className="relative w-20 h-20">
                  {/* Outer Ring */}
                  <motion.div
                    className="absolute inset-0 border-4 border-[var(--theme-lighter)] dark:border-gray-700 rounded-full"
                  />
                  {/* Spinning Ring */}
                  <motion.div
                    className="absolute inset-0 border-4 border-transparent border-t-[var(--theme-primary)] rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                  {/* Inner Pulse */}
                  <motion.div
                    className="absolute inset-3 bg-[var(--theme-primary)] rounded-full opacity-20"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>

                {/* Loading Text */}
                <div className="flex flex-col items-center gap-2">
                  <p className="text-gray-900 dark:text-white font-semibold text-lg">
                    Processing...
                  </p>
                  <motion.div
                    className="flex gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-[var(--theme-primary)] rounded-full"
                        animate={{
                          y: [0, -8, 0],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </LoaderContext.Provider>
  );
}

