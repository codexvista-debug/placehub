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

// Smart Numerical Parser for rates/amounts ($55.00, 60, etc.)
function parseNumericValue(str: string): number | null {
  if (!str || str === '-') return null;
  const numStr = str.replace(/[^0-9.-]/g, '');
  if (!numStr) return null;
  const val = parseFloat(numStr);
  return isNaN(val) ? null : val;
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

  // Filter & Smart Chronological / Numerical Sort
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

      </main>
    </div>
  );
}
