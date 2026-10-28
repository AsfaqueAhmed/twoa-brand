'use client';

import type { ImageLayer, LayerPatch } from '../../domain/layers';
import AppearanceSection from './AppearanceSection';

type Props = { layer: ImageLayer; onLive: (patch: LayerPatch) => void; onSettle: () => void };

export default function ImageInspector({ layer, onLive, onSettle }: Props) {
  return (
    <div className="space-y-4">
      <p className="truncate text-xs font-semibold text-black">{layer.name}</p>
      <AppearanceSection opacity={layer.opacity} onLive={(opacity) => onLive({ opacity })} onSettle={onSettle} />
    </div>
  );
}
