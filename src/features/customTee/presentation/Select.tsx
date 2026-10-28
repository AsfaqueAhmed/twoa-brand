'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

type Props = {
  id: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
  /** Optional per-option style, e.g. to preview a font in its own typeface. */
  optionStyle?: (option: string) => React.CSSProperties;
};

type PanelPos = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

const PANEL_MAX_HEIGHT = 224;

// Custom listbox so the dropdown panel is white and matches the storefront (a native <select> menu can't be styled).
// The panel is portaled to <body> and positioned from the button, so it is never clipped by the dialog's scroll area
// and the dialog's height can follow its content.
export default function Select({ id, value, options, placeholder, onChange, optionStyle }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [portalRoot, setPortalRoot] = useState<Element | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onScrollOrResize = (e: Event) => {
      if (e.target instanceof Node && panelRef.current?.contains(e.target)) return; // scrolling the list itself
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, id]);

  const openList = () => {
    const button = buttonRef.current;
    if (!button) return;
    button.focus(); // some browsers don't focus a clicked button; keys (Escape/arrows) must reach this control
    const rect = button.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    if (below < 140 && above > below) {
      setPos({ left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 4, maxHeight: Math.min(PANEL_MAX_HEIGHT, above) });
    } else {
      setPos({ left: rect.left, width: rect.width, top: rect.bottom + 4, maxHeight: Math.min(PANEL_MAX_HEIGHT, below) });
    }
    setPortalRoot(document.fullscreenElement ?? document.body); // inside fullscreen only that subtree is visible
    setActive(Math.max(0, options.indexOf(value)));
    setOpen(true);
  };
  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault(); // marks the key as handled so the surrounding dialog doesn't also close
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return openList();
      setActive((i) => Math.min(options.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) return openList();
      if (active >= 0) choose(options[active]);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left text-sm focus:outline-none ${
          open ? 'border-black' : 'border-[#EEEEEE] hover:border-black focus:border-black'
        } ${value ? 'text-black' : 'text-[#717171]'}`}
      >
        <span className="truncate" style={value ? optionStyle?.(value) : undefined}>{value || placeholder}</span>
        <ChevronDown className={`ml-3 h-4 w-4 shrink-0 text-[#717171] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        pos &&
        portalRoot &&
        createPortal(
          <ul
            ref={panelRef}
            id={`${id}-list`}
            role="listbox"
            style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
            className="z-[60] overflow-y-auto rounded-lg border border-[#EEEEEE] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          >
            {options.map((o, i) => (
              <li
                key={o}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={o === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm text-black ${
                  i === active ? 'bg-[#F5F5F5]' : 'bg-white'
                }`}
              >
                <span className="truncate" style={optionStyle?.(o)}>{o}</span>
                {o === value && <Check className="ml-3 h-4 w-4 shrink-0" />}
              </li>
            ))}
          </ul>,
          portalRoot,
        )}
    </div>
  );
}
