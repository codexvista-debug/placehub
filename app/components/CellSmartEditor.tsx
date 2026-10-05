'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { normalizeName, getInitials } from '@/app/utils/nameUtils';

interface SchemaInfo {
  type: string;
  options: string[];
}

interface CellSmartEditorProps {
  rowId: string;
  header: string;
  initialValue: string;
  schema?: SchemaInfo;
  uniqueValues?: string[];
  isNearRight?: boolean;
  isNearBottom?: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function isComboboxHeader(header: string, schema?: SchemaInfo): boolean {
  if (schema && (schema.type === 'select' || schema.type === 'multi_select' || schema.type === 'status')) {
    return true;
  }
  const h = header.toLowerCase();
  return (
    h.includes('vendor') ||
    h.includes('client') ||
    h.includes('status') ||
    h.includes('marketer') ||
    h.includes('recruiter') ||
    h.includes('support') ||
    h.includes('mode') ||
    h.includes('type')
  );
}

export default function CellSmartEditor({
  header,
  initialValue,
  schema,
  uniqueValues = [],
  isNearRight = false,
  isNearBottom = false,
  onSave,
  onCancel,
}: CellSmartEditorProps) {
  const isCombobox = isComboboxHeader(header, schema);
  const isTimeField = header.toLowerCase().includes('time') || header.toLowerCase().includes('date');

  // Text mode state
  const [textValue, setTextValue] = useState(initialValue === '-' ? '' : initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Combobox mode state
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus textarea or input on mount
  useEffect(() => {
    if (isCombobox) {
      inputRef.current?.focus();
    } else {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // place cursor at end
        textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
      }
    }
  }, [isCombobox]);

  // Compute merged prefilled options for combobox
  const prefilledOptions = useMemo(() => {
    const h = header.toLowerCase();
    const set = new Set<string>();

    // Schema options
    if (schema?.options) {
      schema.options.forEach((opt) => {
        if (opt && opt !== '-') set.add(opt.trim());
      });
    }

    // Default suggestions based on column header
    if (h.includes('status')) {
      [
        'Screening',
        'Interview',
        'Round 1',
        'Round 2',
        'Round 3',
        'Final Round',
        'Assessment',
        'Offer',
        'Rejected',
        'On Hold',
        'Submitted',
      ].forEach((s) => set.add(s));
    } else if (h.includes('marketer') || h.includes('recruiter')) {
      [
        'Waseem',
        'Sravani',
        'Jacob',
        'Bhaskar',
        'Veera',
        'Salman',
        'Rajesh',
        'Mahendra',
      ].forEach((m) => set.add(m));
    } else if (h.includes('support')) {
      ['Self', 'Internal', 'External', 'Proxy', 'None', 'Assisted'].forEach((s) => set.add(s));
    }

    // Data-driven options from table
    uniqueValues.forEach((val) => {
      if (val && val !== '-' && val.trim().length > 0) {
        if (h.includes('marketer') || h.includes('recruiter')) {
          set.add(normalizeName(val.trim()));
        } else {
          set.add(val.trim());
        }
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [header, schema, uniqueValues]);

  // Filtered combobox options
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return prefilledOptions;
    const q = query.toLowerCase().trim();
    return prefilledOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [prefilledOptions, query]);

  // Check if query is an exact match to any prefilled option
  const exactMatchExists = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prefilledOptions.some((opt) => opt.toLowerCase() === q);
  }, [prefilledOptions, query]);

  // Keep highlighted index in bounds
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Smart timezone replacer/appender for Interview Time
  const handleQuickTimezone = (tz: string) => {
    let current = textValue.trim();
    const timezones = ['EST', 'EDT', 'CST', 'CDT', 'PST', 'PDT', 'MST', 'MDT', 'IST', 'UTC', 'GMT'];
    const regex = new RegExp(`\\b(${timezones.join('|')})\\b`, 'i');

    if (regex.test(current)) {
      current = current.replace(regex, tz);
    } else {
      current = current ? `${current} ${tz}` : tz;
    }
    setTextValue(current);
    textareaRef.current?.focus();
  };

  // Keyboard navigation for Combobox
  const handleComboboxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIdx = exactMatchExists || !query.trim() ? filteredOptions.length - 1 : filteredOptions.length; // +1 for "use new" item
      setHighlightedIndex((prev) => (prev < maxIdx ? prev + 1 : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const maxIdx = exactMatchExists || !query.trim() ? filteredOptions.length - 1 : filteredOptions.length;
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : maxIdx));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      // If typing a custom query and "Use new" is selected (index 0 when not exact match)
      if (query.trim() && !exactMatchExists && highlightedIndex === 0) {
        onSave(query.trim());
        return;
      }

      const optionIndex = query.trim() && !exactMatchExists ? highlightedIndex - 1 : highlightedIndex;
      if (filteredOptions[optionIndex]) {
        onSave(filteredOptions[optionIndex]);
      } else if (query.trim()) {
        onSave(query.trim());
      }
    }
  };

