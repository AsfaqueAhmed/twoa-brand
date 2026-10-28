import type { ParentProduct, ProductVariant } from '@/shared/domain/types';

export type ViewId = 'front' | 'back' | 'left' | 'right';
export type StudioView = { id: ViewId; label: string; image: string };

// Front only until parents carry back/left/right images (phase B); callers render tabs from this list.
export function buildViews(parent: ParentProduct, color?: ProductVariant): StudioView[] {
  const image = color?.image || parent.image || '';
  return image ? [{ id: 'front', label: 'Front', image }] : [];
}
