'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface SheetData {
  configured: boolean;
  columnHeaders: string[];
  rows: Record<string, string>[];
  totalRows?: number;
  lastSynced?: string;
  error?: string;
  message?: string;
}

export default function TeamSubmissionsPage() {
  const [sheetData, setSheetData] = useState<SheetData>({
    configured: false,
    columnHeaders: [],
    rows: [],
  });
  const [loading, setLoading] = useState(true);
  const [customSheetUrl, setCustomSheetUrl] = useState('');
  const [activeSheetUrl, setActiveSheetUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Load saved custom URL from localStorage if any
  useEffect(() => {
    const saved = localStorage.getItem('placerover_google_sheet_url');
    if (saved) {
      setCustomSheetUrl(saved);
      setActiveSheetUrl(saved);
    }
  }, []);

  // Fetch sheet data
  const fetchData = async (urlToFetch?: string) => {
    setIsSyncing(true);
    try {
      const targetUrl = urlToFetch !== undefined ? urlToFetch : activeSheetUrl;
      const query = targetUrl ? `?sheetUrl=${encodeURIComponent(targetUrl)}` : '';
      const res = await fetch(`/api/fetch-google-sheet${query}`, {
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
      setIsSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeSheetUrl);
  }, [activeSheetUrl]);

  // Handle saving new Google Sheet link
  const handleConnectSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSheetUrl.trim()) return;
    localStorage.setItem('placerover_google_sheet_url', customSheetUrl.trim());
    setActiveSheetUrl(customSheetUrl.trim());
    fetchData(customSheetUrl.trim());
  };

  // Filter & Sort
  const filteredAndSortedRows = useMemo(() => {
    let result = [...sheetData.rows];

    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const valA = (a[sortColumn] || '').toLowerCase();
        const valB = (b[sortColumn] || '').toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [sheetData.rows, globalSearch, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredAndSortedRows.slice(startIndex, startIndex + rowsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };
  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  return (
    <div className="min-h-screen theme-bg theme-text-body p-2 sm:p-4 md:p-6 font-[family-name:var(--font-geist-sans)] flex flex-col gap-4">
      
      {/* Top Header Card */}
      <div className="p-4 sm:p-6 rounded-xl shadow-xs border flex flex-col sm:flex-row sm:items-center justify-between gap-4 theme-surface theme-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h1 className="text-xl sm:text-2xl font-bold theme-text">
              Team Submissions (Google Sheets)
            </h1>
            <span className="text-[11px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              Live Spreadsheet Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm theme-text-muted mt-1">
            Real-time feed of your team members&apos; placement submissions directly from Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchData()}
            disabled={isSyncing}
            className="px-3.5 py-2 font-bold rounded-lg text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 theme-surface theme-border border hover:theme-surface-alt"
          >
            <span>{isSyncing ? '⏳ Syncing...' : '🔄 Refresh Live Sheet'}</span>
          </button>
          <Link
            href="/"
            className="px-3.5 py-2 font-bold rounded-lg text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 theme-btn"
          >
            <span>📋 Go to Notion Live Table →</span>
          </Link>
        </div>
      </div>

      {/* Configuration & Quick Link Input Box */}
      {(!sheetData.configured || sheetData.error || !activeSheetUrl) && !loading && (
        <div className="p-5 sm:p-6 rounded-xl border flex flex-col gap-4 theme-surface-alt theme-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔗</span>
            <h2 className="text-base font-bold theme-text">
              Connect Your Brother&apos;s Google Sheet in 2 Simple Steps
            </h2>
          </div>

          <p className="text-xs sm:text-sm theme-text-body leading-relaxed">
            To show his team submissions table here, follow these 2 quick steps:
          </p>

          <ol className="list-decimal list-inside text-xs sm:text-sm flex flex-col gap-2.5 font-medium theme-text-body">
            <li className="p-3 rounded-lg border theme-surface theme-border shadow-2xs">
              <strong className="theme-text">Make the Sheet Viewable:</strong> Open his Google Sheet → Click{' '}
              <strong className="theme-text">Share</strong> at top-right → Under &quot;General Access&quot;, set to{' '}
              <code className="theme-code px-1.5 py-0.5 rounded text-xs font-bold font-mono">
                Anyone with the link can view
              </code>.
            </li>
            <li className="p-3 rounded-lg border theme-surface theme-border shadow-2xs">
              <strong className="theme-text">Paste the Sheet URL below:</strong> Copy the sharing link or browser URL of his Google Sheet and paste it right here!
            </li>
          </ol>

          <form onSubmit={handleConnectSheet} className="flex flex-col sm:flex-row gap-2 items-center mt-1">
            <input
              type="url"
              required
              value={customSheetUrl}
              onChange={(e) => setCustomSheetUrl(e.target.value)}
              placeholder="Paste Google Sheets link here (e.g. https://docs.google.com/spreadsheets/d/...)"
              className="flex-1 w-full p-2.5 border rounded-lg text-xs sm:text-sm font-mono theme-input theme-border focus:outline-none"
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 font-bold rounded-lg text-xs sm:text-sm transition-all shadow-xs cursor-pointer theme-btn whitespace-nowrap"
            >
              🚀 Connect &amp; Load Sheet
            </button>
          </form>

          {sheetData.error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">
              ⚠️ {sheetData.error}
            </div>
          )}
        </div>
      )}

      {/* Main Table Container */}
      <div className="p-2 sm:p-4 rounded-xl shadow-xs border flex flex-col gap-3 theme-surface theme-border overflow-hidden">
        
        {/* Pagination & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-medium theme-text-muted pb-2 border-b theme-border">
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

        {/* Live Table with Horizontal Scroll */}
        <div
          className="w-full overflow-x-auto rounded-lg shadow-xs min-h-[450px] border theme-table-border"
          style={{ backgroundColor: 'var(--color-table-row-odd)' }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3 theme-text-muted text-sm font-semibold">
              <span className="text-2xl animate-spin">⏳</span>
              <span>Loading Google Sheet data...</span>
            </div>
          ) : sheetData.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3 text-center">
              <span className="text-3xl">📄</span>
              <p className="font-bold text-base theme-text">No submission rows found</p>
              <p className="text-xs theme-text-muted max-w-md">
                Paste his Google Sheet link in the box above to load and display all team submission rows in real time.
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
                    const isSorted = sortColumn === header;
                    return (
                      <th
                        key={header}
                        onClick={() => {
                          if (sortColumn === header) {
                            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                          } else {
                            setSortColumn(header);
                            setSortDirection('asc');
                          }
                        }}
                        className="px-3 py-2 font-bold select-none whitespace-normal break-words max-w-[170px] border-r last:border-r-0 theme-table-border cursor-pointer hover:opacity-90 transition-opacity"
                        title="Click to sort column"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="leading-snug">{header}</span>
                          <span className="text-[10px] opacity-75">
                            {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
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
                                <span className="inline-block px-1.5 py-0.5 rounded text-[11px] leading-tight font-medium">
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

        {/* Change / Update Sheet Link details */}
        {activeSheetUrl && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t theme-border text-xs theme-text-muted">
            <span className="truncate max-w-md">
              Connected Sheet: <strong className="theme-text font-mono text-[11px]">{activeSheetUrl}</strong>
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('placerover_google_sheet_url');
                setActiveSheetUrl('');
                setCustomSheetUrl('');
                setSheetData({ configured: false, columnHeaders: [], rows: [] });
              }}
              className="text-red-500 hover:underline font-semibold cursor-pointer shrink-0"
            >
              Disconnect / Change Sheet
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
