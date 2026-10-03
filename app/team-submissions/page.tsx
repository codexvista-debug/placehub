'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface SheetData {
  configured: boolean;
  columnHeaders: string[];
  rows: Record<string, string>[];
  totalRows?: number;
  lastSynced?: string;
  error?: string;
  message?: string;
}

// Smart Chronological Date Parser
function parseDateToTimestamp(str: string): number {
  if (!str || str === '-') return 0;
  const clean = str.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  const time = Date.parse(clean);
  if (!isNaN(time)) return time;

  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const mMatch = clean.match(/([a-zA-Z]{3,9})\s+(\d{1,2})\s+(\d{4})/i);
  if (mMatch) {
    const mStr = mMatch[1].toLowerCase().substring(0, 3);
    const m = months[mStr];
    const d = parseInt(mMatch[2], 10);
    const y = parseInt(mMatch[3], 10);
    if (m !== undefined && !isNaN(d) && !isNaN(y)) {
      return new Date(y, m, d).getTime();
    }
  }

  const slashMatch = clean.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10) - 1;
    const d = parseInt(slashMatch[2], 10);
    const y = parseInt(slashMatch[3], 10);
    return new Date(y, m, d).getTime();
  }

  return 0;
}

// Extract Month Label from Date String (e.g. "January 2026")
function extractMonthLabel(str: string): string {
  if (!str || str === '-') return 'Unspecified';
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthsAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const clean = str.trim().replace(/,/g, ' ');
  const wordMatch = clean.match(/([a-zA-Z]{3,9})/);
  if (wordMatch) {
    const sub = wordMatch[1].toLowerCase().substring(0, 3);
    const idx = monthsAbbr.indexOf(sub);
    if (idx !== -1) {
      const yearMatch = clean.match(/\b(20\d{2})\b/);
      const year = yearMatch ? yearMatch[1] : '2026';
      return `${monthNames[idx]} ${year}`;
    }
  }

  const slashMatch = clean.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10) - 1;
    if (m >= 0 && m < 12) {
      return `${monthNames[m]} 2026`;
    }
  }

  return 'Other';
}

// Smart Numerical Parser for rates/amounts ($55.00, 60, etc.)
function parseNumericValue(str: string): number | null {
  if (!str || str === '-') return null;
  const numStr = str.replace(/[^0-9.-]/g, '');
  if (!numStr) return null;
  const val = parseFloat(numStr);
  return isNaN(val) ? null : val;
}

