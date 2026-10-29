'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { BTN } from './quoteUi';

type Props = { link: string; whatsappHref: string; expiresLabel?: string; expired?: boolean };

export default function QuoteLinkBox({ link, whatsappHref, expiresLabel, expired }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link', link);
    }
  };
  return (
    <div className="space-y-2 rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] p-3">
      <div className="text-xs font-medium text-[#717171]">Checkout link (works once)</div>
      <input readOnly value={link} aria-label="Checkout link" onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-[#EEEEEE] bg-white px-3 py-2 font-mono text-xs" />
      {expiresLabel && (
        <div className={`text-xs ${expired ? 'font-semibold text-red-700' : 'text-[#717171]'}`}>
          {expired ? 'Expired on' : 'Expires on'} {expiresLabel}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={BTN}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={BTN}>
          <MessageCircle className="h-3.5 w-3.5" /> Send on WhatsApp
        </a>
      </div>
    </div>
  );
}
