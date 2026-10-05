'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getInitials } from '@/app/utils/nameUtils';

interface InterviewDocketProps {
  data: Record<string, string>[];
  columnHeaders: string[];
  onSelectRow?: (rowId: string) => void;
}

interface ParsedInterview {
  id: string;
  candidate: string;
  position: string;
  client: string;
  timeRaw: string;
  status: string;
  support: string;
  marketer: string;
  timestamp: number;
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  timeFormatted: string;
  dayType: 'today' | 'tomorrow' | 'other';
  countdownText: string;
  countdownType: 'live' | 'urgent' | 'upcoming' | 'tomorrow' | 'past';
}

function parseInterviewDateTime(timeStr: string, dateStr: string) {
  const combined = `${timeStr || ''} ${dateStr || ''}`.trim();
  if (!combined) return null;

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  // 1. Check ISO format YYYY-MM-DD
  const isoMatch = combined.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10) - 1;
    day = parseInt(isoMatch[3], 10);
  }

  // 2. Check month names
  if (month === null) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mMatch = combined.match(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i
    );
    if (mMatch) {
      const sub = mMatch[1].toLowerCase().substring(0, 3);
      month = months.indexOf(sub);
      const dMatch = combined.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      const yMatch = combined.match(/\b(20\d{2})\b/);
      if (dMatch) day = parseInt(dMatch[1], 10);
      year = yMatch ? parseInt(yMatch[1], 10) : 2026;
    }
  }

  if (year === null || month === null || day === null) return null;

  // 3. Extract hours & minutes
  let hours = 9;
  let minutes = 0;
  const timeMatch = combined.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  } else {
    const simpleHourMatch = combined.match(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (simpleHourMatch) {
      hours = parseInt(simpleHourMatch[1], 10);
      const meridiem = simpleHourMatch[2]?.toLowerCase();
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
    }
  }

  const d = new Date(year, month, day, hours, minutes);
  const timeFormatted = `${hours % 12 || 12}:${minutes < 10 ? '0' + minutes : minutes} ${hours >= 12 ? 'PM' : 'AM'}`;

  return {
    year,
    month,
    day,
    hours,
    minutes,
    timestamp: d.getTime(),
    timeFormatted,
  };
}

