import { zipSync, strToU8 } from 'fflate';
import { buildZipPlan, type CustomQuote } from '../domain/customQuote';
import { downloadQuoteFile, previewUrl } from '../infrastructure/customQuotesAdminRepository';

export async function downloadQuoteZip(q: CustomQuote): Promise<void> {
  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  for (const entry of buildZipPlan(q)) {
    const { source } = entry;
    try {
      if (source.kind === 'text') {
        files[entry.zipPath] = strToU8(source.content);
        continue;
      }
      let blob: Blob;
      if (source.kind === 'public') {
        const res = await fetch(previewUrl(source.path));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();
      } else {
        blob = await downloadQuoteFile(source.bucket, source.path);
      }
      files[entry.zipPath] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
    } catch (e) {
      throw new Error(`Could not fetch ${entry.zipPath}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const zipped = zipSync(files);
  const url = URL.createObjectURL(new Blob([zipped as BlobPart], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `custom-tee-${q.id}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