// Normalize name casing for cleaner aggregations (e.g. 'sravani' -> 'Sravani')
function normalizeName(name: string): string {
  if (!name || name === '-') return 'Unknown';
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// Column bubble badge styles for team submissions
function getSubmissionBubbleStyle(headerName: string, cellValue: string) {
  const h = headerName.toLowerCase();
  const v = cellValue.toLowerCase();

  if (h.includes('submitted') || h.includes('status') || h.includes('rejected')) {
    if (v.includes('submitted')) return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    if (v.includes('interview')) return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
    if (v.includes('reject')) return 'bg-red-100 text-red-900 border-red-300 font-bold';
    return 'bg-slate-100 text-slate-800 border-slate-200 font-medium';
  }

  if (h.includes('marketer')) return 'bg-amber-100 text-amber-900 border-amber-300 font-medium';
  if (h.includes('consultant')) return 'bg-teal-100 text-teal-900 border-teal-200 font-medium';
  if (h.includes('position') || h.includes('role')) return 'bg-purple-100 text-purple-900 border-purple-200 font-medium';
  if (h.includes('client') || h.includes('vendor')) return 'bg-sky-100 text-sky-900 border-sky-200 font-semibold';
  if (h.includes('rate') || h.includes('price')) return 'bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold';
  if (h.includes('location')) return 'bg-slate-100 text-slate-800 border-slate-200 font-normal';
  if (h.includes('date')) return 'bg-cyan-50 text-cyan-900 border-cyan-200 font-semibold';

  return 'bg-slate-50 text-slate-700 border-slate-200 font-normal';
}

export default function TeamSubmissionsPage() {
  const [sheetData, setSheetData] = useState<SheetData>({
    configured: false,
    columnHeaders: [],
    rows: [],
  });
  const [loading, setLoading] = useState(true);

  // View Mode: 'metrics' (default) vs 'table'
  const [viewMode, setViewMode] = useState<'table' | 'metrics'>('metrics');

  // Metrics specific filter (e.g. filter metrics by a specific marketer or all)
  const [selectedMarketerFilter, setSelectedMarketerFilter] = useState<string>('all');

  // Table specific state
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Header column popovers, searching, and filtering
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [columnSelectedValues, setColumnSelectedValues] = useState<Record<string, string[]>>({});
  const [sortColumn, setSortColumn] = useState<string | null>('Date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Bulletproof popover close on outside click
  useEffect(() => {
    if (!activePopover) return;
    const handleDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest('[data-popover="true"]') ||
        target.closest('[data-popover-toggle="true"]')
      ) return;
      setActivePopover(null);
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [activePopover]);

  // Fetch sheet data from server API
  const fetchData = async () => {
    try {
      const res = await fetch('/api/fetch-google-sheet', {
        cache: 'no-store',
      });
      const data: SheetData = await res.json();
      setSheetData(data);
    } catch (err: any) {
      setSheetData((prev) => ({
        ...prev,
        error: err.message || 'Failed to connect to Google Sheets',
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute unique options for each column for the filter popovers
  const columnUniqueOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    sheetData.columnHeaders.forEach((header) => {
      const set = new Set<string>();
      sheetData.rows.forEach((row) => {
        const val = row[header];
        if (val && val !== '-') set.add(val);
      });
      map[header] = Array.from(set).sort();
    });
    return map;
  }, [sheetData.rows, sheetData.columnHeaders]);

  // Filter & Smart Chronological / Numerical Sort for Table View
  const filteredAndSortedRows = useMemo(() => {
    let result = [...sheetData.rows];

    // Global Search across all columns
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    // Column-specific search & checkbox filters
    sheetData.columnHeaders.forEach((header) => {
      const search = columnSearch[header]?.toLowerCase();
      if (search) {
        result = result.filter((row) =>
          (row[header] || '').toLowerCase().includes(search)
        );
      }
      const sel = columnSelectedValues[header];
      if (sel && sel.length > 0) {
        result = result.filter((row) => sel.includes(row[header]));
      }
    });

    // Sorting
    if (sortColumn) {
      const colLower = sortColumn.toLowerCase();
      const isDateCol = colLower.includes('date') || colLower.includes('time');
      const isNumericCol = colLower.includes('rate') || colLower.includes('amount') || colLower.includes('price');

      result.sort((a, b) => {
        const rawA = a[sortColumn] || '';
        const rawB = b[sortColumn] || '';

        // 1. Date comparison
        if (isDateCol) {
          const timeA = parseDateToTimestamp(rawA);
          const timeB = parseDateToTimestamp(rawB);
          if (timeA !== timeB) {
            return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
          }
        }

        // 2. Numeric / Currency comparison
        if (isNumericCol) {
          const numA = parseNumericValue(rawA);
          const numB = parseNumericValue(rawB);
          if (numA !== null && numB !== null) {
            return sortDirection === 'asc' ? numA - numB : numB - numA;
          }
        }

        // 3. Fallback standard text comparison
        const textA = rawA.toLowerCase();
        const textB = rawB.toLowerCase();
        if (textA < textB) return sortDirection === 'asc' ? -1 : 1;
        if (textA > textB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [sheetData.rows, sheetData.columnHeaders, globalSearch, columnSearch, columnSelectedValues, sortColumn, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch, columnSearch, columnSelectedValues, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredAndSortedRows.slice(startIndex, startIndex + rowsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };
  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const toggleValueFilter = (header: string, option: string) => {
    setColumnSelectedValues((prev) => {
      const current = prev[header] || [];
      const updated = current.includes(option)
        ? current.filter((i) => i !== option)
        : [...current, option];
      return { ...prev, [header]: updated };
    });
  };

  const clearColumnFilter = (header: string) => {
    setColumnSearch((prev) => {
      const n = { ...prev };
      delete n[header];
      return n;
    });
    setColumnSelectedValues((prev) => {
      const n = { ...prev };
      delete n[header];
      return n;
    });
    if (sortColumn === header) setSortColumn(null);
  };

  const isColumnFilteredOrSorted = (header: string) =>
    sortColumn === header ||
    Boolean(columnSearch[header]) ||
    Boolean(columnSelectedValues[header]?.length);

  // ==========================================
  // METRICS & ANALYTICS COMPUTATIONS
  // ==========================================
  const analytics = useMemo(() => {
    const rawRows = sheetData.rows;
    if (rawRows.length === 0) {
      return {
        totalSubmissions: 0,
        uniqueMarketersCount: 0,
        uniqueConsultantsCount: 0,
        topClient: { name: 'None', count: 0 },
        marketerLeaderboard: [],
        monthlyTrend: [],
        consultantLeaderboard: [],
        topClients: [],
        topPositions: [],
        marketerNames: [],
      };
    }

    // Filter by marketer if selected
    const activeRows = selectedMarketerFilter === 'all'
      ? rawRows
      : rawRows.filter((r) => normalizeName(r['Marketer Name']) === selectedMarketerFilter);

    const totalSubmissions = activeRows.length;

    // Aggregation maps
    const marketerMap: Record<string, { count: number; consultants: Record<string, number> }> = {};
    const consultantMap: Record<string, { count: number; positions: Record<string, number>; marketers: Record<string, number> }> = {};
    const clientMap: Record<string, number> = {};
    const positionMap: Record<string, number> = {};
    const monthMap: Record<string, number> = {};

    const chronologicalMonths = [
      'January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026',
      'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026'
    ];

    chronologicalMonths.forEach((m) => { monthMap[m] = 0; });

    // All available marketers from full dataset
    const allMarketersSet = new Set<string>();
    rawRows.forEach((r) => {
      const mName = normalizeName(r['Marketer Name']);
      if (mName && mName !== 'Unknown') allMarketersSet.add(mName);
    });

    activeRows.forEach((row) => {
      const marketer = normalizeName(row['Marketer Name']);
      const consultant = normalizeName(row['Consultant Name']);
      const client = (row['Client'] || '').trim();
      const position = (row['Position'] || '').trim();
      const month = extractMonthLabel(row['Date']);

      // 1. Marketer
      if (!marketerMap[marketer]) {
        marketerMap[marketer] = { count: 0, consultants: {} };
      }
      marketerMap[marketer].count += 1;
      if (consultant && consultant !== 'Unknown') {
        marketerMap[marketer].consultants[consultant] = (marketerMap[marketer].consultants[consultant] || 0) + 1;
      }

      // 2. Consultant
      if (consultant && consultant !== 'Unknown') {
        if (!consultantMap[consultant]) {
          consultantMap[consultant] = { count: 0, positions: {}, marketers: {} };
        }
        consultantMap[consultant].count += 1;
        if (position && position !== '-') {
          consultantMap[consultant].positions[position] = (consultantMap[consultant].positions[position] || 0) + 1;
        }
        if (marketer && marketer !== 'Unknown') {
          consultantMap[consultant].marketers[marketer] = (consultantMap[consultant].marketers[marketer] || 0) + 1;
        }
      }

      // 3. Client
      if (client && client !== '-') {
        clientMap[client] = (clientMap[client] || 0) + 1;
      }

      // 4. Position
      if (position && position !== '-') {
        positionMap[position] = (positionMap[position] || 0) + 1;
      }

      // 5. Month
      if (monthMap[month] !== undefined) {
        monthMap[month] += 1;
      } else {
        monthMap[month] = (monthMap[month] || 0) + 1;
      }
    });

    // Marketer Leaderboard
    const marketerLeaderboard = Object.entries(marketerMap)
      .map(([name, data]) => {
        // Find their most submitted consultant
        const topConsEntry = Object.entries(data.consultants).sort((a, b) => b[1] - a[1])[0];
        const topConsultant = topConsEntry ? `${topConsEntry[0]} (${topConsEntry[1]})` : 'Various';
        return {
          name,
          count: data.count,
          percentage: totalSubmissions > 0 ? ((data.count / totalSubmissions) * 100).toFixed(1) : '0',
          topConsultant,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Consultant Leaderboard (Who is getting the most submissions?)
    const consultantLeaderboard = Object.entries(consultantMap)
      .map(([name, data]) => {
        const topPosEntry = Object.entries(data.positions).sort((a, b) => b[1] - a[1])[0];
        const topPosition = topPosEntry ? topPosEntry[0] : 'General';
        const topMarketerEntry = Object.entries(data.marketers).sort((a, b) => b[1] - a[1])[0];
        const topMarketer = topMarketerEntry ? topMarketerEntry[0] : 'Team';
        return {
          name,
          count: data.count,
          percentage: totalSubmissions > 0 ? ((data.count / totalSubmissions) * 100).toFixed(1) : '0',
          topPosition,
          topMarketer,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Monthly Trend
    const monthlyTrend = Object.entries(monthMap)
      .filter(([_, count]) => count > 0)
      .map(([month, count]) => ({
        month,
        count,
      }));

    // Top Clients
    const topClients = Object.entries(clientMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Top Positions
    const topPositions = Object.entries(positionMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const maxMonthCount = Math.max(...monthlyTrend.map((m) => m.count), 1);
    const topClient = topClients[0] || { name: 'None', count: 0 };

    return {
      totalSubmissions,
      uniqueMarketersCount: Object.keys(marketerMap).length,
      uniqueConsultantsCount: Object.keys(consultantMap).length,
      topClient,
      marketerLeaderboard,
      monthlyTrend,
      maxMonthCount,
      consultantLeaderboard,
      topClients,
      topPositions,
      marketerNames: Array.from(allMarketersSet).sort(),
    };
  }, [sheetData.rows, selectedMarketerFilter]);

  return (
    <div className="min-h-screen theme-bg theme-text-body p-2 sm:p-4 font-[family-name:var(--font-geist-sans)]">
      <main className="w-full max-w-full mx-auto flex flex-col theme-surface p-2 sm:p-4 rounded-xl shadow-xs border theme-border overflow-hidden gap-3">
        
        {/* Top Control Bar: View Switcher (Table vs Metrics) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-medium pb-3 border-b theme-border">
          
          {/* Dual-View Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl theme-surface-alt theme-border border shadow-2xs">
            <button
              onClick={() => setViewMode('metrics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'metrics'
                  ? 'theme-btn shadow-xs'
                  : 'theme-text-muted hover:theme-text'
              }`}
            >
              <span>📊</span>
              <span>Team Analytics &amp; Metrics</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'theme-btn shadow-xs'
                  : 'theme-text-muted hover:theme-text'
              }`}
            >
              <span>📋</span>
              <span>Table View ({sheetData.rows.length})</span>
            </button>
          </div>

          {/* Quick Filter / Sync Actions */}
          <div className="flex items-center gap-2">
            {viewMode === 'metrics' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold theme-text-muted">Filter Marketer:</span>
                <select
                  value={selectedMarketerFilter}
                  onChange={(e) => setSelectedMarketerFilter(e.target.value)}
                  className="px-2.5 py-1 border rounded-lg text-xs font-bold theme-input theme-border focus:outline-none"
                >
                  <option value="all">All Team Members ({analytics.marketerNames.length})</option>
                  {analytics.marketerNames.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="px-3 py-1 rounded-lg border text-xs font-semibold shadow-2xs cursor-pointer theme-surface theme-border theme-text hover:theme-surface-alt transition-colors"
            >
              🔄 Refresh
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: TABLE VIEW                                                       */}
        {/* ========================================================================= */}
        {viewMode === 'table' && (
          <div className="flex flex-col gap-3">
            {/* Pagination & Search Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-medium theme-text-muted pb-1">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <span className="theme-text-body whitespace-nowrap">
                  Showing{' '}
                  <strong className="theme-text">
                    {filteredAndSortedRows.length === 0 ? 0 : startIndex + 1}
                  </strong>
                  –
                  <strong className="theme-text">
                    {Math.min(startIndex + rowsPerPage, filteredAndSortedRows.length)}
                  </strong>{' '}
                  of <strong className="theme-text">{filteredAndSortedRows.length}</strong> submission rows
                </span>

                {/* Global search */}
                <div className="relative flex-1 max-w-xs min-w-[200px]">
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(e) => {
                      setGlobalSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="🔍 Search all columns..."
                    className="w-full px-3 py-1 border rounded-md text-xs focus:outline-none theme-input theme-border shadow-2xs"
                  />
                  {globalSearch && (
                    <button
                      onClick={() => setGlobalSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 theme-text-muted hover:theme-text text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handlePrev}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded border text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors theme-surface theme-border theme-text"
                >
                  ← Prev
                </button>

                <span className="px-2.5 py-1 rounded border text-xs font-bold theme-surface-alt theme-border theme-text">
                  {totalPages === 0 ? 0 : currentPage} / {totalPages}
                </span>

                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-2.5 py-1 rounded border text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors theme-surface theme-border theme-text"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Live Table */}
            <div
              className="w-full overflow-x-auto rounded-lg shadow-xs min-h-[450px] border theme-table-border"
              style={{ backgroundColor: 'var(--color-table-row-odd)' }}
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center p-16 gap-3 theme-text-muted text-sm font-semibold">
                  <span className="text-2xl animate-spin">⏳</span>
                  <span>Loading Google Sheet data...</span>
                </div>
              ) : !sheetData.configured ? (
                <div className="flex flex-col items-center justify-center p-16 gap-3 text-center">
                  <span className="text-3xl">⚙️</span>
                  <p className="font-bold text-base theme-text">Google Sheet Not Configured Yet</p>
                  <p className="text-xs theme-text-muted max-w-md leading-relaxed">
                    Add <code className="theme-code px-1.5 py-0.5 rounded font-mono font-bold">GOOGLE_SHEET_CSV_URL</code> to your Vercel Environment Variables to display the live submissions table here.
                  </p>
                </div>
              ) : sheetData.error ? (
                <div className="flex flex-col items-center justify-center p-16 gap-3 text-center">
                  <span className="text-3xl">⚠️</span>
                  <p className="font-bold text-base text-red-600 dark:text-red-400">Connection Error</p>
                  <p className="text-xs text-red-500 max-w-md leading-relaxed">
                    {sheetData.error}
                  </p>
                </div>
              ) : sheetData.rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 gap-3 text-center">
                  <span className="text-3xl">📄</span>
                  <p className="font-bold text-base theme-text">No submission rows found</p>
                  <p className="text-xs theme-text-muted max-w-md">
                    The connected Google Sheet does not contain any submission rows yet.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="theme-table-head sticky top-0 z-30 border-b theme-table-border">
                    <tr>
                      <th className="px-3 py-2 font-bold w-12 text-center border-r theme-table-border select-none">
                        #
                      </th>

                      {sheetData.columnHeaders.map((header) => {
                        const isFiltered = isColumnFilteredOrSorted(header);
                        const isPopoverOpen = activePopover === header;
                        const options = columnUniqueOptions[header] || [];

                        return (
                          <th
                            key={header}
                            className="px-3 py-2 font-bold select-none relative whitespace-normal break-words max-w-[150px] border-r last:border-r-0 theme-table-border"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="leading-snug">{header}</span>
                              <button
                                type="button"
                                data-popover-toggle="true"
                                onClick={() => setActivePopover((prev) => (prev === header ? null : header))}
                                className="p-0.5 px-1 rounded transition-colors shrink-0 cursor-pointer text-[11px]"
                                style={{
                                  backgroundColor: isFiltered ? 'var(--color-accent)' : 'transparent',
                                  color: isFiltered ? 'var(--color-accent-text)' : 'var(--color-table-head-text)',
                                  opacity: isFiltered ? 1 : 0.7,
                                }}
                                title="Sort & Filter Column"
                              >
                                {sortColumn === header ? (sortDirection === 'asc' ? '▲' : '▼') : '⚙️'}
                              </button>
                            </div>

                            {/* Column Popover Menu */}
                            {isPopoverOpen && (
                              <div
                                data-popover="true"
                                className="absolute top-full left-0 mt-1 w-64 rounded-lg shadow-2xl p-3 z-50 text-xs font-normal normal-case border-2"
                                style={{
                                  backgroundColor: 'var(--color-surface)',
                                  borderColor: 'var(--color-accent)',
                                  color: 'var(--color-text-body)',
                                }}
                              >
                                {/* Sort */}
                                <div
                                  className="flex flex-col gap-1 pb-2 border-b"
                                  style={{ borderColor: 'var(--color-border-soft)' }}
                                >
                                  <span className="font-bold theme-text mb-1">Sort Column</span>
                                  {(['asc', 'desc'] as const).map((dir) => (
                                    <button
                                      key={dir}
                                      type="button"
                                      onClick={() => {
                                        setSortColumn(header);
                                        setSortDirection(dir);
                                        setActivePopover(null);
                                      }}
                                      className="flex items-center gap-2 p-1.5 rounded text-left cursor-pointer w-full transition-colors"
                                      style={{
                                        backgroundColor:
                                          sortColumn === header && sortDirection === dir
                                            ? 'var(--color-surface-alt)'
                                            : 'transparent',
                                        fontWeight: sortColumn === header && sortDirection === dir ? 700 : 400,
                                      }}
                                      onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-alt)';
                                      }}
                                      onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.backgroundColor =
                                          sortColumn === header && sortDirection === dir
                                            ? 'var(--color-surface-alt)'
                                            : 'transparent';
                                      }}
                                    >
                                      {dir === 'asc' ? '⬆️ Sort Ascending (A → Z)' : '⬇️ Sort Descending (Z → A)'}
                                    </button>
                                  ))}
                                </div>

                                {/* Column search */}
                                <div
                                  className="py-2 border-b flex flex-col gap-1"
                                  style={{ borderColor: 'var(--color-border-soft)' }}
                                >
                                  <span className="font-bold theme-text mb-1">Search {header}</span>
                                  <input
                                    type="text"
                                    placeholder={`Type to search ${header}...`}
                                    value={columnSearch[header] || ''}
                                    onChange={(e) =>
                                      setColumnSearch({ ...columnSearch, [header]: e.target.value })
                                    }
                                    className="w-full p-1.5 border rounded text-xs focus:outline-none theme-input theme-border"
                                  />
                                </div>

                                {/* Filter values */}
                                {options.length > 0 && (
                                  <div className="py-2 flex flex-col gap-1 max-h-44 overflow-y-auto">
                                    <span className="font-bold theme-text mb-1">
                                      Filter Values ({options.length})
                                    </span>
                                    {options.map((opt) => {
                                      const isChecked = (columnSelectedValues[header] || []).includes(opt);
                                      return (
                                        <label
                                          key={opt}
                                          className="flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs select-none theme-text-body transition-colors"
                                          onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-alt)';
                                          }}
                                          onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleValueFilter(header, opt)}
                                            className="rounded w-3.5 h-3.5 cursor-pointer"
                                            style={{ accentColor: 'var(--color-accent)' }}
                                          />
                                          <span className="truncate">{opt}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Clear filter */}
                                {isFiltered && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      clearColumnFilter(header);
                                      setActivePopover(null);
                                    }}
                                    className="w-full mt-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded text-xs border border-red-200 transition-colors cursor-pointer"
                                  >
                                    Clear Column Filter
                                  </button>
                                )}
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {currentRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={sheetData.columnHeaders.length + 1}
                          className="px-4 py-8 text-center theme-text-muted font-medium"
                        >
                          No submissions match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      currentRows.map((row, index) => {
                        const rowIndex = startIndex + index + 1;
                        const isEven = index % 2 === 0;

                        return (
                          <tr
                            key={row.id || index}
                            className="transition-colors"
                            style={{
                              backgroundColor: isEven
                                ? 'var(--color-table-row-even)'
                                : 'var(--color-table-row-odd)',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.backgroundColor =
                                'var(--color-table-row-hover)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.backgroundColor = isEven
                                ? 'var(--color-table-row-even)'
                                : 'var(--color-table-row-odd)';
                            }}
                          >
                            <td
                              className="px-2.5 py-2 text-center font-mono font-bold text-[11px] border-r theme-table-border theme-text-muted"
                            >
                              {rowIndex}
                            </td>
                            {sheetData.columnHeaders.map((header) => {
                              const val = row[header] || '-';
                              const bubbleStyle = getSubmissionBubbleStyle(header, val);

                              return (
                                <td
                                  key={header}
                                  className="px-2.5 py-2 border-r last:border-r-0 whitespace-normal break-words max-w-[200px] min-w-[120px] leading-snug align-top"
                                  style={{
                                    borderColor: 'var(--color-table-border)',
                                    color: 'var(--color-text-body)',
                                  }}
                                >
                                  {val !== '-' ? (
                                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] border ${bubbleStyle} max-w-full break-words leading-tight`}>
                                      {val}
                                    </span>
                                  ) : (
                                    <span className="theme-text-muted italic text-[11px]">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: ANALYTICS & METRICS DASHBOARD                                    */}
        {/* ========================================================================= */}
        {viewMode === 'metrics' && (
          <div className="flex flex-col gap-5 py-2">
            
            {/* Top KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* Card 1: Total Volume */}
              <div className="p-4 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">
                    Total Submissions
                  </span>
                  <span className="text-lg">📈</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold theme-text">
                    {analytics.totalSubmissions}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Live Synced
                  </span>
                </div>
                <span className="text-[11px] theme-text-muted">
                  ~{(analytics.totalSubmissions / Math.max(analytics.monthlyTrend.length, 1)).toFixed(0)} avg submissions / month
                </span>
              </div>

              {/* Card 2: Active Team Members */}
              <div className="p-4 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">
                    Team Members Active
                  </span>
                  <span className="text-lg">👥</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold theme-text">
                    {analytics.uniqueMarketersCount}
                  </span>
                  <span className="text-[11px] font-semibold theme-text-muted">
                    Marketers
                  </span>
                </div>
                <span className="text-[11px] theme-text-muted">
                  Top performer: <strong className="theme-text">{analytics.marketerLeaderboard[0]?.name || 'N/A'}</strong> ({analytics.marketerLeaderboard[0]?.count || 0})
                </span>
              </div>

              {/* Card 3: Consultants Represented */}
              <div className="p-4 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">
                    Consultants Handled
                  </span>
                  <span className="text-lg">💼</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold theme-text">
                    {analytics.uniqueConsultantsCount}
                  </span>
                  <span className="text-[11px] font-semibold theme-text-muted">
                    Candidates
                  </span>
                </div>
                <span className="text-[11px] theme-text-muted">
                  Top candidate: <strong className="theme-text">{analytics.consultantLeaderboard[0]?.name || 'N/A'}</strong> ({analytics.consultantLeaderboard[0]?.count || 0})
                </span>
              </div>

              {/* Card 4: Top Client Partner */}
              <div className="p-4 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">
                    Top Client Target
                  </span>
                  <span className="text-lg">🏢</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold theme-text truncate">
                    {analytics.topClient.name}
                  </span>
                </div>
                <span className="text-[11px] theme-text-muted">
                  <strong className="theme-text">{analytics.topClient.count}</strong> total submissions to this client
                </span>
              </div>

            </div>

            {/* Middle Section: Monthly Trend & Top Consultants */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left 7 cols: Submissions Per Month Chart */}
              <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold theme-text flex items-center gap-1.5">
                      <span>📅</span> Monthly Submissions Trend
                    </h3>
                    <p className="text-[11px] theme-text-muted">
                      Distribution of candidate submissions across 2026
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-surface theme-border border">
                    {analytics.monthlyTrend.length} Months Tracked
                  </span>
                </div>

                {/* Monthly Bar Chart */}
                <div className="flex flex-col gap-2.5 pt-2">
                  {analytics.monthlyTrend.map((m) => {
                    const pct = ((m.count / (analytics.maxMonthCount || 1)) * 100).toFixed(0);
                    return (
                      <div key={m.month} className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between items-center font-medium">
                          <span className="theme-text font-semibold">{m.month}</span>
                          <span className="theme-text-muted font-mono text-[11px]">
                            <strong className="theme-text font-bold">{m.count}</strong> submissions
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: 'var(--color-accent)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 cols: Consultant Volume Leaderboard */}
              <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold theme-text flex items-center gap-1.5">
                      <span>🌟</span> Most Marketed Consultants
                    </h3>
                    <p className="text-[11px] theme-text-muted">
                      Candidates receiving the highest submission volume
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {analytics.consultantLeaderboard.slice(0, 7).map((c, i) => (
                    <div
                      key={c.name}
                      className="p-2.5 rounded-lg border theme-surface theme-border flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            i === 0
                              ? 'bg-amber-400 text-amber-950 shadow-2xs font-extrabold'
                              : i === 1
                              ? 'bg-slate-300 text-slate-900 font-bold'
                              : i === 2
                              ? 'bg-amber-700 text-white font-bold'
                              : 'theme-surface-alt theme-text-muted font-medium'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs theme-text truncate">{c.name}</p>
                          <p className="text-[10px] theme-text-muted truncate">
                            {c.topPosition} • By {c.topMarketer}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          {c.count} subs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Section: Marketers Performance Leaderboard & Top Clients */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left 7 cols: Marketer Team Performance */}
              <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold theme-text flex items-center gap-1.5">
                    <span>🏆</span> Marketer Performance Leaderboard
                  </h3>
                  <p className="text-[11px] theme-text-muted">
                    Submission contribution per team member
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b theme-border text-theme-muted font-bold text-[11px]">
                        <th className="pb-2 font-bold">#</th>
                        <th className="pb-2 font-bold">Marketer Name</th>
                        <th className="pb-2 font-bold text-right">Submissions</th>
                        <th className="pb-2 font-bold text-right">Share of Total</th>
                        <th className="pb-2 font-bold pl-3">Top Consultant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y theme-border">
                      {analytics.marketerLeaderboard.map((m, idx) => (
                        <tr key={m.name} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-2.5 font-bold font-mono text-[11px] theme-text-muted">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 font-bold theme-text">
                            {m.name}
                          </td>
                          <td className="py-2.5 font-mono font-bold text-right theme-text">
                            {m.count}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            {m.percentage}%
                          </td>
                          <td className="py-2.5 pl-3 text-[11px] theme-text-muted truncate max-w-[150px]">
                            {m.topConsultant}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right 5 cols: Top Clients & Roles Breakdown */}
              <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold theme-text flex items-center gap-1.5">
                    <span>🏢</span> Top Client / Vendor Targets
                  </h3>
                  <p className="text-[11px] theme-text-muted">
                    Companies with the most submissions
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {analytics.topClients.map((client) => {
                    const pct = ((client.count / (analytics.totalSubmissions || 1)) * 100).toFixed(1);
                    return (
                      <div
                        key={client.name}
                        className="flex items-center justify-between p-2 rounded-lg border theme-surface theme-border text-xs"
                      >
                        <span className="font-bold theme-text truncate">{client.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] theme-text-muted font-semibold">{pct}%</span>
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-sky-100 text-sky-900 border border-sky-300">
                            {client.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
