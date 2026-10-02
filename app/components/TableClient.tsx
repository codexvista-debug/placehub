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

function getColumnBubbleStyle(headerName: string) {
  const h = headerName.toLowerCase();
  if (h.includes('status')) {
    return 'bg-lime-100 text-lime-950 border-lime-300 font-semibold shadow-2xs';
  }
  if (h.includes('position')) {
    return 'bg-purple-100 text-purple-950 border-purple-200 font-medium';
  }
  if (h.includes('vendor') || h.includes('client')) {
    return 'bg-sky-100 text-sky-950 border-sky-200 font-semibold';
  }
  if (h.includes('consultant')) {
    return 'bg-emerald-100 text-emerald-950 border-emerald-200 font-medium';
  }
  if (h.includes('marketer')) {
    return 'bg-amber-100 text-amber-950 border-amber-300 font-medium';
  }
  if (h.includes('support')) {
    return 'bg-rose-100 text-rose-950 border-rose-200 font-medium';
  }
  if (h.includes('recruiter')) {
    return 'bg-violet-100 text-violet-950 border-violet-200 font-medium';
  }
  if (h.includes('time')) {
    return 'bg-slate-100 text-slate-800 border-slate-200 font-normal';
  }
  if (h.includes('date')) {
    return 'bg-teal-50 text-teal-950 border-teal-200 font-semibold';
  }
  return 'bg-lime-50/80 text-slate-800 border-lime-200 font-normal';
}

