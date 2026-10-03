'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import CellBadge from './CellBadge';

interface SchemaInfo {
  type: string;
  options: string[];
}

interface TableClientProps {
  placements: Record<string, string>[];
  columnHeaders: string[];
  columnSchema?: Record<string, SchemaInfo>;
}


// Smart Chronological Date Parser for Live Table
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

export default function TableClient({
  placements,
  columnHeaders,
  columnSchema = {},
}: TableClientProps) {
  const [data, setData] = useState(placements);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');

  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const [updatedCellKeys, setUpdatedCellKeys] = useState<Set<string>>(new Set());
  const [showOnlyUpdated, setShowOnlyUpdated] = useState(false);
  const initialLoadRef = useRef(false);

  const [syncStatus, setSyncStatus] = useState<'ok' | 'failed'>('ok');
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [columnSelectedValues, setColumnSelectedValues] = useState<Record<string, string[]>>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [editingCell, setEditingCell] = useState<{ rowId: string; header: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingStatus, setSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

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

  // Silent polling for updates
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
                      if (existing[col] !== row[col]) freshChangedCells.push(`${row.id}-${col}`);
                    });
                  }
                });
                if (freshRowIds.length > 0) setNewRowIds((prev) => { const n = new Set(prev); freshRowIds.forEach((id) => n.add(id)); return n; });
                if (freshChangedCells.length > 0) setUpdatedCellKeys((prev) => { const n = new Set(prev); freshChangedCells.forEach((k) => n.add(k)); return n; });
              }
              return incoming;
            });
            setSyncStatus('ok');
          }
        } else {
          setSyncStatus('failed');
        }
      } catch (err) {
        console.error('Poll error:', err);
        setSyncStatus('failed');
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [editingCell, columnHeaders]);

  const columnUniqueOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    columnHeaders.forEach((header) => {
      const set = new Set<string>();
      data.forEach((row) => { const val = row[header]; if (val && val !== '-') set.add(val); });
      map[header] = Array.from(set).sort();
    });
    return map;
  }, [data, columnHeaders]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(q)));
    }
    if (showOnlyUpdated) {
      result = result.filter((row) => newRowIds.has(row.id) || columnHeaders.some((col) => updatedCellKeys.has(`${row.id}-${col}`)));
    }
    columnHeaders.forEach((header) => {
      const search = columnSearch[header]?.toLowerCase();
      if (search) result = result.filter((row) => (row[header] || '').toLowerCase().includes(search));
      const sel = columnSelectedValues[header];
      if (sel && sel.length > 0) result = result.filter((row) => sel.includes(row[header]));
    });

    if (sortColumn) {
      const isDateCol = sortColumn.toLowerCase().includes('date') || sortColumn.toLowerCase().includes('time');

      result.sort((a, b) => {
        const rawA = a[sortColumn] || '';
        const rawB = b[sortColumn] || '';

        if (isDateCol) {
          const timeA = parseDateToTimestamp(rawA);
          const timeB = parseDateToTimestamp(rawB);
          if (timeA !== timeB) {
            return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
          }
        }

        const va = rawA.toLowerCase();
        const vb = rawB.toLowerCase();
        if (va < vb) return sortDirection === 'asc' ? -1 : 1;
        if (va > vb) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, globalSearch, showOnlyUpdated, newRowIds, updatedCellKeys, columnHeaders, columnSearch, columnSelectedValues, sortColumn, sortDirection]);

  useEffect(() => { setCurrentPage(1); }, [globalSearch, showOnlyUpdated, columnSearch, columnSelectedValues, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);

  const handleNext = () => { if (currentPage < totalPages) setCurrentPage((p) => p + 1); };
  const handlePrev = () => { if (currentPage > 1) setCurrentPage((p) => p - 1); };

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
    setData((prev) => prev.map((r) => (r.id === rowId ? { ...r, [header]: valToSave || '-' } : r)));
    try {
      const propType = columnSchema[header]?.type || 'rich_text';
      const response = await fetch('/api/update-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: rowId, propertyName: header, propertyType: propType, value: valToSave }),
      });
      if (!response.ok) throw new Error('Update failed');
      setSavingStatus((prev) => ({ ...prev, [cellKey]: 'saved' }));
      setSyncStatus('ok');
      setTimeout(() => { setSavingStatus((prev) => { const n = { ...prev }; delete n[cellKey]; return n; }); }, 2000);
    } catch (err) {
      console.error('Error saving:', err);
      setSavingStatus((prev) => ({ ...prev, [cellKey]: 'error' }));
      setSyncStatus('failed');
    }
  };

  const toggleValueFilter = (header: string, option: string) => {
    setColumnSelectedValues((prev) => {
      const current = prev[header] || [];
      const updated = current.includes(option) ? current.filter((i) => i !== option) : [...current, option];
      return { ...prev, [header]: updated };
    });
  };

  const clearColumnFilter = (header: string) => {
    setColumnSearch((prev) => { const n = { ...prev }; delete n[header]; return n; });
    setColumnSelectedValues((prev) => { const n = { ...prev }; delete n[header]; return n; });
    if (sortColumn === header) setSortColumn(null);
  };

  const isColumnFilteredOrSorted = (header: string) =>
    sortColumn === header || Boolean(columnSearch[header]) || (columnSelectedValues[header]?.length > 0);

  const acknowledgeAllUpdates = () => {
    setNewRowIds(new Set());
    setUpdatedCellKeys(new Set());
    setShowOnlyUpdated(false);
  };

  const jumpToFirstUpdate = () => {
    if (showOnlyUpdated) {
      document.querySelector('[data-updated="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      return;
    }
    const targetIndex = filteredAndSortedData.findIndex((row) =>
      newRowIds.has(row.id) || columnHeaders.some((col) => updatedCellKeys.has(`${row.id}-${col}`))
    );
    if (targetIndex !== -1) {
      setCurrentPage(Math.floor(targetIndex / rowsPerPage) + 1);
      setTimeout(() => {
        document.querySelector('[data-updated="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }, 150);
    }
  };

  const renderPaginationBar = (isBottom = false) => (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-medium theme-text-muted ${isBottom ? 'pt-2' : 'pb-2 border-b theme-border'}`}
    >
      <div className="flex items-center gap-3 flex-wrap flex-1">
        <span className="theme-text-body whitespace-nowrap">
          Showing{' '}
          <strong className="theme-text">{filteredAndSortedData.length === 0 ? 0 : startIndex + 1}</strong>–
          <strong className="theme-text">{Math.min(startIndex + rowsPerPage, filteredAndSortedData.length)}</strong>{' '}
          of <strong className="theme-text">{filteredAndSortedData.length}</strong> rows
          {showOnlyUpdated && (
            <span className="ml-1.5 text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[11px] font-bold">
              (Filtered to updates only)
            </span>
          )}
        </span>

        {/* Global search — top bar only */}
        {!isBottom && (
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
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
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-2.5 py-1 rounded border text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors theme-surface theme-border theme-text"
          style={{ outline: 'none' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-alt)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface)'; }}
        >
          ← Prev
        </button>

        <span
          className="px-2.5 py-1 rounded border text-xs font-bold theme-surface-alt theme-border theme-text"
        >
          {totalPages === 0 ? 0 : currentPage} / {totalPages}
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-2.5 py-1 rounded border text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors theme-surface theme-border theme-text"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-alt)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface)'; }}
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

      {/* Update Banner */}
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
              ⚡ Jump Directly to Updates
            </button>
            <button
              onClick={() => setShowOnlyUpdated((p) => !p)}
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

      {/* Top pagination */}
      {renderPaginationBar(false)}

      {/* Table */}
      <div
        className="w-full overflow-x-auto rounded-lg shadow-xs min-h-[450px] border theme-table-border"
        style={{ backgroundColor: 'var(--color-table-row-odd)' }}
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead
            className="theme-table-head sticky top-0 z-30 border-b theme-table-border"
          >
            <tr>
              {/* Row index # column */}
              <th className="px-3 py-2 font-bold w-12 text-center border-r theme-table-border select-none">
                #
              </th>

              {columnHeaders.map((header) => {
                const isFiltered = isColumnFilteredOrSorted(header);
                const isPopoverOpen = activePopover === header;
                const options = columnUniqueOptions[header] || [];

                return (
                  <th
                    key={header}
                    className="px-3 py-2 font-bold select-none relative whitespace-normal break-words max-w-[140px] border-r last:border-r-0 theme-table-border"
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

                    {/* Popover */}
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
                              onClick={() => { setSortColumn(header); setSortDirection(dir); setActivePopover(null); }}
                              className="flex items-center gap-2 p-1.5 rounded text-left cursor-pointer w-full transition-colors"
                              style={{
                                backgroundColor: sortColumn === header && sortDirection === dir
                                  ? 'var(--color-surface-alt)'
                                  : 'transparent',
                                fontWeight: sortColumn === header && sortDirection === dir ? 700 : 400,
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-alt)'; }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.backgroundColor =
                                  sortColumn === header && sortDirection === dir ? 'var(--color-surface-alt)' : 'transparent';
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
                            onChange={(e) => setColumnSearch({ ...columnSearch, [header]: e.target.value })}
                            className="w-full p-1.5 border rounded text-xs focus:outline-none theme-input theme-border"
                          />
                        </div>

                        {/* Filter values */}
                        {options.length > 0 && (
                          <div className="py-2 flex flex-col gap-1 max-h-44 overflow-y-auto">
                            <span className="font-bold theme-text mb-1">Filter Values ({options.length})</span>
                            {options.map((opt) => {
                              const isChecked = (columnSelectedValues[header] || []).includes(opt);
                              return (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs select-none theme-text-body transition-colors"
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-alt)'; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
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
                            onClick={() => { clearColumnFilter(header); setActivePopover(null); }}
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
                <td colSpan={columnHeaders.length + 1} className="px-4 py-8 text-center theme-text-muted font-medium">
                  No placements match your search or filter criteria.
                </td>
              </tr>
            ) : (
              currentRows.map((row, rowIndex) => {
                const isNewRow = newRowIds.has(row.id);
                const isEven = rowIndex % 2 === 0;
                const displayRowNumber = startIndex + rowIndex + 1;

                return (
                  <tr
                    key={row.id}
                    data-updated={isNewRow ? 'true' : undefined}
                    className="transition-colors"
                    style={{
                      backgroundColor: isNewRow
                        ? 'rgba(16,185,129,0.08)'
                        : isEven
                        ? 'var(--color-table-row-even)'
                        : 'var(--color-table-row-odd)',
                      boxShadow: isNewRow ? 'inset 0 0 0 1px rgba(16,185,129,0.4)' : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isNewRow) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-table-row-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isNewRow) (e.currentTarget as HTMLElement).style.backgroundColor = isEven ? 'var(--color-table-row-even)' : 'var(--color-table-row-odd)';
                    }}
                  >
                    {/* # Row Number column */}
                    <td
                      className="px-2.5 py-2 text-center font-mono font-bold text-[11px] border-r theme-table-border theme-text-muted"
                    >
                      {displayRowNumber}
                    </td>

                    {columnHeaders.map((header, colIndex) => {
                      const val = row[header] || '-';
                      const isEditing = editingCell?.rowId === row.id && editingCell?.header === header;
                      const cellKey = `${row.id}-${header}`;
                      const isUpdatedCell = updatedCellKeys.has(cellKey);
                      const status = savingStatus[cellKey];

                      return (
                        <td
                          key={header}
                          data-updated={isUpdatedCell ? 'true' : undefined}
                          onClick={() => {
                            if (!isEditing) startEditing(row.id, header, val);
                            if (isUpdatedCell) setUpdatedCellKeys((prev) => { const n = new Set(prev); n.delete(cellKey); return n; });
                            if (isNewRow) setNewRowIds((prev) => { const n = new Set(prev); n.delete(row.id); return n; });
                          }}
                          className="px-2.5 py-2 border-r last:border-r-0 whitespace-normal break-words max-w-[180px] min-w-[110px] relative cursor-pointer transition-colors leading-snug align-top"
                          style={{
                            borderColor: 'var(--color-table-border)',
                            backgroundColor: isUpdatedCell ? 'rgba(245,158,11,0.12)' : undefined,
                            boxShadow: isUpdatedCell ? 'inset 0 0 0 2px rgba(245,158,11,0.6)' : undefined,
                            color: 'var(--color-text-body)',
                          }}
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
                              className="w-full p-1 border rounded text-xs focus:outline-none theme-input theme-border"
                              style={{ borderColor: 'var(--color-accent)' }}
                            />
                          ) : (
                            <div className="flex flex-col gap-1 items-start justify-between min-h-[24px]">
                              {colIndex === 0 && isNewRow && (
                                <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide shadow-2xs">
                                  ✨ New Row
                                </span>
                              )}
                              {isUpdatedCell && (
                                <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-2xs">
                                  ⚡ Updated
                                </span>
                              )}
                              <CellBadge header={header} value={val} />
                              {status === 'saving' && <span className="text-[10px] text-amber-600 font-semibold animate-pulse">Syncing...</span>}
                              {status === 'saved' && <span className="text-[10px] text-green-700 font-semibold">Saved ✓</span>}
                              {status === 'error' && <span className="text-[10px] text-red-600 font-semibold">Error ✕</span>}
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

      {/* Bottom pagination */}
      {renderPaginationBar(true)}
    </div>
  );
}