export default function InterviewDocket({ data, columnHeaders, onSelectRow }: InterviewDocketProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [viewScope, setViewScope] = useState<'today_tomorrow' | 'all_active'>('today_tomorrow');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Load dismissed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('interview_docket_dismissed');
      if (stored === 'true') setIsDismissed(true);
    } catch {}
  }, []);

  // Update current time every 30 seconds for live countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleDismiss = () => {
    setIsDismissed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('interview_docket_dismissed', String(next));
      } catch {}
      return next;
    });
  };

  // Find helper column getter
  const getField = (row: Record<string, string>, targets: string[]) => {
    for (const t of targets) {
      const found = columnHeaders.find((h) => h.toLowerCase().includes(t));
      if (found && row[found] && row[found] !== '-') return row[found];
    }
    return '';
  };

  // Parse all rows into interview objects
  const parsedInterviews: ParsedInterview[] = useMemo(() => {
    const now = currentTime;
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    const tomorrow = new Date(todayY, todayM, todayD + 1);
    const tomY = tomorrow.getFullYear();
    const tomM = tomorrow.getMonth();
    const tomD = tomorrow.getDate();

    const list: ParsedInterview[] = [];

    data.forEach((row) => {
      const timeVal = getField(row, ['interview time', 'time']);
      const dateVal = getField(row, ['date']);
      const parsed = parseInterviewDateTime(timeVal, dateVal);
      if (!parsed) return;

      const isToday = parsed.year === todayY && parsed.month === todayM && parsed.day === todayD;
      const isTomorrow = parsed.year === tomY && parsed.month === tomM && parsed.day === tomD;
      const dayType: 'today' | 'tomorrow' | 'other' = isToday ? 'today' : isTomorrow ? 'tomorrow' : 'other';

      // Compute countdown
      let countdownText = '';
      let countdownType: 'live' | 'urgent' | 'upcoming' | 'tomorrow' | 'past' = 'upcoming';

      const diffMs = parsed.timestamp - now.getTime();
      const diffMins = Math.round(diffMs / (1000 * 60));

      if (isToday) {
        if (diffMins > 0 && diffMins <= 60) {
          countdownText = `⚡ Starts in ${diffMins}m`;
          countdownType = 'urgent';
        } else if (diffMins > 60 && diffMins < 720) {
          const h = Math.floor(diffMins / 60);
          const m = diffMins % 60;
          countdownText = `Starts in ${h}h ${m > 0 ? `${m}m` : ''}`;
          countdownType = 'upcoming';
        } else if (diffMins <= 0 && diffMins >= -60) {
          countdownText = `🔴 In Progress Now`;
          countdownType = 'live';
        } else if (diffMins < -60) {
          countdownText = `✓ Completed earlier today`;
          countdownType = 'past';
        } else {
          countdownText = `Today at ${parsed.timeFormatted}`;
          countdownType = 'upcoming';
        }
      } else if (isTomorrow) {
        countdownText = `Tomorrow at ${parsed.timeFormatted}`;
        countdownType = 'tomorrow';
      } else {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        countdownText = `${monthNames[parsed.month]} ${parsed.day} at ${parsed.timeFormatted}`;
        countdownType = diffMs > 0 ? 'upcoming' : 'past';
      }

      list.push({
        id: row.id,
        candidate: getField(row, ['consultant', 'candidate', 'name']) || 'Unnamed Candidate',
        position: getField(row, ['position', 'role', 'title']) || '',
        client: getField(row, ['vendor', 'client', 'company']) || 'Client / Vendor',
        timeRaw: timeVal || parsed.timeFormatted,
        status: getField(row, ['status']) || 'Interview',
        support: getField(row, ['support']) || '',
        marketer: getField(row, ['marketer', 'recruiter']) || '',
        timestamp: parsed.timestamp,
        year: parsed.year,
        month: parsed.month,
        day: parsed.day,
        hours: parsed.hours,
        minutes: parsed.minutes,
        timeFormatted: parsed.timeFormatted,
        dayType,
        countdownText,
        countdownType,
      });
    });

    // Chronological order: earliest upcoming first
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [data, columnHeaders, currentTime]);

  const todayInterviews = useMemo(() => parsedInterviews.filter((i) => i.dayType === 'today'), [parsedInterviews]);
  const tomorrowInterviews = useMemo(() => parsedInterviews.filter((i) => i.dayType === 'tomorrow'), [parsedInterviews]);

  // Primary active list for Today + Tomorrow
  const todayTomorrowList = useMemo(() => [...todayInterviews, ...tomorrowInterviews], [todayInterviews, tomorrowInterviews]);

  // Fallback to latest / upcoming if 0 today & tomorrow (e.g. historical data or weekend)
  const displayList = useMemo(() => {
    if (viewScope === 'all_active' || todayTomorrowList.length === 0) {
      // Pick upcoming, or if none upcoming, the latest 6 active interviews
      const upcoming = parsedInterviews.filter((i) => i.timestamp >= currentTime.getTime() - 24 * 3600 * 1000);
      return upcoming.length > 0 ? upcoming.slice(0, 8) : parsedInterviews.slice(-6).reverse();
    }
    return todayTomorrowList;
  }, [viewScope, todayTomorrowList, parsedInterviews, currentTime]);

  // Render dismissed collapsed banner
  if (isDismissed) {
    return (
      <div className="w-full mb-2.5 flex items-center justify-between px-3 py-1.5 rounded-lg border theme-border bg-slate-50/80 text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-sm">📅</span>
          <span className="font-bold text-slate-800">Today & Tomorrow&apos;s Docket:</span>
          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full text-[11px]">
            {todayInterviews.length} Today
          </span>
          <span className="bg-blue-100 text-blue-900 border border-blue-300 font-bold px-2 py-0.5 rounded-full text-[11px]">
            {tomorrowInterviews.length} Tomorrow
          </span>
        </div>
        <button
          type="button"
          onClick={toggleDismiss}
          className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer flex items-center gap-1"
        >
          <span>📌 Expand Docket</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full mb-3 rounded-xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-slate-50/90 p-3 sm:p-3.5 shadow-sm transition-all"
    >
      {/* Top Docket Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-amber-200/80">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight uppercase">
                Interview Docket
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-amber-200/80 text-amber-900 border border-amber-400 shadow-2xs">
                {todayInterviews.length} Today
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs">
                {tomorrowInterviews.length} Tomorrow
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Chronological schedule with live countdowns &amp; support assignments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {todayTomorrowList.length === 0 && (
            <button
              type="button"
              onClick={() => setViewScope((prev) => (prev === 'today_tomorrow' ? 'all_active' : 'today_tomorrow'))}
              className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer"
            >
              {viewScope === 'today_tomorrow' ? '👁️ Show Recent/Upcoming' : '📅 Filter Today/Tomorrow Only'}
            </button>
          )}

          <button
            type="button"
            onClick={toggleDismiss}
            className="text-[11px] font-bold text-slate-700 hover:text-slate-950 px-2 py-1 rounded hover:bg-black/5 transition-colors cursor-pointer flex items-center gap-1"
            title="Dismiss / Minimize Docket"
          >
            ✕ Hide Docket
          </button>
        </div>
      </div>

      {/* Cards Strip: Horizontal scrollable on small screens, responsive grid on large */}
      {displayList.length === 0 ? (
        <div className="py-4 text-center text-xs font-semibold text-slate-600 bg-white/70 rounded-lg border border-amber-200">
          No interviews scheduled for Today or Tomorrow.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {displayList.map((item) => {
            const hasSupport = item.support && item.support.trim() !== '' && item.support !== '-';

            return (
              <div
                key={item.id}
                onClick={() => onSelectRow?.(item.id)}
                className={`flex flex-col justify-between p-3 rounded-xl border bg-white shadow-xs hover:shadow-md transition-all cursor-pointer relative group ${
                  item.countdownType === 'live'
                    ? 'border-rose-400 ring-2 ring-rose-200'
                    : item.countdownType === 'urgent'
                    ? 'border-amber-400 ring-1 ring-amber-300'
                    : item.dayType === 'today'
                    ? 'border-amber-300'
                    : 'border-slate-200'
                }`}
              >
                {/* Header: Status Tag & Countdown Pill */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 truncate max-w-[130px]">
                    {item.status}
                  </span>

                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-2xs ${
                      item.countdownType === 'live'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : item.countdownType === 'urgent'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : item.countdownType === 'tomorrow'
                        ? 'bg-sky-100 text-sky-900 border border-sky-300'
                        : item.countdownType === 'past'
                        ? 'bg-slate-100 text-slate-600 border border-slate-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {item.countdownText}
                  </span>
                </div>

                {/* Candidate & Position */}
                <div className="mb-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-amber-800 transition-colors truncate">
                    {item.candidate}
                  </h4>
                  {item.position && (
                    <p className="text-[11px] font-medium text-slate-600 truncate">
                      {item.position}
                    </p>
                  )}
                </div>

                {/* Timing & Client Details */}
                <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-700 pb-2 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-400 shrink-0">🏢</span>
                    <span className="truncate font-bold text-slate-900">{item.client}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-400 shrink-0">⏱️</span>
                    <span className="font-mono text-slate-800 truncate">{item.timeRaw}</span>
                  </div>
                </div>

                {/* Footer: Support Assignment & Recruiter */}
                <div className="flex items-center justify-between gap-1 text-[11px] pt-0.5">
                  {/* Support Assignment */}
                  <div className="truncate">
                    {hasSupport ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10.5px] bg-indigo-50 text-indigo-900 border border-indigo-200 truncate">
                        <span>🎧</span>
                        <span className="truncate">{item.support}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10.5px] bg-amber-50 text-amber-800 border border-amber-300">
                        <span>⚠️</span> Unassigned
                      </span>
                    )}
                  </div>

                  {/* Marketer Initials Avatar */}
                  {item.marketer && (
                    <div
                      className="flex items-center gap-1 shrink-0"
                      title={`Recruiter: ${item.marketer}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[9.5px] font-extrabold flex items-center justify-center border border-slate-300">
                        {getInitials(item.marketer)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 truncate max-w-[60px]">
                        {item.marketer}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
