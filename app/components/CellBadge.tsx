'use client';

import React from 'react';
import { normalizeName } from '@/app/utils/nameUtils';

interface CellBadgeProps {
  header: string;
  value: string;
}

// Generate initials from a name (e.g. "Ratna Deepika Vallabhaneni" -> "RD")
function getInitials(name: string): string {
  if (!name || name === '-') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function CellBadge({ header, value }: CellBadgeProps) {
  if (!value || value === '-') {
    return <span className="text-slate-400 font-mono text-xs select-none">-</span>;
  }

  const h = header.toLowerCase();
  const v = value.toLowerCase();

  // 1. STATUS BADGES — Vivid, high-contrast, professional status capsules
  if (h.includes('status')) {
    let dotColor = '#2563eb';
    let bg = '#eff6ff';
    let textColor = '#1e3a8a';
    let borderColor = '#bfdbfe';

    if (v.includes('interview') && (v.includes('final') || v.includes('round'))) {
      dotColor = '#7c3aed';
      bg = '#f5f3ff';
      textColor = '#4c1d95';
      borderColor = '#ddd6fe';
    } else if (v.includes('interview') && (v.includes('screen') || v.includes('round 1') || v.includes('1st'))) {
      dotColor = '#0284c7';
      bg = '#f0f9ff';
      textColor = '#0369a1';
      borderColor = '#bae6fd';
    } else if (v.includes('interview')) {
      dotColor = '#2563eb';
      bg = '#eff6ff';
      textColor = '#1e40af';
      borderColor = '#bfdbfe';
    } else if (v.includes('submitted')) {
      dotColor = '#059669';
      bg = '#ecfdf5';
      textColor = '#064e3b';
      borderColor = '#a7f3d0';
    } else if (v.includes('offer') || v.includes('placed') || v.includes('hired')) {
      dotColor = '#10b981';
      bg = '#d1fae5';
      textColor = '#064e3b';
      borderColor = '#6ee7b7';
    } else if (v.includes('reject') || v.includes('declined')) {
      dotColor = '#dc2626';
      bg = '#fef2f2';
      textColor = '#991b1b';
      borderColor = '#fecaca';
    } else if (v.includes('hold')) {
      dotColor = '#d97706';
      bg = '#fffbeb';
      textColor = '#78350f';
      borderColor = '#fde68a';
    }

    return (
      <span
        className="inline-flex items-start gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight shadow-2xs leading-snug break-words max-w-full text-left"
        style={{
          backgroundColor: bg,
          color: textColor,
          border: `1px solid ${borderColor}`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: dotColor }}
        />
        <span className="break-words leading-tight">{value}</span>
      </span>
    );
  }

  // 2. CONSULTANT NAME — Executive Identity Card (Initials Badge + High-Contrast Bold Name)
  if (h.includes('consultant') || h.includes('candidate')) {
    const initials = getInitials(value);
    return (
      <div className="flex items-start gap-1.5 max-w-full">
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-[9.5px] font-black shrink-0 text-white shadow-2xs mt-0.5"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {initials}
        </span>
        <span className="font-bold text-[12px] text-slate-900 leading-snug break-words">
          {value}
        </span>
      </div>
    );
  }

  // 3. POSITION / ROLE — Professional crisp typography with clean multi-line wrapping
  if (h.includes('position') || h.includes('role') || h.includes('job')) {
    return (
      <span className="font-semibold text-[11.5px] text-slate-850 leading-snug break-words block max-w-full">
        {value}
      </span>
    );
  }

  // 4. VENDOR / CLIENT — Clean corporate tag with crisp contrast
  if (h.includes('vendor') || h.includes('client')) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold tracking-tight bg-slate-100 text-slate-900 border border-slate-300 shadow-2xs break-words leading-tight text-left max-w-full">
        <span className="break-words">{value}</span>
      </span>
    );
  }

  // 5. MARKETER & SUPPORT — Clean person badge with wrapping support
  if (h.includes('marketer') || h.includes('support')) {
    const isMarketer = h.includes('marketer');
    const dotColor = isMarketer ? '#d97706' : '#db2777';
    const bg = isMarketer ? '#fffbeb' : '#fdf2f8';
    const text = isMarketer ? '#78350f' : '#831843';
    const border = isMarketer ? '#fde68a' : '#fbcfe8';
    const displayVal = isMarketer ? normalizeName(value) : value;

    return (
      <span
        className="inline-flex items-start gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-2xs leading-snug break-words max-w-full text-left"
        style={{
          backgroundColor: bg,
          color: text,
          border: `1px solid ${border}`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: dotColor }}
        />
        <span className="break-words leading-tight">{displayVal}</span>
      </span>
    );
  }

  // 6. UPDATE / NOTES — Multi-line wrapped text
  if (h.includes('update') || h.includes('note') || h.includes('comment')) {
    return (
      <div
        className="text-[11.5px] leading-relaxed text-slate-800 pl-2 border-l-2 py-0.5 break-words whitespace-pre-wrap w-full min-w-0"
        style={{
          borderColor: 'var(--color-accent)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {value}
      </div>
    );
  }

  // 7. DATE — Non-wrapping, crisp tabular typography
  if (h === 'date' || (h.includes('date') && !h.includes('update'))) {
    return (
      <span className="font-mono text-xs font-bold text-slate-900 whitespace-nowrap tabular-nums">
        {value}
      </span>
    );
  }

  // 8. TIME — Crisp readable date-time string
  if (h.includes('time')) {
    return (
      <span className="text-[11.5px] font-semibold text-slate-800 leading-snug break-words block max-w-full">
        {value}
      </span>
    );
  }

  // 9. RECRUITER CONTACTS
  if (h.includes('recruiter') && !h.includes('email') && !h.includes('phone')) {
    return (
      <span className="font-bold text-xs text-slate-900 leading-snug break-words block max-w-full">
        {value}
      </span>
    );
  }

  // 10. EMAIL / PHONE
  if (h.includes('phone')) {
    return (
      <span className="font-mono text-[11px] font-medium text-slate-700 select-all whitespace-nowrap block max-w-full">
        {value}
      </span>
    );
  }

  if (h.includes('email')) {
    return (
      <span className="font-mono text-[11px] font-medium text-slate-700 select-all break-words leading-tight block max-w-full">
        {value}
      </span>
    );
  }

  // 11. RATE / PRICE / COMPENSATION
  if (h.includes('rate') || h.includes('price') || h.includes('salary') || h.includes('amount')) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-md font-mono text-xs font-black bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs">
        {value}
      </span>
    );
  }

  // Default fallback
  return (
    <span className="text-xs font-medium text-slate-850 break-words leading-snug">
      {value}
    </span>
  );
}
