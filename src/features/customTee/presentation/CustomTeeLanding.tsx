'use client';

import { useEffect } from 'react';
import { useCustomTee } from './CustomTeeProvider';

// Direct-link target for /custom-tee: opens the picker popup on mount.
export default function CustomTeeLanding() {
  const { open } = useCustomTee();
  useEffect(() => {
    open();
  }, [open]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold uppercase tracking-wider text-black">Design your own tee</h1>
      <p className="mt-3 text-sm text-[#717171]">Pick a category, size and tee, then make it yours.</p>
      <button
        type="button"
        onClick={open}
        className="mt-8 rounded-full bg-black px-8 py-3.5 text-sm font-bold text-white hover:bg-[#333333]"
      >
        Start designing
      </button>
    </div>
  );
}
