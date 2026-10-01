'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';

interface SchemaInfo {
  type: string;
  options: string[];
}

interface TableClientProps {
  placements: Record<string, string>[];
  columnHeaders: string[];
  columnSchema?: Record<string, SchemaInfo>;
}

export default function TableClient({
  placements,
  columnHeaders,
  columnSchema = {},
}: TableClientProps) {
  const [data, setData] = useState(placements);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Active column popover menu: string (header name) | null
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Column-specific search text: Record<header, string>
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});

  // Column-specific selected values (for select/status/multi_select): Record<header, string[]>
  const [columnSelectedValues, setColumnSelectedValues] = useState<Record<string, string[]>>({});

  // Sorting state: { column, direction }
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Editing state: cell click
  const [editingCell, setEditingCell] = useState<{ rowId: string; header: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingStatus, setSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time Silent Polling (Notion -> Web without browser refresh)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (editingCell || activePopover) return;

      try {
        const res = await fetch('/api/fetch-placements');
        if (res.ok) {
          const json = await res.json();
          if (json.placements && Array.isArray(json.placements)) {
            setData(json.placements);
          }
        }
      } catch (err) {
        console.error('Silent auto-poll error:', err);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [editingCell, activePopover]);

  // Extract all unique values present in data for each column (for filter checklists)
  const columnUniqueOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    columnHeaders.forEach((header) => {
      const set = new Set<string>();
      data.forEach((row) => {
        const val = row[header];
        if (val && val !== '-') set.add(val);
      });
      map[header] = Array.from(set).sort();
    });
    return map;
  }, [data, columnHeaders]);

  // Filter & Sort Logic
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply Column-Specific Search Texts & Value Checklists
    columnHeaders.forEach((header) => {
      const search = columnSearch[header]?.toLowerCase();
      if (search) {
        result = result.filter((row) =>
          (row[header] || '').toLowerCase().includes(search)
        );
      }

      const selectedVals = columnSelectedValues[header];
      if (selectedVals && selectedVals.length > 0) {
        result = result.filter((row) => selectedVals.includes(row[header]));
      }
    });

    // Sorting
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
  }, [data, columnHeaders, columnSearch, columnSelectedValues, sortColumn, sortDirection]);

  // Reset page to 1 whenever filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [columnSearch, columnSelectedValues, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const startEditing = (rowId: string, header: string, currentValue: string) => {
    setEditingCell({ rowId, header });
    setEditValue(currentValue === '-' ? '' : currentValue);
  };

  const saveCellEdit = async (rowId: string, header: string, newValueToSave?: string) => {
    const valToSave = newValueToSave !== undefined ? newValueToSave : editValue;
    setEditingCell(null);

    const row = data.find((r) => r.id === rowId);
    if (!row || row[header] === valToSave) return;

    const cellKey = `${rowId}-${header}`;
    setSavingStatus((prev) => ({ ...prev, [cellKey]: 'saving' }));

    setData((prevData) =>
      prevData.map((r) => (r.id === rowId ? { ...r, [header]: valToSave || '-' } : r))
    );

    try {
      const propType = columnSchema[header]?.type || 'rich_text';

      const response = await fetch('/api/update-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: rowId,
          propertyName: header,
          propertyType: propType,
          value: valToSave,
        }),
      });

      if (!response.ok) throw new Error('Update failed');

      setSavingStatus((prev) => ({ ...prev, [cellKey]: 'saved' }));
      setTimeout(() => {
        setSavingStatus((prev) => {
          const next = { ...prev };
          delete next[cellKey];
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Error saving cell edit:', err);
      setSavingStatus((prev) => ({ ...prev, [cellKey]: 'error' }));
    }
  };

  const toggleValueFilter = (header: string, option: string) => {
    setColumnSelectedValues((prev) => {
      const current = prev[header] || [];
      const updated = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [header]: updated };
    });
  };

  const clearColumnFilter = (header: string) => {
    setColumnSearch((prev) => {
      const next = { ...prev };
      delete next[header];
      return next;
    });
    setColumnSelectedValues((prev) => {
      const next = { ...prev };
      delete next[header];
      return next;
    });
    if (sortColumn === header) setSortColumn(null);
  };

  const isColumnFilteredOrSorted = (header: string) => {
    return (
      sortColumn === header ||
      Boolean(columnSearch[header]) ||
      (columnSelectedValues[header] && columnSelectedValues[header].length > 0)
    );
  };

  // Pagination Toolbar JSX
  const renderPaginationControls = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 text-xs sm:text-sm text-lime-900 font-medium">
      <div>
        Showing{' '}
        <span className="font-bold text-lime-950">
          {filteredAndSortedData.length === 0 ? 0 : startIndex + 1}
        </span>{' '}
        to{' '}
        <span className="font-bold text-lime-950">
          {Math.min(startIndex + rowsPerPage, filteredAndSortedData.length)}
        </span>{' '}
        of <span className="font-bold text-lime-950">{filteredAndSortedData.length}</span> rows
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-md border border-lime-300 bg-white text-lime-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-lime-100 transition-colors shadow-xs text-xs sm:text-sm font-semibold"
        >
          ← Previous
        </button>

        <span className="px-3 py-1 bg-lime-100 rounded-md border border-lime-300 text-lime-900 font-bold text-xs sm:text-sm">
          Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1.5 rounded-md border border-lime-300 bg-white text-lime-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-lime-100 transition-colors shadow-xs text-xs sm:text-sm font-semibold"
        >
          Next →
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full" ref={popoverRef}>
      
      {/* Top Bar: Live Auto-Sync Badge + Top Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-lime-100 pb-3">
        <span className="flex items-center gap-1.5 bg-lime-100 px-3 py-1 rounded-full border border-lime-300 font-semibold text-xs text-lime-900 self-start">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
          🟢 Live Auto-Sync Active
        </span>

        {/* TOP PAGINATION CONTROLS */}
        {renderPaginationControls()}
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="w-full overflow-x-auto border border-lime-300 rounded-lg shadow-sm bg-white min-h-[400px]">
        <table className="min-w-max w-full text-left text-xs sm:text-sm border-collapse">
          <thead className="bg-lime-100 text-lime-950 font-semibold border-b border-lime-300 sticky top-0 z-20">
            <tr>
              {columnHeaders.map((header) => {
                const isFiltered = isColumnFilteredOrSorted(header);
                const isPopoverOpen = activePopover === header;
                const options = columnUniqueOptions[header] || [];

                return (
                  <th
                    key={header}
                    className="px-4 py-3 border-r border-lime-300 last:border-r-0 whitespace-nowrap bg-lime-100 font-bold select-none relative"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{header}</span>

                      {/* Header Filter/Sort Trigger Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopover(isPopoverOpen ? null : header);
                        }}
                        className={`p-1 rounded hover:bg-lime-200 transition-colors ${
                          isFiltered ? 'text-lime-900 bg-lime-300 font-bold' : 'text-lime-700'
                        }`}
                        title="Sort & Filter Column"
                      >
                        {sortColumn === header ? (sortDirection === 'asc' ? '▲' : '▼') : '⚙️'}
                      </button>
                    </div>

                    {/* Dynamic Column Popover Menu */}
                    {isPopoverOpen && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-lime-300 p-3 z-30 text-slate-800 text-xs font-normal normal-case">
                        
                        {/* Sort Actions */}
                        <div className="flex flex-col gap-1 pb-2 border-b border-lime-100">
                          <span className="font-bold text-lime-900 mb-1">Sort Column</span>
                          <button
                            onClick={() => {
                              setSortColumn(header);
                              setSortDirection('asc');
                            }}
                            className={`flex items-center gap-2 p-1.5 rounded hover:bg-lime-50 text-left ${
                              sortColumn === header && sortDirection === 'asc' ? 'bg-lime-100 font-bold' : ''
                            }`}
                          >
                            <span>⬆️ Sort Ascending (A → Z)</span>
                          </button>
                          <button
                            onClick={() => {
                              setSortColumn(header);
                              setSortDirection('desc');
                            }}
                            className={`flex items-center gap-2 p-1.5 rounded hover:bg-lime-50 text-left ${
                              sortColumn === header && sortDirection === 'desc' ? 'bg-lime-100 font-bold' : ''
                            }`}
                          >
                            <span>⬇️ Sort Descending (Z → A)</span>
                          </button>
                        </div>

                        {/* Search Filter */}
                        <div className="py-2 border-b border-lime-100 flex flex-col gap-1">
                          <span className="font-bold text-lime-900 mb-1">Search {header}</span>
                          <input
                            type="text"
                            placeholder={`Search ${header}...`}
                            value={columnSearch[header] || ''}
                            onChange={(e) =>
                              setColumnSearch({ ...columnSearch, [header]: e.target.value })
                            }
                            className="w-full p-1.5 border border-lime-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-lime-600 bg-lime-50/50"
                          />
                        </div>

                        {/* Value Checklist Filter */}
                        {options.length > 0 && (
                          <div className="py-2 flex flex-col gap-1 max-h-40 overflow-y-auto">
                            <span className="font-bold text-lime-900 mb-1">Filter Values ({options.length})</span>
                            {options.map((opt) => {
                              const isChecked = (columnSelectedValues[header] || []).includes(opt);
                              return (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2 p-1 hover:bg-lime-50 rounded cursor-pointer text-slate-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleValueFilter(header, opt)}
                                    className="accent-lime-600 rounded"
                                  />
                                  <span className="truncate">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* Clear Filter Footer */}
                        {isFiltered && (
                          <button
                            onClick={() => clearColumnFilter(header)}
                            className="w-full mt-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded text-xs border border-red-200 transition-colors"
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
          <tbody className="divide-y divide-lime-200">
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={columnHeaders.length} className="px-4 py-8 text-center text-slate-500 font-medium">
                  No placements match your column filter criteria.
                </td>
              </tr>
            ) : (
              currentRows.map((row) => (
                <tr key={row.id} className="hover:bg-lime-50/70 transition-colors">
                  {columnHeaders.map((header) => {
                    const val = row[header] || '-';
                    const isEditing = editingCell?.rowId === row.id && editingCell?.header === header;
                    const cellKey = `${row.id}-${header}`;
                    const status = savingStatus[cellKey];
                    const isStatusCol = header.toLowerCase() === 'status';

                    return (
                      <td
                        key={header}
                        onClick={() => !isEditing && startEditing(row.id, header, val)}
                        className="px-4 py-3 border-r border-lime-200 last:border-r-0 text-slate-800 whitespace-nowrap min-w-[140px] relative cursor-pointer group hover:bg-lime-100/50 transition-colors"
                        title="Click to edit"
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveCellEdit(row.id, header)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit(row.id, header);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-full p-1 border border-lime-500 rounded text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-600"
                          />
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            {isStatusCol && val !== '-' ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lime-100 text-lime-900 border border-lime-300">
                                {val}
                              </span>
                            ) : (
                              <span>{val}</span>
                            )}

                            {status === 'saving' && (
                              <span className="text-[10px] text-amber-600 font-semibold animate-pulse">
                                Syncing...
                              </span>
                            )}
                            {status === 'saved' && (
                              <span className="text-[10px] text-green-700 font-semibold">
                                Saved ✓
                              </span>
                            )}
                            {status === 'error' && (
                              <span className="text-[10px] text-red-600 font-semibold">
                                Error ✕
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* BOTTOM PAGINATION CONTROLS */}
      {renderPaginationControls()}
    </div>
  );
}