  // Keyboard handler for Text Area
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    // Enter without Shift saves
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(textValue.trim());
    }
  };

  // Status color pill helper for Combobox
  const getStatusBadgeColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('offer')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (s.includes('final') || s.includes('round 3')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (s.includes('round 2') || s.includes('round 1')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (s.includes('interview')) return 'bg-sky-100 text-sky-800 border-sky-300';
    if (s.includes('screening')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (s.includes('reject')) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (s.includes('hold')) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  return (
    <>
      {/* Invisible backdrop to capture clicks outside */}
      <div
        className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[0.5px]"
        onClick={(e) => {
          e.stopPropagation();
          if (isCombobox) {
            onSave(query.trim() || initialValue);
          } else {
            onSave(textValue.trim());
          }
        }}
      />

      {/* Floating Card Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute z-50 bg-white rounded-xl shadow-2xl border border-slate-300 text-slate-900 p-3.5 transition-all animate-in fade-in zoom-in-95 duration-100 ${
          isNearRight ? 'right-0' : 'left-0'
        } ${isNearBottom ? 'bottom-0' : 'top-0'} ${
          isCombobox ? 'w-[320px] sm:w-[360px]' : 'w-[380px] sm:w-[460px]'
        }`}
        style={{
          boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.25), 0 8px 12px -6px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm">
              {isCombobox ? '🏷️' : isTimeField ? '⏱️' : '📝'}
            </span>
            <span className="font-bold text-xs text-slate-800 truncate uppercase tracking-wider">
              {header}
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium shrink-0 border border-slate-200">
              {isCombobox ? 'Quick Select' : 'Full Editor'}
            </span>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 p-1 rounded-md transition-colors text-xs cursor-pointer"
            title="Cancel (Esc)"
          >
            ✕
          </button>
        </div>

        {/* MODE A: COMBOBOX (Prefilled options + Search & Custom Entry) */}
        {isCombobox ? (
          <div className="flex flex-col gap-2">
            {/* Search / Custom input */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs">
                🔍
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder={`Search or type custom ${header}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleComboboxKeyDown}
                className="w-full pl-8 pr-7 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-slate-900 bg-white placeholder:text-slate-500 shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 text-xs p-0.5 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Custom Value Suggestion (if query is typed and not an exact match) */}
            {query.trim().length > 0 && !exactMatchExists && (
              <button
                type="button"
                onClick={() => onSave(query.trim())}
                className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg text-xs border transition-colors cursor-pointer text-left ${
                  highlightedIndex === 0
                    ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-amber-800 font-bold shrink-0">➕ Use new:</span>
                  <span className="truncate underline font-bold">&quot;{query.trim()}&quot;</span>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono shrink-0">
                  Enter ↵
                </span>
              </button>
            )}

            {/* Prefilled Options List */}
            <div
              ref={listRef}
              className="max-h-52 overflow-y-auto flex flex-col gap-1 pr-0.5 border border-slate-200 rounded-lg p-1.5 bg-slate-50/60"
            >
              <div className="flex items-center justify-between px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <span>Suggestions ({filteredOptions.length})</span>
                {initialValue && initialValue !== '-' && (
                  <span className="text-slate-600 font-medium">Current: {initialValue}</span>
                )}
              </div>

              {filteredOptions.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-600 font-medium">
                  No prefilled match.
                  {query.trim() ? ' Press Enter to use custom value.' : ''}
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.toLowerCase() === initialValue.toLowerCase();
                  const effectiveIndex = query.trim() && !exactMatchExists ? idx + 1 : idx;
                  const isHighlighted = highlightedIndex === effectiveIndex;
                  const isMarketerCol = header.toLowerCase().includes('marketer') || header.toLowerCase().includes('recruiter');
                  const isStatusCol = header.toLowerCase().includes('status');

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onSave(opt)}
                      onMouseEnter={() => setHighlightedIndex(effectiveIndex)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left ${
                        isHighlighted
                          ? 'bg-amber-500 text-white font-bold shadow-xs'
                          : isSelected
                          ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isMarketerCol && (
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs ${
                              isHighlighted ? 'bg-white text-amber-700' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {getInitials(opt)}
                          </span>
                        )}
                        {isStatusCol && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold shrink-0 ${
                              isHighlighted ? 'bg-white/20 text-white border-white/40' : getStatusBadgeColor(opt)
                            }`}
                          >
                            ●
                          </span>
                        )}
                        <span className="truncate">{opt}</span>
                      </div>

                      {isSelected && (
                        <span
                          className={`text-xs font-bold shrink-0 ${
                            isHighlighted ? 'text-white' : 'text-amber-600'
                          }`}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Combobox Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
              <button
                type="button"
                onClick={() => onSave('-')}
                className="text-rose-600 hover:text-rose-800 hover:underline font-semibold cursor-pointer"
              >
                Clear value (-)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-2.5 py-1 text-slate-800 hover:bg-slate-100 rounded font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => onSave(query.trim())}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-xs transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* MODE B: EXPANDED TEXT EDITOR (Interview Time & Long Text Fields) */
          <div className="flex flex-col gap-2.5">
            {/* Monospace multi-line editor showing full text without horizontal cut-off */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={isTimeField ? 3 : 4}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={`Enter full ${header.toLowerCase()}...`}
                className="w-full p-2.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none leading-relaxed text-slate-900 bg-white shadow-inner resize-none placeholder:text-slate-500 placeholder:font-sans"
              />
              {textValue && (
                <button
                  type="button"
                  onClick={() => setTextValue('')}
                  className="absolute right-2.5 top-2.5 text-slate-600 hover:text-slate-800 text-xs bg-slate-100 hover:bg-slate-200 rounded p-1 transition-colors cursor-pointer"
                  title="Clear text"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Timezone & Helper Chips for Interview Time */}
            {isTimeField && (
              <div className="flex flex-col gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">
                  <span>Quick Timezone</span>
                  <span className="text-[10px] text-slate-500 font-normal">Click to insert / swap</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['EST', 'EDT', 'CST', 'CDT', 'PST', 'PDT', 'IST'].map((tz) => {
                    const isActive = textValue.toUpperCase().includes(tz);
                    return (
                      <button
                        key={tz}
                        type="button"
                        onClick={() => handleQuickTimezone(tz)}
                        className={`px-2 py-0.5 text-xs font-mono font-bold rounded transition-colors cursor-pointer border ${
                          isActive
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 border-slate-300'
                        }`}
                      >
                        {tz}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Helper shortcuts & Action Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-[10.5px] text-slate-600 font-medium">
                Press <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded text-[9px] font-mono font-bold">Enter</kbd> to save, <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded text-[9px] font-mono font-bold">Esc</kbd> to cancel
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onSave(textValue.trim())}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>✓</span> Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
