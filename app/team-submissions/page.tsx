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

  // Clean string: replace multiple commas, normalize spaces
  const clean = str.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');

  // Try standard Date.parse
  const time = Date.parse(clean);
  if (!isNaN(time)) return time;

  // Month name map
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  // Match: Month Name + Day + Year (e.g. "October 1 2026", "July 16 2026", "Sep 9 2026")
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

  // Match: MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = clean.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10) - 1;
    const d = parseInt(slashMatch[2], 10);
    const y = parseInt(slashMatch[3], 10);
    return new Date(y, m, d).getTime();
  }

  return 0;
}

// Smart Numerical Parser for rates/amounts ($55.00, 60, etc.)
function parseNumericValue(str: string): number | null {
  if (!str || str === '-') return null;
  const numStr = str.replace(/[^0-9.-]/g, '');
  if (!numStr) return null;
  const val = parseFloat(numStr);
  return isNaN(val) ? null : val;
}

export default function TeamSubmissionsPage() {
  const [sheetData, setSheetData] = useState<SheetData>({
    configured: false,
    columnHeaders: [],
    rows: [],
  });
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Sorting - default to Date descending if Date column is present
  const [sortColumn, setSortColumn] = useState<string | null>('Date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  // Filter & Smart Chronological / Numerical Sort
  const filteredAndSortedRows = useMemo(() => {
    let result = [...sheetData.rows];

    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

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
    <div className="min-h-screen theme-bg theme-text-body p-2 sm:p-4 font-[family-name:var(--font-geist-sans)]">
      <main className="w-full max-w-full mx-auto flex flex-col theme-surface p-2 sm:p-4 rounded-xl shadow-xs border theme-border overflow-hidden">
        
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
          className="w-full overflow-x-auto rounded-lg shadow-xs min-h-[450px] border theme-table-border mt-2"
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
                        title="Click to sort chronologically / alphabetically"
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

      </main>
    </div>
  );
}
