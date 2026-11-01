import type { Layer } from '../domain/layers';
import type { StudioView } from '../domain/views';
import { renderViewPng } from './renderPreview';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design';

// Renders the given view (product photo + design layers) to a PNG and saves it to the device.
export async function downloadViewPng(view: StudioView, layers: Layer[], productName: string): Promise<void> {
  const blob = await renderViewPng({ baseImageUrl: view.image, layers });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(productName)}-${slug(view.label)}-design.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
