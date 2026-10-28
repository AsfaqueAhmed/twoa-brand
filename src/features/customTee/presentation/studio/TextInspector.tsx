'use client';

import { useEffect, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic } from 'lucide-react';
import {
  FONT_OPTIONS,
  MAX_LETTER_SPACING,
  MAX_SCALE,
  MAX_TEXT_LENGTH,
  MIN_LETTER_SPACING,
  MIN_SCALE,
  type LayerPatch,
  type TextAlign,
  type TextLayer,
  percentToScale,
  scaleToPercent,
} from '../../domain/layers';
import Select from '../Select';
import { DEFAULT_FONT_FAMILY } from '../../domain/fonts';
import { ensureFontsLoaded } from '../../application/fontLoader';

type Props = {
  layer: TextLayer;
  onLive: (patch: LayerPatch) => void;
  onCommit: (patch: LayerPatch) => void;
  onSettle: () => void;
};

const LABEL = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';
const TOGGLE = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-black transition-colors';
const fontLabels = FONT_OPTIONS.map((f) => f.label);
const labelFor = (family: string) => FONT_OPTIONS.find((f) => f.family === family)?.label ?? 'Sans';
const familyFor = (label: string) => FONT_OPTIONS.find((f) => f.label === label)?.family ?? DEFAULT_FONT_FAMILY;
const ALIGNS: { value: TextAlign; label: string; icon: typeof AlignLeft }[] = [
  { value: 'left', label: 'Align text left', icon: AlignLeft },
  { value: 'center', label: 'Align text center', icon: AlignCenter },
  { value: 'right', label: 'Align text right', icon: AlignRight },
];

const MIN_SIZE = scaleToPercent(MIN_SCALE);
const MAX_SIZE = scaleToPercent(MAX_SCALE);

export default function TextInspector({ layer, onLive, onCommit, onSettle }: Props) {
  const [draft, setDraft] = useState(layer.text);
  useEffect(() => {
    ensureFontsLoaded();
  }, []);
  // Keep the field in sync with the layer (undo/redo, on-canvas edits) unless the user is typing in it.
  useEffect(() => {
    if (document.activeElement?.id !== 'text-content') setDraft(layer.text);
  }, [layer.text]);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="text-content" className={LABEL}>Text</label>
        <textarea
          id="text-content"
          rows={2}
          maxLength={MAX_TEXT_LENGTH}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) onLive({ text: e.target.value, name: e.target.value.split('\n')[0].slice(0, 24) });
          }}
          onBlur={() => {
            if (!draft.trim()) setDraft(layer.text); // a text layer can't be empty
            onSettle();
          }}
          className="w-full resize-none rounded-lg border border-[#EEEEEE] bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label htmlFor="text-font" className={LABEL}>Font</label>
          <Select
            id="text-font"
            value={labelFor(layer.fontFamily)}
            options={fontLabels}
            placeholder="Select a font"
            onChange={(label) => onCommit({ fontFamily: familyFor(label) })}
            optionStyle={(label) => ({ fontFamily: familyFor(label) })}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="text-size" className={LABEL}>Size · {scaleToPercent(layer.scale)}%</label>
          <input
            id="text-size"
            type="range"
            min={MIN_SIZE}
            max={MAX_SIZE}
            value={scaleToPercent(layer.scale)}
            onChange={(e) => onLive({ scale: percentToScale(Number(e.target.value)) })}
            onPointerUp={onSettle}
            onKeyUp={onSettle}
            onBlur={onSettle}
            className="mt-2 w-full accent-black"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={layer.bold}
          onClick={() => onCommit({ bold: !layer.bold })}
          className={`${TOGGLE} ${layer.bold ? 'border-black bg-black text-white' : 'border-[#EEEEEE] hover:border-black'}`}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          aria-pressed={layer.italic}
          onClick={() => onCommit({ italic: !layer.italic })}
          className={`${TOGGLE} ${layer.italic ? 'border-black bg-black text-white' : 'border-[#EEEEEE] hover:border-black'}`}
        >
          <Italic className="h-4 w-4" />
        </button>
        <span className="mx-1 h-6 w-px shrink-0 bg-[#EEEEEE]" aria-hidden="true" />
        {ALIGNS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={layer.align === value}
            onClick={() => onCommit({ align: value })}
            className={`${TOGGLE} ${layer.align === value ? 'border-black bg-black text-white' : 'border-[#EEEEEE] hover:border-black'}`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <input
          id="text-color"
          type="color"
          aria-label="Text color"
          title="Text color"
          value={layer.color}
          onChange={(e) => onLive({ color: e.target.value })}
          onBlur={onSettle}
          className="ml-auto h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-[#EEEEEE] bg-white p-0.5"
        />
      </div>

      <div>
        <label htmlFor="text-spacing" className={LABEL}>Letter spacing · {Math.round(layer.letterSpacing * 100)}%</label>
        <input
          id="text-spacing"
          type="range"
          min={Math.round(MIN_LETTER_SPACING * 100)}
          max={Math.round(MAX_LETTER_SPACING * 100)}
          value={Math.round(layer.letterSpacing * 100)}
          onChange={(e) => onLive({ letterSpacing: Number(e.target.value) / 100 })}
          onPointerUp={onSettle}
          onKeyUp={onSettle}
          onBlur={onSettle}
          className="w-full accent-black"
        />
      </div>
    </div>
  );
}
