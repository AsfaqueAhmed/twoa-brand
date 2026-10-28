'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import CustomTeeModal from './CustomTeeModal';

type CustomTeeContextValue = { isOpen: boolean; open: () => void; close: () => void };

const CustomTeeContext = createContext<CustomTeeContextValue | null>(null);

// Renders the picker popup only while open, so tee data loads on demand and state resets on close.
export function CustomTeeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <CustomTeeContext.Provider value={value}>
      {children}
      {isOpen && <CustomTeeModal onClose={close} />}
    </CustomTeeContext.Provider>
  );
}

export function useCustomTee(): CustomTeeContextValue {
  const ctx = useContext(CustomTeeContext);
  if (!ctx) throw new Error('useCustomTee must be used within CustomTeeProvider');
  return ctx;
}
