import type { ParentProduct, ProductVariant } from '@/shared/domain/types';
import { getParentImages } from '@/features/catalog/domain/parentImages';

export type StudioView = { id: string; label: string; image: string };

export const viewIdAt = (index: number): string => `view-${index}`;

// One view per titled parent image; the selected color variant's image replaces the first view's image.
export function buildViews(parent: ParentProduct, color?: ProductVariant): StudioView[] {
  return getParentImages(parent).map((img, i) => ({
    id: viewIdAt(i),
    label: img.title,
    image: i === 0 ? color?.image || img.url : img.url,
  }));
}
