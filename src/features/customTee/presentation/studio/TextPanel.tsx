'use client';

import { useState } from 'react';
import { DEFAULT_TEXT_COLOR, FONT_OPTIONS, MAX_TEXT_LENGTH, type LayerPatch, type TextLayer } from '../../domain/layers';
import Select from '../Select';

type Props = {
  selected: TextLayer | null;
  onAdd: (text: string, fontFamily: string, color: string) => void;
  onLiveChange: (id: string, p: LayerPatch) => void;
  onSettle: () => void;
};

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';
const INPUT = 'w-full rounded-lg border border-[#EEEEEE] bg-white px-4 py-3 text-sm text-black focus:border-black focus:outline-none';
const BUTTON = 'w-full rounded-lg bg-black px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#333333] disabled:opacity-40';

const labelFor = (family: string) => FONT_OPTIONS.find((f) => f.family === family)?.label ?? FONT_OPTIONS[0].label;
const familyFor = (label: string) => FONT_OPTIONS.find((f) => f.label === label)?.family ?? FONT_OPTIONS[0].family;
const fontLabels = FONT_OPTIONS.map((f) => f.label);

// Edits an existing text layer. Keyed by layer id so its draft resets when the selection changes.
function TextEditor({ layer, onLiveChange, onSettle }: { layer: TextLayer; onLiveChange: Props['onLiveChange']; onSettle: () => void }) {
  const [draft, setDraft] = useState(layer.text);
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="text-edit" className={LABEL}>Text</label>
        <input
          id="text-edit"
          className={INPUT}
          maxLength={MAX_TEXT_LENGTH}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) onLiveChange(layer.id, { text: e.target.value, name: e.target.value.slice(0, 24) });
          }}
          onBlur={() => {
            if (!draft.trim()) setDraft(layer.text); // a text layer can't be empty
            onSettle();
          }}
        />
      </div>
      <div>
        <label htmlFor="text-font" className={LABEL}>Font</label>
        <Select
          id="text-font"
          value={labelFor(layer.fontFamily)}
          options={fontLabels}
          placeholder="Select a font"
          onChange={(label) => {
            onLiveChange(layer.id, { fontFamily: familyFor(label) });
            onSettle();
          }}
        />
      </div>
      <div>
        <label htmlFor="text-color" className={LABEL}>Color</label>
        <input
          id="text-color"
          type="color"
          value={layer.color}
          onChange={(e) => onLiveChange(layer.id, { color: e.target.value })}
          onBlur={onSettle}
          className="h-11 w-full cursor-pointer rounded-lg border border-[#EEEEEE] bg-white p-1"
        />
      </div>
    </div>
  );
}

export default function TextPanel({ selected, onAdd, onLiveChange, onSettle }: Props) {
  const [text, setText] = useState('');
  const [fontLabel, setFontLabel] = useState<string>(FONT_OPTIONS[0].label);
  const [color, setColor] = useState(DEFAULT_TEXT_COLOR);

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-black">Text</h2>

      {selected && <TextEditor key={selected.id} layer={selected} onLiveChange={onLiveChange} onSettle={onSettle} />}

      <div className={selected ? 'space-y-5 border-t border-[#EEEEEE] pt-5' : 'space-y-5'}>
        {selected && <p className="text-[10px] font-bold uppercase tracking-wider text-[#717171]">Add another text</p>}
        <div>
          <label htmlFor="text-new" className={LABEL}>Your text</label>
          <input id="text-new" className={INPUT} maxLength={MAX_TEXT_LENGTH} value={text} placeholder="Type something…" onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <label htmlFor="text-new-font" className={LABEL}>Font</label>
          <Select id="text-new-font" value={fontLabel} options={fontLabels} placeholder="Select a font" onChange={setFontLabel} />
        </div>
        <div>
          <label htmlFor="text-new-color" className={LABEL}>Color</label>
          <input
            id="text-new-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-11 w-full cursor-pointer rounded-lg border border-[#EEEEEE] bg-white p-1"
          />
        </div>
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => {
            onAdd(text.trim(), familyFor(fontLabel), color);
            setText('');
          }}
          className={BUTTON}
        >
          Add text
        </button>
      </div>
    </div>
  );
}
