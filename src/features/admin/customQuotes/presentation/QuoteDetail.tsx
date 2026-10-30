'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, MessageCircle, Phone, X } from 'lucide-react';
import AdminCard from '@/features/admin/presentation/AdminCard';
import StatusPill from '@/features/admin/presentation/ui/StatusPill';
import {
  STATUS_LABELS, buildQuoteLink, bundleBadge, bundleCandidates, bundleMembers, canLeadBundle, effectiveStatus, quoteMessage, whatsappUrl,
  type CustomQuote, type QuoteLine, type QuoteStatus,
} from '../domain/customQuote';
import BundleEditor from './BundleEditor';
import PricingEditor from './PricingEditor';
import QuoteLinkBox from './QuoteLinkBox';
import { BTN, BTN_PRIMARY, FIELD, QUOTE_TONE, formatDate } from './quoteUi';

const SETTABLE: QuoteStatus[] = ['new', 'contacted', 'declined'];

type Props = {
  quote: CustomQuote;
  allQuotes: CustomQuote[];
  sizes: string[];
  origin: string;
  previewSrc: (path: string) => string;
  onClose: () => void;
  onSaveNote: (note: string) => Promise<void>;
  onSetStatus: (status: QuoteStatus) => Promise<void>;
  onPrice: (lines: QuoteLine[], unitPrice: number, expiresAt: Date, regenerate: boolean) => Promise<void>;
  onDownloadZip: () => Promise<void>;
  onSetBundle: (memberIds: string[]) => Promise<void>;
  onOpenQuote: (id: string) => void;
};