export default function TableClient({
  placements,
  columnHeaders,
  columnSchema = {},
}: TableClientProps) {
  const [data, setData] = useState(placements);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Active column popover menu: header string | null
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Global search query
  const [globalSearch, setGlobalSearch] = useState('');

  // Tracking updates from Notion for visual acknowledgment
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const [updatedCellKeys, setUpdatedCellKeys] = useState<Set<string>>(new Set());
  const [showOnlyUpdated, setShowOnlyUpdated] = useState(false);
  const initialLoadRef = useRef(false);

  // Sync health state
  const [syncStatus, setSyncStatus] = useState<'ok' | 'failed'>('ok');

  // Column-specific search text
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});

  // Column-specific selected values
  const [columnSelectedValues, setColumnSelectedValues] = useState<Record<string, string[]>>({});

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Editing state
  const [editingCell, setEditingCell] = useState<{ rowId: string; header: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingStatus, setSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  // BULLETPROOF Popover Close on Outside Click
  useEffect(() => {
    if (!activePopover) return;

    const handleDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (
        target.closest('[data-popover="true"]') ||
        target.closest('[data-popover-toggle="true"]')
      ) {
        return;
      }

      setActivePopover(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [activePopover]);

  // Real-time Silent Polling
  useEffect(() => {
    initialLoadRef.current = true;

    const interval = setInterval(async () => {
      if (editingCell) return;

      try {
        const res = await fetch('/api/fetch-placements');
        if (res.ok) {
          const json = await res.json();
          if (json.placements && Array.isArray(json.placements)) {
            const incoming: Record<string, string>[] = json.placements;

            setData((prevData) => {
              if (initialLoadRef.current && prevData.length > 0) {
                const prevMap = new Map(prevData.map((r) => [r.id, r]));
                const freshRowIds: string[] = [];
                const freshChangedCells: string[] = [];

                incoming.forEach((row) => {
                  const existing = prevMap.get(row.id);
                  if (!existing) {
                    freshRowIds.push(row.id);
                  } else {
                    columnHeaders.forEach((col) => {
                      if (existing[col] !== row[col]) {
                        freshChangedCells.push(`${row.id}-${col}`);
                      }
                    });
                  }
                });

                if (freshRowIds.length > 0) {
                  setNewRowIds((prev) => {
                    const next = new Set(prev);
                    freshRowIds.forEach((id) => next.add(id));
                    return next;
                  });
                }

                if (freshChangedCells.length > 0) {
                  setUpdatedCellKeys((prev) => {
                    const next = new Set(prev);
                    freshChangedCells.forEach((k) => next.add(k));
                    return next;
                  });
                }
              }

              return incoming;
            });

            setSyncStatus('ok');
          }
        } else {
          setSyncStatus('failed');
        }
      } catch (err) {
        console.error('Silent auto-poll error:', err);
        setSyncStatus('failed');
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [editingCell, columnHeaders]);

  // Unique options for each column
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

    // Global search across all columns
    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(query))
      );
    }

    if (showOnlyUpdated) {
      result = result.filter(
        (row) =>
          newRowIds.has(row.id) ||
          columnHeaders.some((col) => updatedCellKeys.has(`${row.id}-${col}`))
      );
    }

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
  }, [
    data,
    globalSearch,
    showOnlyUpdated,
    newRowIds,
    updatedCellKeys,
    columnHeaders,
    columnSearch,
    columnSelectedValues,
    sortColumn,
    sortDirection,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch, showOnlyUpdated, columnSearch, columnSelectedValues, sortColumn, sortDirection]);

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
      setSyncStatus('ok');
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
      setSyncStatus('failed');
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

  const acknowledgeAllUpdates = () => {
    setNewRowIds(new Set());
    setUpdatedCellKeys(new Set());
    setShowOnlyUpdated(false);
  };

  const jumpToFirstUpdate = () => {
    if (showOnlyUpdated) {
      document.querySelector('[data-updated="true"]')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
      return;
    }

    const targetIndex = filteredAndSortedData.findIndex(
      (row) =>
        newRowIds.has(row.id) ||
        columnHeaders.some((col) => updatedCellKeys.has(`${row.id}-${col}`))
    );

    if (targetIndex !== -1) {
      const targetPage = Math.floor(targetIndex / rowsPerPage) + 1;
      setCurrentPage(targetPage);

      setTimeout(() => {
        const el = document.querySelector('[data-updated="true"]');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 150);
    }
  };

  // Compact Inline Toolbar with Search Bar
  const renderPaginationBar = (isBottom = false) => (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-lime-900 font-medium ${isBottom ? 'pt-2' : 'pb-2 border-b border-lime-100'}`}>
      <div className="flex items-center gap-3 flex-wrap flex-1">
        <span className="text-slate-600 whitespace-nowrap">
          Showing <strong className="text-slate-900">{filteredAndSortedData.length === 0 ? 0 : startIndex + 1}</strong>-
          <strong className="text-slate-900">{Math.min(startIndex + rowsPerPage, filteredAndSortedData.length)}</strong> of{' '}
          <strong className="text-slate-900">{filteredAndSortedData.length}</strong> rows
          {showOnlyUpdated && (
            <span className="ml-1.5 text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[11px] font-bold">
              (Filtered to updates only)
            </span>
          )}
        </span>

        {/* Global Search Input Box (only shown on top toolbar) */}
        {!isBottom && (
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="🔍 Search all columns..."
              className="w-full px-3 py-1 border border-lime-300 rounded-md text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500 shadow-2xs"
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-2.5 py-1 rounded border border-lime-300 bg-white text-lime-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-lime-100 transition-colors text-xs font-semibold shadow-2xs cursor-pointer"
        >
          ← Prev
        </button>

        <span className="px-2.5 py-1 bg-lime-100 rounded border border-lime-300 text-lime-900 font-bold text-xs">
          {totalPages === 0 ? 0 : currentPage} / {totalPages}
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-2.5 py-1 rounded border border-lime-300 bg-white text-lime-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-lime-100 transition-colors text-xs font-semibold shadow-2xs cursor-pointer"
        >
          Next →
        </button>
      </div>
    </div>
  );

  const totalUpdatesCount = newRowIds.size + updatedCellKeys.size;
  const hasUnacknowledgedUpdates = totalUpdatesCount > 0;

  return (
    <div className="flex flex-col gap-2 w-full">
      
      {/* ACKNOWLEDGE & DIRECT JUMP BANNER */}
      {hasUnacknowledgedUpdates && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border-2 border-amber-400 text-amber-950 px-3.5 py-2.5 rounded-lg text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base animate-bounce">🔔</span>
            <span>
              <strong className="text-amber-900 font-bold">New updates from Notion:</strong>{' '}
              {newRowIds.size > 0 && (
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold mr-1">
                  +{newRowIds.size} New Row{newRowIds.size > 1 ? 's' : ''}
                </span>
              )}
              {updatedCellKeys.size > 0 && (
                <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                  {updatedCellKeys.size} Cell Update{updatedCellKeys.size > 1 ? 's' : ''}
                </span>
              )}
              {' '}detected.
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={jumpToFirstUpdate}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded shadow-xs transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
              <span>⚡ Jump Directly to Updates</span>
            </button>

            <button
              onClick={() => setShowOnlyUpdated((prev) => !prev)}
              className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer text-xs border ${
                showOnlyUpdated
                  ? 'bg-amber-800 text-white border-amber-900'
                  : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
            >
              {showOnlyUpdated ? '👁️ Show All Rows' : `🔍 View Updates Only (${totalUpdatesCount})`}
            </button>

            <button
              onClick={acknowledgeAllUpdates}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs transition-colors cursor-pointer text-xs"
            >
              ✓ Acknowledge All
            </button>
          </div>
        </div>
      )}

      {/* TOP PAGINATION & SEARCH BAR */}
      {renderPaginationBar(false)}

      {/* Table Container with Horizontal Scroll */}
      <div className="w-full overflow-x-auto border border-lime-300 rounded-lg shadow-xs bg-white min-h-[450px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-lime-100 text-lime-950 font-semibold border-b border-lime-300 sticky top-0 z-30">
            <tr>
              {columnHeaders.map((header) => {
                const isFiltered = isColumnFilteredOrSorted(header);
                const isPopoverOpen = activePopover === header;
                const options = columnUniqueOptions[header] || [];

                return (
                  <th
                    key={header}
                    className="px-3 py-2 border-r border-lime-300 last:border-r-0 bg-lime-100 font-bold select-none relative whitespace-normal break-words max-w-[140px]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="leading-snug">{header}</span>

                      <button
                        type="button"
                        data-popover-toggle="true"
                        onClick={() => {
                          setActivePopover((prev) => (prev === header ? null : header));
                        }}
                        className={`p-0.5 px-1 rounded hover:bg-lime-200 transition-colors shrink-0 cursor-pointer ${
                          isFiltered ? 'text-lime-900 bg-lime-300 font-bold' : 'text-lime-700'
                        }`}
                        title="Sort & Filter Column"
                      >
                        {sortColumn === header ? (sortDirection === 'asc' ? '▲' : '▼') : '⚙️'}
                      </button>
                    </div>

                    {isPopoverOpen && (
                      <div
                        data-popover="true"
                        className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-2xl border-2 border-lime-400 p-3 z-50 text-slate-800 text-xs font-normal normal-case"
                      >
                        <div className="flex flex-col gap-1 pb-2 border-b border-lime-100">
                          <span className="font-bold text-lime-900 mb-1">Sort Column</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSortColumn(header);
                              setSortDirection('asc');
                              setActivePopover(null);
                            }}
                            className={`flex items-center gap-2 p-1.5 rounded hover:bg-lime-50 text-left cursor-pointer ${
                              sortColumn === header && sortDirection === 'asc' ? 'bg-lime-100 font-bold text-lime-950' : ''
                            }`}
                          >
                            <span>⬆️ Sort Ascending (A → Z)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSortColumn(header);
                              setSortDirection('desc');
                              setActivePopover(null);
                            }}
                            className={`flex items-center gap-2 p-1.5 rounded hover:bg-lime-50 text-left cursor-pointer ${
                              sortColumn === header && sortDirection === 'desc' ? 'bg-lime-100 font-bold text-lime-950' : ''
                            }`}
                          >
                            <span>⬇️ Sort Descending (Z → A)</span>
                          </button>
                        </div>

                        <div className="py-2 border-b border-lime-100 flex flex-col gap-1">
                          <span className="font-bold text-lime-900 mb-1">Search {header}</span>
                          <input
                            type="text"
                            placeholder={`Type to search ${header}...`}
                            value={columnSearch[header] || ''}
                            onChange={(e) =>
                              setColumnSearch({ ...columnSearch, [header]: e.target.value })
                            }
                            className="w-full p-1.5 border border-lime-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-lime-500 bg-lime-50/50 text-slate-900"
                          />
                        </div>

                        {options.length > 0 && (
                          <div className="py-2 flex flex-col gap-1 max-h-44 overflow-y-auto">
                            <span className="font-bold text-lime-900 mb-1">Filter Values ({options.length})</span>
                            {options.map((opt) => {
                              const isChecked = (columnSelectedValues[header] || []).includes(opt);
                              return (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2 p-1.5 hover:bg-lime-50 rounded cursor-pointer text-slate-800 text-xs select-none"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleValueFilter(header, opt)}
                                    className="accent-lime-600 rounded w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="truncate">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

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
          <tbody className="divide-y divide-lime-200">
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={columnHeaders.length} className="px-4 py-8 text-center text-slate-500 font-medium">
                  No placements match your search or filter criteria.
                </td>
              </tr>
            ) : (
              currentRows.map((row) => {
                const isNewRow = newRowIds.has(row.id);

                return (
                  <tr
                    key={row.id}
                    data-updated={isNewRow ? 'true' : undefined}
                    className={`transition-colors ${
                      isNewRow
                        ? 'bg-emerald-50/90 ring-1 ring-emerald-300'
                        : 'hover:bg-lime-50/70'
                    }`}
                  >
                    {columnHeaders.map((header, colIndex) => {
                      const val = row[header] || '-';
                      const isEditing = editingCell?.rowId === row.id && editingCell?.header === header;
                      const cellKey = `${row.id}-${header}`;
                      const isUpdatedCell = updatedCellKeys.has(cellKey);
                      const status = savingStatus[cellKey];
                      const bubbleStyle = getColumnBubbleStyle(header);

                      return (
                        <td
                          key={header}
                          data-updated={isUpdatedCell ? 'true' : undefined}
                          onClick={() => {
                            if (!isEditing) startEditing(row.id, header, val);
                            if (isUpdatedCell) {
                              setUpdatedCellKeys((prev) => {
                                const next = new Set(prev);
                                next.delete(cellKey);
                                return next;
                              });
                            }
                            if (isNewRow) {
                              setNewRowIds((prev) => {
                                const next = new Set(prev);
                                next.delete(row.id);
                                return next;
                              });
                            }
                          }}
                          className={`px-2.5 py-2 border-r border-lime-200 last:border-r-0 text-slate-800 whitespace-normal break-words max-w-[170px] min-w-[110px] relative cursor-pointer group transition-colors leading-snug align-top ${
                            isUpdatedCell ? 'bg-amber-100/90 ring-2 ring-amber-400' : 'hover:bg-lime-100/40'
                          }`}
                          title="Click to edit or acknowledge"
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
                            <div className="flex flex-col gap-1 items-start justify-between min-h-[24px]">
                              {colIndex === 0 && isNewRow && (
                                <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide shadow-2xs">
                                  ✨ New Row
                                </span>
                              )}

                              {isUpdatedCell && (
                                <span className="bg-amber-600 text-white text-[9px] px-1.5 py-0.2 rounded font-bold shadow-2xs">
                                  ⚡ Updated
                                </span>
                              )}

                              {val !== '-' ? (
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] border ${bubbleStyle} max-w-full break-words leading-tight`}>
                                  {val}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BOTTOM PAGINATION BAR */}
      {renderPaginationBar(true)}
    </div>
  );
}
