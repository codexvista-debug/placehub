'use client';

import React from 'react';

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
    return <span className="theme-text-muted italic text-[11px]">-</span>;
  }

  const h = header.toLowerCase();
  const v = value.toLowerCase();

  // 1. STATUS BADGES — Dynamic high-contrast status capsule with glowing indicator dot
  if (h.includes('status')) {
    let dotColor = '#3b82f6';
    let bgGradient = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
    let textColor = '#1e40af';
    let borderColor = '#93c5fd';
    let glow = 'rgba(59, 130, 246, 0.2)';

    if (v.includes('interview') && (v.includes('final') || v.includes('round'))) {
      dotColor = '#8b5cf6';
      bgGradient = 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)';
      textColor = '#5b21b6';
      borderColor = '#c4b5fd';
      glow = 'rgba(139, 92, 246, 0.25)';
    } else if (v.includes('interview') && v.includes('screen')) {
      dotColor = '#0284c7';
      bgGradient = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
      textColor = '#0369a1';
      borderColor = '#7dd3fc';
      glow = 'rgba(2, 132, 199, 0.2)';
    } else if (v.includes('interview')) {
      dotColor = '#2563eb';
      bgGradient = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
      textColor = '#1d4ed8';
      borderColor = '#93c5fd';
      glow = 'rgba(37, 99, 235, 0.2)';
    } else if (v.includes('submitted')) {
      dotColor = '#10b981';
      bgGradient = 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)';
      textColor = '#065f46';
      borderColor = '#6ee7b7';
      glow = 'rgba(16, 185, 129, 0.2)';
    } else if (v.includes('offer') || v.includes('placed')) {
      dotColor = '#059669';
      bgGradient = 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)';
      textColor = '#047857';
      borderColor = '#34d399';
      glow = 'rgba(5, 150, 105, 0.3)';
    } else if (v.includes('reject') || v.includes('declined')) {
      dotColor = '#ef4444';
      bgGradient = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
      textColor = '#991b1b';
      borderColor = '#fca5a5';
      glow = 'rgba(239, 68, 68, 0.2)';
    } else if (v.includes('hold')) {
      dotColor = '#f59e0b';
      bgGradient = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
      textColor = '#92400e';
      borderColor = '#fcd34d';
      glow = 'rgba(245, 158, 11, 0.2)';
    }

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-xs whitespace-normal break-words max-w-full"
        style={{
          background: bgGradient,
          color: textColor,
          border: `1px solid ${borderColor}`,
          boxShadow: `0 1px 3px ${glow}`,
        }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0 animate-pulse"
          style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
        />
        <span>{value}</span>
      </span>
    );
  }

  // 2. CONSULTANT NAME — Executive Identity Card (Initials Avatar + Bold crisp typography)
  if (h.includes('consultant')) {
    const initials = getInitials(value);
    return (
      <div className="inline-flex items-center gap-2 max-w-full">
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
            color: 'var(--color-accent-text)',
          }}
        >
          {initials}
        </span>
        <span className="font-bold text-[12px] theme-text leading-tight break-words">
          {value}
        </span>
      </div>
    );
  }

  // 3. POSITION / ROLE — Clean role title with sleek domain pill (no clunky full-text wrapper)
  if (h.includes('position') || h.includes('role')) {
    return (
      <div className="flex flex-col gap-0.5 max-w-full">
        <span className="font-semibold text-[11.5px] theme-text leading-snug break-words">
          {value}
        </span>
      </div>
    );
  }

  // 4. VENDOR / CLIENT — Corporate Entity Badge (Sharp metallic/acrylic capsule)
  if (h.includes('vendor') || h.includes('client')) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide shadow-2xs max-w-full break-words"
        style={{
          backgroundColor: 'var(--color-surface-alt)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
      >
        <span className="text-[10px] opacity-60">🏢</span>
        <span>{value}</span>
      </span>
    );
  }

  // 5. MARKETER & SUPPORT — Team Member Chip with colored ring
  if (h.includes('marketer') || h.includes('support')) {
    const isMarketer = h.includes('marketer');
    const ringColor = isMarketer ? '#f59e0b' : '#ec4899';
    const bg = isMarketer ? '#fffbeb' : '#fdf2f8';
    const text = isMarketer ? '#92400e' : '#9d174d';
    const border = isMarketer ? '#fde68a' : '#fbcfe8';

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-2xs max-w-full"
        style={{
          backgroundColor: bg,
          color: text,
          border: `1px solid ${border}`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: ringColor }}
        />
        <span className="truncate">{value}</span>
      </span>
    );
  }

  // 6. DATE — Crisp tabular badge with calendar icon
  if (h.includes('date')) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold tabular-nums shadow-2xs"
        style={{
          backgroundColor: 'var(--color-surface-alt)',
          color: 'var(--color-text-body)',
          border: '1px solid var(--color-border)',
        }}
      >
        <span className="text-[10px] opacity-70">📅</span>
        <span>{value}</span>
      </span>
    );
  }

  // 7. TIME — Precise Clock Chip
  if (h.includes('time')) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium leading-tight shadow-2xs"
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-body)',
          border: '1px solid var(--color-border-soft)',
        }}
      >
        <span className="text-[10px] opacity-60">🕒</span>
        <span>{value}</span>
      </span>
    );
  }

  // 8. RECRUITER CONTACTS — Contact card styling
  if (h.includes('recruiter') && !h.includes('email') && !h.includes('phone')) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold shadow-2xs"
        style={{
          backgroundColor: 'var(--color-surface-alt)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
      >
        <span>👤 {value}</span>
      </span>
    );
  }

  // 9. EMAIL / PHONE
  if (h.includes('email') || h.includes('phone')) {
    return (
      <span
        className="font-mono text-[10.5px] px-1.5 py-0.5 rounded border border-dashed theme-border theme-text-muted break-all select-all"
        style={{ backgroundColor: 'var(--color-surface-alt)' }}
      >
        {value}
      </span>
    );
  }

  // 10. UPDATE / NOTES — Clean readable typography (no pill)
  if (h.includes('update') || h.includes('note') || h.includes('comment')) {
    return (
      <div
        className="text-[11px] leading-relaxed theme-text-body pl-2 border-l-2 py-0.5 max-w-full break-words"
        style={{ borderColor: 'var(--color-accent)' }}
      >
        {value}
      </div>
    );
  }

  // 11. RATE / PRICE / COMPENSATION
  if (h.includes('rate') || h.includes('price') || h.includes('salary')) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-extrabold shadow-2xs"
        style={{
          backgroundColor: '#ecfdf5',
          color: '#047857',
          border: '1px solid #a7f3d0',
        }}
      >
        {value}
      </span>
    );
  }

  // Default fallback badge
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-[11px] shadow-2xs max-w-full break-words leading-tight"
      style={{
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-body)',
        border: '1px solid var(--color-border)',
      }}
    >
      {value}
    </span>
  );
}
