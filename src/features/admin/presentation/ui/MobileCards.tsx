'use client';

import { useEffect, useRef } from 'react';

/**
 * Wraps a table so phones (<640px) render each row as a stacked card (styles live in globals.css).
 * Desktop keeps the normal horizontally-scrollable table. Column headers are copied onto each cell as
 * `data-label` so the card rows stay readable; the first labelled cell becomes the card title.
 */
export default function MobileCards({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const label = () => {
      const heads = Array.from(root.querySelectorAll('thead th')).map((th) => th.textContent?.trim() ?? '');
      root.querySelectorAll('tbody tr').forEach((tr) => {
        let primaryDone = false;
        Array.from(tr.children).forEach((cell, i) => {
          const td = cell as HTMLElement;
          if (td.hasAttribute('colspan')) return;
          const head = heads[i] ?? '';
          if (!head) {
            if (td.querySelector('input[type="checkbox"]') && !td.textContent?.trim()) td.dataset.select = '1';
            return;
          }
          if (head === 'Actions') {
            td.dataset.actions = '1';
          } else if (!primaryDone) {
            td.dataset.primary = '1';
            primaryDone = true;
          } else if (td.dataset.label !== head) {
            td.dataset.label = head;
          }
          // Cells with several children (e.g. phone + email) stack under their label instead of splitting the row.
          if (td.querySelector(':scope > div, :scope > p')) td.dataset.stack = '1';
        });
      });
    };
    label();
    const observer = new MutationObserver(label);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="admin-cards overflow-x-auto">
      {children}
    </div>
  );
}
