'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface DropdownOptions {
  consultants: string[];
  marketers: string[];
  supports: string[];
  clients: string[];
  positions: string[];
  statuses: string[];
}

export default function ExtractPage() {
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractSuccessMsg, setExtractSuccessMsg] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    interviewTime: '',
    consultantName: '',
    position: '',
    client: '',
    status: 'Interview',
    marketer: '',
    support: '',
    recruiter: '',
    recruiterEmail: '',
    recruiterPhone: '',
    update: '',
  });

  // Saving state to Notion
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Existing suggestions loaded from Notion database
  const [options, setOptions] = useState<DropdownOptions>({
    consultants: [],
    marketers: [],
    supports: [],
    clients: [],
    positions: [],
    statuses: ['Interview', 'Final Round', 'Round 1', 'Round 2', 'Round 3', 'Technical Interview', 'Client Interview', 'Screening', 'Assessment', 'Completed'],
  });

  // Fetch unique existing values on mount to populate autocomplete suggestions
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/fetch-placements');
        if (res.ok) {
          const json = await res.json();
          if (json.placements && Array.isArray(json.placements)) {
            const list: Record<string, string>[] = json.placements;
            const getUniques = (keyMatch: string) => {
              const set = new Set<string>();
              list.forEach((row) => {
                Object.keys(row).forEach((col) => {
                  if (col.toLowerCase().includes(keyMatch.toLowerCase())) {
                    const val = row[col];
                    if (val && val !== '-' && val.trim().length > 1) {
                      set.add(val.trim());
                    }
                  }
                });
              });
              return Array.from(set).sort();
            };

            setOptions((prev) => ({
              ...prev,
              consultants: getUniques('consultant'),
              marketers: getUniques('marketer'),
              supports: getUniques('support'),
              clients: getUniques('client').length > 0 ? getUniques('client') : getUniques('vendor'),
              positions: getUniques('position'),
              statuses: Array.from(new Set([...prev.statuses, ...getUniques('status')])).filter(Boolean),
            }));
          }
        }
      } catch (err) {
        console.warn('Could not load options for autocomplete:', err);
      }
    }
    loadOptions();
  }, []);

  // Intelligent Multi-Pattern Extraction Engine
  const handleQuickExtract = () => {
    if (!rawText.trim()) return;
    setIsExtracting(true);
    setExtractSuccessMsg(false);

    const text = rawText;

    // 1. Consultant Name Extraction
    let extractedConsultant = '';
    const consultantPatterns = [
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:has\s+received|received|has\s+got|got|has\s+an|is\s+having|has\s+been|scheduled)/m,
      /(?:Consultant(?:\s+Name)?|Candidate(?:\s+Name)?|Name)\s*[:\-]\s*([A-Za-z\s\.\'\-]+?)(?:\n|\r|$|\|)/i,
      /(?:Interview scheduled for|Invite for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    ];
    for (const pattern of consultantPatterns) {
      const match = text.match(pattern);
      if (match && match[1]?.trim()) {
        extractedConsultant = match[1].trim();
        break;
      }
    }

    // 2. Status Extraction
    let extractedStatus = 'Interview';
    if (/FINAL\s+ROUND(?:\s+OF\s+INTERVIEW)?/i.test(text)) {
      extractedStatus = 'Final Round';
    } else if (/ROUND\s*1|1ST\s+ROUND|FIRST\s+ROUND/i.test(text)) {
      extractedStatus = 'Round 1';
    } else if (/ROUND\s*2|2ND\s+ROUND|SECOND\s+ROUND/i.test(text)) {
      extractedStatus = 'Round 2';
    } else if (/ROUND\s*3|3RD\s+ROUND|THIRD\s+ROUND/i.test(text)) {
      extractedStatus = 'Round 3';
    } else if (/TECH(?:NICAL)?\s+(?:ROUND|INTERVIEW)/i.test(text)) {
      extractedStatus = 'Technical Interview';
    } else if (/CLIENT\s+(?:ROUND|INTERVIEW)/i.test(text)) {
      extractedStatus = 'Client Interview';
    } else if (/SCREENING|PHONE\s+SCREEN/i.test(text)) {
      extractedStatus = 'Screening';
    } else if (/ASSESSMENT|CODING\s+ASSESSMENT|\bOA\b/i.test(text)) {
      extractedStatus = 'Assessment';
    } else if (/OFFER|PLACED/i.test(text)) {
      extractedStatus = 'Completed';
    }

    // 3. Vendor / Client Extraction
    let extractedClient = '';
    const clientPatterns = [
      /(?:with|for\s+client|at|client:?|vendor:?|company:?)\s+([A-Z][A-Za-z0-9&.,\-\s]+?)(?:\.|\n|\r|\!|\?|Can we|Please|INTERVIEW|Job Title|--|$)/i,
      /(?:Client|Vendor|End Client|Company)\s*[:\-]\s*([A-Za-z0-9&.,\-\s]+?)(?:\n|\r|$|\|)/i,
    ];
    for (const pattern of clientPatterns) {
      const match = text.match(pattern);
      if (match && match[1]?.trim()) {
        const val = match[1].trim().replace(/[.,;:]+$/, '');
        if (val.length > 1 && !/^(the|an|a|our|is|for)$/i.test(val)) {
          extractedClient = val;
          break;
        }
      }
    }

    // 4. Support Extraction
    let extractedSupport = '';
    const supportPatterns = [
      /(?:check if|is|assigned|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is available for support|is available for|for support|available for support|can support)/i,
      /(?:Support(?:\s+Person)?|Tech Support)\s*[:\-]\s*([A-Za-z\s\.\'\-]+?)(?:\n|\r|$|\|)/i,
    ];
    for (const pattern of supportPatterns) {
      const match = text.match(pattern);
      if (match && match[1]?.trim()) {
        extractedSupport = match[1].trim();
        break;
      }
    }

    // 5. Marketer Extraction
    let extractedMarketer = '';
    const marketerPatterns = [
      /(?:Marketer(?:\s+Name)?|Marketing By|Marketing|Submitted By)\s*[:\-]\s*([A-Za-z\s\.\'\-]+?)(?:\n|\r|$|\|)/i,
    ];
    for (const pattern of marketerPatterns) {
      const match = text.match(pattern);
      if (match && match[1]?.trim()) {
        extractedMarketer = match[1].trim();
        break;
      }
    }

    // 6. Position / Role Extraction
    let extractedPosition = '';
    const positionPatterns = [
      /(?:Job Title|Position|Role|Designation|Title)\s*[:\-]\s*([^\n\r|]+)/i,
      /(?:for the role of|for the position of|as an?)\s+([A-Za-z0-9\s/.,\+\-#\(\)]+?)(?:with|at|\.|\n|\r|$)/i,
    ];
    for (const pattern of positionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]?.trim()) {
        const val = match[1].trim().replace(/[.,;:\-]+$/, '');
        if (val.length > 2) {
          extractedPosition = val;
          break;
        }
      }
    }

    // 7. Interview Time & Date Extraction
    let extractedTime = '';
    let extractedDate = '';

    const timePatterns = [
      /(?:INTERVIEW TIME|Interview Time|Time Slot|Time|Date & Time)\s*[:\-]\s*([^\n\r]+)/i,
      /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)(?:\s*[-–—to]+\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))?(?:\s*(?:EST|EDT|CST|CDT|PST|PDT|IST|GMT|UTC))?)/i,
    ];
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match && match[1]?.trim()) {
        extractedTime = match[1].trim();
        break;
      }
    }

    // Month to number helper
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    // Date search in text or in the extracted time string
    const textToSearchForDate = `${extractedTime} ${text}`;
    const wordDateMatch = textToSearchForDate.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
    const isoDateMatch = textToSearchForDate.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    const slashDateMatch = textToSearchForDate.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);

    if (wordDateMatch) {
      const month = monthMap[wordDateMatch[1].toLowerCase().substring(0, 3)] || '01';
      const day = wordDateMatch[2].padStart(2, '0');
      const year = wordDateMatch[3];
      extractedDate = `${year}-${month}-${day}`;
    } else if (isoDateMatch) {
      extractedDate = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
    } else if (slashDateMatch) {
      const part1 = slashDateMatch[1].padStart(2, '0');
      const part2 = slashDateMatch[2].padStart(2, '0');
      const year = slashDateMatch[3];
      extractedDate = `${year}-${part1}-${part2}`;
    }

    // 8. Recruiter Email & Phone Extraction
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
    const recruiterMatch = text.match(/(?:Recruiter(?:\s+Name)?|Contact Person|HR)\s*[:\-]\s*([A-Za-z\s\.\'\-]+?)(?:\(|\n|\r|$|email)/i);

    // Update form state with smart extracted values (keeping existing if not extracted)
    setFormData((prev) => ({
      ...prev,
      consultantName: extractedConsultant || prev.consultantName,
      status: extractedStatus || prev.status,
      client: extractedClient || prev.client,
      support: extractedSupport || prev.support,
      marketer: extractedMarketer || prev.marketer,
      position: extractedPosition || prev.position,
      interviewTime: extractedTime || prev.interviewTime,
      date: extractedDate || prev.date,
      recruiter: recruiterMatch ? recruiterMatch[1].trim() : prev.recruiter,
      recruiterEmail: emailMatch ? emailMatch[0] : prev.recruiterEmail,
      recruiterPhone: phoneMatch ? phoneMatch[0] : prev.recruiterPhone,
      update: text.length > 300 ? text.substring(0, 300) + '...' : text,
    }));

    setTimeout(() => {
      setIsExtracting(false);
      setExtractSuccessMsg(true);
      setTimeout(() => setExtractSuccessMsg(false), 5000);
    }, 200);
  };

  // Submit placement directly to Notion API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch('/api/create-placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to save to Notion');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 6000);
    } catch (err: any) {
      console.error('Error saving placement:', err);
      setSaveError(err.message || 'Error communicating with Notion');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full p-2.5 border rounded-lg text-xs sm:text-sm theme-input theme-border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all';

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-[1400px] mx-auto font-[family-name:var(--font-geist-sans)]">
      
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-text flex items-center gap-2">
            <span>⚡</span> Text Extractor &amp; Quick Add
          </h1>
          <p className="text-xs sm:text-sm theme-text-muted mt-1">
            Paste raw interview details or email snippets on the left to auto-extract fields, review, and sync to Notion.
          </p>
        </div>
        <Link
          href="/"
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg text-xs font-bold theme-surface theme-border border shadow-2xs hover:theme-surface-alt transition-colors"
        >
          ← Back to Live Table
        </Link>
      </div>

      {/* Datalists for Autocomplete & Suggestions */}
      <datalist id="consultant-options">
        {options.consultants.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <datalist id="marketer-options">
        {options.marketers.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <datalist id="support-options">
        {options.supports.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <datalist id="client-options">
        {options.clients.map((cl) => (
          <option key={cl} value={cl} />
        ))}
      </datalist>

      <datalist id="position-options">
        {options.positions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {/* 2-COLUMN SIDE BY SIDE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Raw Text Area & Action (5 / 12 width) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-xl shadow-sm border flex flex-col gap-4 theme-surface theme-border">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm theme-text flex items-center gap-1.5">
              <span>📋</span> Paste Raw Text / Email Snippet
            </span>
            {rawText && (
              <button
                type="button"
                onClick={() => setRawText('')}
                className="text-[11px] theme-text-muted hover:text-red-600 transition-colors font-semibold cursor-pointer"
              >
                Clear Text
              </button>
            )}
          </div>

          <textarea
            rows={14}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Paste any text snippet here, e.g.:

Ratna Vallabhaneni has received an invite for FINAL ROUND OF INTERVIEW with Vanguard. Can we check if Sagan is available for support.

INTERVIEW TIME: Fri Oct 02, 2026 04:00 PM - 05:00 PM EST
--
Job Title: AI / ML Software Engineer
Job Description...`}
            className="w-full p-3.5 border rounded-lg text-xs sm:text-sm font-mono leading-relaxed focus:outline-none theme-input theme-border min-h-[300px] resize-y"
          />

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={handleQuickExtract}
              disabled={!rawText.trim() || isExtracting}
              className="w-full py-3 font-bold rounded-lg text-sm transition-all disabled:opacity-40 shadow-xs cursor-pointer flex items-center justify-center gap-2 theme-btn"
            >
              <span>{isExtracting ? '⏳ Extracting Fields...' : '⚡ Auto-Extract Data'}</span>
            </button>

            {extractSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-center gap-1.5 animate-fadeIn">
                <span>✨</span> Extracted successfully! Check and edit the fields on the right.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Extracted Form Fields & Save to Notion (7 / 12 width) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-xl shadow-sm border flex flex-col gap-5 theme-surface theme-border">
          
          <div className="flex items-center justify-between border-b pb-3 theme-border">
            <div>
              <h2 className="font-bold text-base sm:text-lg theme-text flex items-center gap-2">
                <span>✍️</span> Review &amp; Edit Extracted Details
              </h2>
              <p className="text-xs theme-text-muted mt-0.5">
                Verify or tweak the extracted details before saving to Notion.
              </p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold theme-surface-alt theme-border border theme-text">
              Form View
            </span>
          </div>

          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3.5 rounded-lg bg-emerald-100 border border-emerald-400 text-emerald-950 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🎉</span>
                <span>Placement successfully saved to Notion!</span>
              </div>
              <Link
                href="/"
                className="underline font-bold hover:text-emerald-800 text-xs"
              >
                View Live Table →
              </Link>
            </div>
          )}

          {/* Error Banner */}
          {saveError && (
            <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-900 text-xs font-semibold">
              ❌ {saveError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Row 1: Consultant Name & Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Consultant Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="consultant-options"
                  value={formData.consultantName}
                  placeholder="e.g. Ratna Vallabhaneni"
                  onChange={(e) => setFormData({ ...formData, consultantName: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Position / Job Title
                </label>
                <input
                  type="text"
                  list="position-options"
                  value={formData.position}
                  placeholder="e.g. AI / ML Software Engineer"
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 2: Vendor / Client & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Vendor / Client
                </label>
                <input
                  type="text"
                  list="client-options"
                  value={formData.client}
                  placeholder="e.g. Vanguard"
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={inputClass}
                >
                  {options.statuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Date & Interview Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Interview Time
                </label>
                <input
                  type="text"
                  value={formData.interviewTime}
                  placeholder="e.g. Fri Oct 02, 2026 04:00 PM - 05:00 PM EST"
                  onChange={(e) => setFormData({ ...formData, interviewTime: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 4: Marketer & Support */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Marketer
                </label>
                <input
                  type="text"
                  list="marketer-options"
                  value={formData.marketer}
                  placeholder="e.g. Marketer name"
                  onChange={(e) => setFormData({ ...formData, marketer: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Support Person
                </label>
                <input
                  type="text"
                  list="support-options"
                  value={formData.support}
                  placeholder="e.g. Sagan"
                  onChange={(e) => setFormData({ ...formData, support: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 5: Recruiter Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Recruiter Name
                </label>
                <input
                  type="text"
                  value={formData.recruiter}
                  placeholder="e.g. Recruiter Name"
                  onChange={(e) => setFormData({ ...formData, recruiter: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Recruiter Email
                </label>
                <input
                  type="email"
                  value={formData.recruiterEmail}
                  placeholder="recruiter@client.com"
                  onChange={(e) => setFormData({ ...formData, recruiterEmail: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text mb-1">
                  Recruiter Phone
                </label>
                <input
                  type="text"
                  value={formData.recruiterPhone}
                  placeholder="e.g. 555-123-4567"
                  onChange={(e) => setFormData({ ...formData, recruiterPhone: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 6: Update / Description */}
            <div>
              <label className="block text-xs font-bold theme-text mb-1">
                Notes / Update Summary
              </label>
              <textarea
                rows={2}
                value={formData.update}
                onChange={(e) => setFormData({ ...formData, update: e.target.value })}
                placeholder="Optional notes or job description excerpt..."
                className="w-full p-2.5 border rounded-lg text-xs sm:text-sm theme-input theme-border focus:outline-none resize-y"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t theme-border">
              <button
                type="submit"
                disabled={isSaving || !formData.consultantName.trim()}
                className="px-6 py-3 font-bold rounded-lg text-xs sm:text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2 theme-btn"
              >
                <span>{isSaving ? '⏳ Saving to Notion...' : '💾 Save Placement to Notion'}</span>
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
