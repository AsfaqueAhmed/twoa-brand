'use client';

import { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Type, X } from 'lucide-react';
import {
  MAX_LETTER_SPACING,
  MAX_TEXT_LENGTH,
  MIN_LETTER_SPACING,
  type LayerPatch,
  type TextAlign,
  type TextLayer,
} from '../../../domain/layers';
import { MOBILE_FONTS, ensureGoogleFontsLoaded } from '../fonts';
import { FONT_PICKER_CATEGORIES, type FontCategory } from '../../../domain/fonts';
import { SheetFooterContext } from '../MobileBottomSheet';

type TextSubTab = 'font' | 'style' | 'color' | 'effects';

type Props = {
  activeTextLayer: TextLayer | null;
  onAddText: (text: string, fontFamily: string, color: string) => void;
  onUpdateText: (patch: LayerPatch) => void;
  onDone?: () => void;
};

const COLOR_SWATCHES = [
  { name: 'Pitch Black', value: '#111111' },
  { name: 'Pure White', value: '#FFFFFF' },
  { name: 'Scarlet Red', value: '#EF4444' },
  { name: 'Royal Blue', value: '#2563EB' },
  { name: 'Forest Green', value: '#15803D' },
  { name: 'Warm Amber', value: '#F59E0B' },
  { name: 'Sunset Orange', value: '#EA580C' },
  { name: 'Deep Purple', value: '#7C3AED' },
  { name: 'Heather Gray', value: '#64748B' },
  { name: 'Rose Pink', value: '#EC4899' },
];