const msg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function QuoteDetail({
  quote: q, allQuotes, sizes, origin, previewSrc, onClose, onSaveNote, onSetStatus, onPrice, onDownloadZip, onSetBundle, onOpenQuote,
}: Props) {
  const [note, setNote] = useState(q.adminNote);
  const [busy, setBusy] = useState<'note' | 'status' | 'price' | 'zip' | 'bundle' | null>(null);
  const [error, setError] = useState<{ where: string; text: string } | null>(null);

  const st = effectiveStatus(q);
  const ordered = q.status === 'ordered';
  const merged = !!q.mergedInto;
  const hasLink = q.status === 'quoted' && !!q.quoteToken && !merged;
  const members = bundleMembers(q.id, allQuotes);
  // A lead that stopped being quoted (e.g. declined) still shows the section so its members can be released.
  const canLead = canLeadBundle(q);
  const showBundle = canLead || (members.length > 0 && !merged && !ordered);
  const candidates = canLead ? bundleCandidates(q, allQuotes) : [];
  const link = hasLink ? buildQuoteLink(origin, q.quoteToken!) : '';
  const expiresAt = q.quoteExpiresAt ? new Date(q.quoteExpiresAt) : null;

  const run = async (key: NonNullable<typeof busy>, fn: () => Promise<void>, fallback: string) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError({ where: key, text: msg(e, fallback) });
    } finally {
      setBusy(null);
    }
  };
  const err = (where: string) => error?.where === where && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{error!.text}</p>;

  return (
    <div className="space-y-4">
      <AdminCard
        title={`Quote ${q.id.slice(0, 8)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusPill tone={QUOTE_TONE[st]}>{STATUS_LABELS[st]}</StatusPill>
            <button type="button" aria-label="Close detail" onClick={onClose} className="rounded-lg p-1.5 text-[#717171] hover:bg-[#F0F0F0] hover:text-black">
              <X className="h-4 w-4" />
            </button>
          </div>
        }
      >
        <div className="text-xs text-[#717171]">Requested {formatDate(q.createdAt)}</div>
        {bundleBadge(q, allQuotes) && (
          <span className="mt-2 inline-block rounded-md border border-[#EEEEEE] bg-[#FAF9F6] px-2 py-0.5 text-[11px] font-semibold text-black">{bundleBadge(q, allQuotes)}</span>
        )}
        <div className="mt-3 text-sm">
          <div className="font-semibold text-black">{q.name}</div>
          <div className="text-[#555555]">Phone: {q.phone}</div>
          <div className="text-[#555555]">WhatsApp: {q.whatsapp}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`tel:${q.phone}`} className={BTN}><Phone className="h-3.5 w-3.5" /> Call</a>
          <a href={whatsappUrl(q.whatsapp, `Hi ${q.name}, thanks for your custom tee request. `)} target="_blank" rel="noopener noreferrer" className={BTN}>
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </div>
      </AdminCard>

      <AdminCard title="Design">
        <div className="mb-3 text-sm text-[#555555]">
          {q.parentName} · Size {q.teeSize}{q.colorName ? ` · ${q.colorName}` : ''}
        </div>
        {q.files.previews.length === 0 ? (
          <p className="text-xs text-[#717171]">No previews were saved.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {q.files.previews.map((p) => (
              <figure key={p.viewId} className="space-y-1">
                <a href={previewSrc(p.path)} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewSrc(p.path)} alt={p.label} className="aspect-square w-full rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] object-contain" />
                </a>
                <figcaption className="text-center text-xs text-[#717171]">{p.label}</figcaption>
              </figure>
            ))}
          </div>
        )}
        <div className="mt-3">
          <button type="button" disabled={busy === 'zip'} onClick={() => run('zip', onDownloadZip, 'Download failed.')} className={BTN}>
            <Download className="h-3.5 w-3.5" /> {busy === 'zip' ? 'Preparing ZIP...' : 'Download ZIP'}
          </button>
          {err('zip')}
        </div>
      </AdminCard>

      <AdminCard title="Notes & status">
        <label htmlFor="quote-note" className="mb-1 block text-xs font-medium text-[#717171]">Notes</label>
        <textarea id="quote-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={FIELD} />
        <div className="mt-2">
          <button type="button" disabled={busy === 'note' || note === q.adminNote} onClick={() => run('note', () => onSaveNote(note), 'Failed to save notes.')} className={BTN}>
            {busy === 'note' ? 'Saving...' : 'Save notes'}
          </button>
          {err('note')}
        </div>
        <label htmlFor="quote-status" className="mb-1 mt-4 block text-xs font-medium text-[#717171]">Status</label>
        <select id="quote-status" value={SETTABLE.includes(q.status) ? q.status : ''} disabled={ordered || busy === 'status'}
          onChange={(e) => run('status', () => onSetStatus(e.target.value as QuoteStatus), 'Failed to update status.')} className={FIELD}>
          {!SETTABLE.includes(q.status) && <option value="">{STATUS_LABELS[st]}</option>}
          {SETTABLE.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        {err('status')}
      </AdminCard>

      <AdminCard title="Pricing">
        {ordered ? (
          <p className="text-sm text-[#555555]">
            This quote has been ordered.{' '}
            {q.orderId ? (
              <Link href={`/admin/orders/edit?id=${q.orderId}`} className="font-semibold text-black underline">View order {q.orderId.slice(0, 8)}</Link>
            ) : (
              <Link href="/admin/orders" className="font-semibold text-black underline">Open orders</Link>
            )}
          </p>
        ) : merged ? (
          <p className="text-sm text-[#555555]">
            Part of combined order{' '}
            <button type="button" onClick={() => onOpenQuote(q.mergedInto!)} className="font-semibold text-black underline">{q.mergedInto}</button>.
            {' '}Pricing and the checkout link are managed on that quote. Remove this design from the bundle there to price it on its own.
          </p>
        ) : (
          <div className="space-y-4">
            {members.length > 0 && <p className="text-[11px] text-[#717171]">This link also includes {members.length} combined {members.length === 1 ? 'design' : 'designs'}.</p>}
            {hasLink && (
              <QuoteLinkBox
                link={link}
                expiresLabel={expiresAt ? expiresAt.toLocaleDateString('en-GB') : undefined}
                expired={st === 'expired'}
                whatsappHref={whatsappUrl(q.whatsapp, quoteMessage(q, link, expiresAt ?? new Date(), members.filter((m) => m.status === 'quoted')))}
              />
            )}
            <PricingEditor
              key={`${q.id}:${q.updatedAt}`}
              sizes={sizes}
              initialLines={q.lines}
              initialPrice={q.unitPrice}
              submitLabel={q.status === 'quoted' ? 'Update quote' : 'Generate link'}
              busy={busy === 'price'}
              error={error?.where === 'price' ? error.text : null}
              onSubmit={(lines, price, exp) => run('price', () => onPrice(lines, price, exp, !!q.quoteToken && q.status !== 'quoted'), 'Failed to generate link.')}
            />
            {q.status === 'quoted' && <p className="text-[11px] text-[#717171]">Updating keeps the current link working.</p>}
            {q.status !== 'quoted' && q.quoteToken && <p className="text-[11px] text-[#717171]">A new link will be generated; the previous one stops working.</p>}
          </div>
        )}
      </AdminCard>

      {showBundle && (
        <AdminCard title="Combine with other designs">
          <BundleEditor
            key={`${q.id}:${members.map((m) => `${m.id}@${m.updatedAt}`).join(',')}`}
            lead={q}
            candidates={candidates}
            members={members}
            previewSrc={previewSrc}
            busy={busy === 'bundle'}
            error={error?.where === 'bundle' ? error.text : null}
            onSubmit={(ids) => run('bundle', () => onSetBundle(ids), 'Failed to update the combined link.')}
          />
        </AdminCard>
      )}
    </div>
  );
}