export default function TextEditorSheet({
  activeTextLayer,
  onAddText,
  onUpdateText,
  onDone,
}: Props) {
  const footerEl = useContext(SheetFooterContext);
  const [fontCategory, setFontCategory] = useState<FontCategory | 'All'>('All');
  const [subTab, setSubTab] = useState<TextSubTab>('font');
  const [text, setText] = useState(activeTextLayer?.text ?? 'বিকেলের আলো');
  const [fontFamily, setFontFamily] = useState(
    activeTextLayer?.fontFamily ?? (MOBILE_FONTS.find((f) => f.label === 'Noto Sans Bengali') ?? MOBILE_FONTS[0]).family,
  );
  const [textColor, setTextColor] = useState(activeTextLayer?.color ?? '#111111');
  const [isBold, setIsBold] = useState(activeTextLayer?.bold ?? false);
  const [isItalic, setIsItalic] = useState(activeTextLayer?.italic ?? false);
  const [align, setAlign] = useState<TextAlign>(activeTextLayer?.align ?? 'center');
  const [letterSpacing, setLetterSpacing] = useState(activeTextLayer?.letterSpacing ?? 0);

  useEffect(() => {
    ensureGoogleFontsLoaded();
  }, []);

  useEffect(() => {
    if (activeTextLayer) {
      setText(activeTextLayer.text);
      setFontFamily(activeTextLayer.fontFamily);
      setTextColor(activeTextLayer.color);
      setIsBold(activeTextLayer.bold);
      setIsItalic(activeTextLayer.italic);
      setAlign(activeTextLayer.align);
      setLetterSpacing(activeTextLayer.letterSpacing);
    }
  }, [activeTextLayer]);

  const handleTextChange = (newText: string) => {
    setText(newText);
    if (activeTextLayer) {
      onUpdateText({ text: newText, name: newText.trim() ? newText.slice(0, 24) : 'Text' });
    }
  };

  const handleFontChange = (family: string) => {
    setFontFamily(family);
    if (activeTextLayer) {
      onUpdateText({ fontFamily: family });
    }
  };

  const handleColorChange = (c: string) => {
    setTextColor(c);
    if (activeTextLayer) {
      onUpdateText({ color: c });
    }
  };

  const handleBoldToggle = () => {
    const next = !isBold;
    setIsBold(next);
    if (activeTextLayer) onUpdateText({ bold: next });
  };

  const handleItalicToggle = () => {
    const next = !isItalic;
    setIsItalic(next);
    if (activeTextLayer) onUpdateText({ italic: next });
  };

  const handleAlignChange = (val: TextAlign) => {
    setAlign(val);
    if (activeTextLayer) onUpdateText({ align: val });
  };

  const handleLetterSpacingChange = (val: number) => {
    setLetterSpacing(val);
    if (activeTextLayer) onUpdateText({ letterSpacing: val });
  };

  const handleAddOrSubmit = () => {
    if (!text.trim()) return;
    if (activeTextLayer) {
      onDone?.();
    } else {
      onAddText(text.trim(), fontFamily, textColor);
      onDone?.();
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Text Input with Clear Button */}
      <div className="relative">
        <input
          type="text"
          value={text}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter your custom text..."
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-4 pr-10 text-sm font-semibold text-black placeholder-zinc-400 focus:border-black focus:bg-white focus:outline-none transition"
          style={{ fontFamily }}
        />
        {text && (
          <button
            type="button"
            onClick={() => handleTextChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sub Tabs Pill Bar */}
      <div className="flex rounded-full bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setSubTab('font')}
          className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
            subTab === 'font' ? 'bg-black text-white shadow-xs' : 'text-zinc-600 hover:text-black'
          }`}
        >
          Font
        </button>
        <button
          type="button"
          onClick={() => setSubTab('style')}
          className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
            subTab === 'style' ? 'bg-black text-white shadow-xs' : 'text-zinc-600 hover:text-black'
          }`}
        >
          Style
        </button>
        <button
          type="button"
          onClick={() => setSubTab('color')}
          className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
            subTab === 'color' ? 'bg-black text-white shadow-xs' : 'text-zinc-600 hover:text-black'
          }`}
        >
          Color
        </button>
        <button
          type="button"
          onClick={() => setSubTab('effects')}
          className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
            subTab === 'effects' ? 'bg-black text-white shadow-xs' : 'text-zinc-600 hover:text-black'
          }`}
        >
          Effects
        </button>
      </div>

      {/* Font Tab Content */}
      {subTab === 'font' && (
        <div className="space-y-3">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
            {(['All', ...FONT_PICKER_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFontCategory(cat)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  fontCategory === cat ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {MOBILE_FONTS.filter((f) => fontCategory === 'All' || f.category === fontCategory).map((f) => {
              const isSelected = fontFamily === f.family;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFontChange(f.family)}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition active:scale-98 ${
                    isSelected ? 'border-black bg-zinc-50 ring-1 ring-black' : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <span className="text-2xl text-zinc-900 leading-none" style={{ fontFamily: f.family }}>
                    {f.sampleLetter}
                  </span>
                  <span className="mt-2 block w-full truncate text-[11px] font-semibold text-zinc-700">{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Style Tab Content */}
      {subTab === 'style' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBoldToggle}
              className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${
                isBold ? 'border-black bg-black text-white' : 'border-zinc-200 bg-white text-zinc-800'
              }`}
            >
              <Bold className="h-4 w-4" />
              <span>Bold</span>
            </button>
            <button
              type="button"
              onClick={handleItalicToggle}
              className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${
                isItalic ? 'border-black bg-black text-white' : 'border-zinc-200 bg-white text-zinc-800'
              }`}
            >
              <Italic className="h-4 w-4" />
              <span>Italic</span>
            </button>
          </div>

          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Text Alignment
            </span>
            <div className="flex rounded-xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => handleAlignChange('left')}
                className={`flex-1 flex justify-center py-2 rounded-lg transition ${
                  align === 'left' ? 'bg-white shadow-xs text-black' : 'text-zinc-500'
                }`}
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleAlignChange('center')}
                className={`flex-1 flex justify-center py-2 rounded-lg transition ${
                  align === 'center' ? 'bg-white shadow-xs text-black' : 'text-zinc-500'
                }`}
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleAlignChange('right')}
                className={`flex-1 flex justify-center py-2 rounded-lg transition ${
                  align === 'right' ? 'bg-white shadow-xs text-black' : 'text-zinc-500'
                }`}
              >
                <AlignRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color Tab Content */}
      {subTab === 'color' && (
        <div className="space-y-3">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Palette Swatches
          </span>
          <div className="grid grid-cols-5 gap-3">
            {COLOR_SWATCHES.map((swatch) => {
              const isSelected = textColor.toLowerCase() === swatch.value.toLowerCase();
              return (
                <button
                  key={swatch.value}
                  type="button"
                  onClick={() => handleColorChange(swatch.value)}
                  title={swatch.name}
                  className={`group flex aspect-square flex-col items-center justify-center rounded-2xl border transition active:scale-95 ${
                    isSelected ? 'ring-2 ring-black ring-offset-2' : 'border-zinc-200'
                  }`}
                  style={{ backgroundColor: swatch.value }}
                >
                  {swatch.value === '#FFFFFF' && (
                    <span className="h-2 w-2 rounded-full border border-zinc-300" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-700">Custom Color:</span>
            <input
              type="color"
              value={textColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded-lg border border-zinc-200 bg-transparent p-0.5"
            />
            <span className="text-xs font-mono font-bold text-zinc-600 uppercase">{textColor}</span>
          </div>
        </div>
      )}

      {/* Effects Tab Content */}
      {subTab === 'effects' && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-zinc-700">Letter Spacing</span>
              <span className="font-mono text-zinc-500">{(letterSpacing * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={MIN_LETTER_SPACING}
              max={MAX_LETTER_SPACING}
              step={0.01}
              value={letterSpacing}
              onChange={(e) => handleLetterSpacingChange(parseFloat(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Primary action: pinned to the sheet footer when available */}
      {(() => {
        const action = (
          <button
            type="button"
            onClick={handleAddOrSubmit}
            disabled={!text.trim()}
            className="w-full rounded-2xl bg-black py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-md hover:bg-zinc-800 active:scale-98 transition disabled:opacity-50"
          >
            {activeTextLayer ? 'Apply Changes' : 'Add Text to Canvas'}
          </button>
        );
        return footerEl ? createPortal(action, footerEl) : action;
      })()}
    </div>
  );
}
