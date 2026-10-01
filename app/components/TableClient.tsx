'use client';

import React, { useState, useEffect, useMemo } from 'react';

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

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedClient, setSelectedClient] = useState('ALL');

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Editing state
  const [editingCell, setEditingCell] = useState<{ rowId: string; header: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingStatus, setSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  // Real-time Silent Polling (Notion -> Web without browser refresh)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (editingCell) return;

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
  }, [editingCell]);

  // Extract unique options for Status & Client dropdown filters
  const statusFilterOptions = useMemo(() => {
    const options = new Set<string>();
    data.forEach((row) => {
      if (row.Status && row.Status !== '-') options.add(row.Status);
    });
    return Array.from(options).sort();
  }, [data]);

  const clientFilterOptions = useMemo(() => {
    const options = new Set<string>();
    data.forEach((row) => {
      const client = row['Vendor / Client'];
      if (client && client !== '-') options.add(client);
    });
    return Array.from(options).sort();
  }, [data]);

  // Filter & Sort Logic
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(query))
      );
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      result = result.filter((row) => row.Status === selectedStatus);
    }

    // Client filter
    if (selectedClient !== 'ALL') {
      result = result.filter((row) => row['Vendor / Client'] === selectedClient);
    }

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
  }, [data, searchQuery, selectedStatus, selectedClient, sortColumn, sortDirection]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedClient, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);

  const handleSort = (header: string) => {
    if (sortColumn === header) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(header);
      setSortDirection('asc');
    }
  };

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

  const renderEditInput = (rowId: string, header: string) => {
    const schema = columnSchema[header];
    const type = schema?.type || 'rich_text';
    const options = schema?.options || [];

    if ((type === 'select' || type === 'multi_select' || type === 'status') && options.length > 0) {
      return (
        <select
          autoFocus
          value={editValue}
          onChange={(e) => {
            const selectedVal = e.target.value;
            setEditValue(selectedVal);
            saveCellEdit(rowId, header, selectedVal);
          }}
          onBlur={() => saveCellEdit(rowId, header)}
          className="w-full p-1 border border-lime-500 rounded text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-600"
        >
          <option value="">-- Select {header} --</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'date') {
      return (
        <input
          type="date"
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveCellEdit(rowId, header)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveCellEdit(rowId, header);
            if (e.key === 'Escape') setEditingCell(null);
          }}
          className="w-full p-1 border border-lime-500 rounded text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-600"
        />
      );
    }

    return (
      <input
        type="text"
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => saveCellEdit(rowId, header)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') saveCellEdit(rowId, header);
          if (e.key === 'Escape') setEditingCell(null);
        }}
        className="w-full p-1 border border-lime-500 rounded text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-600"
      />
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      
      {/* Live Sync Badge & Search / Filter Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-lime-900">
          <span className="flex items-center gap-1.5 bg-lime-100 px-2.5 py-1 rounded-full border border-lime-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
            🟢 Live Auto-Sync Active (Auto-refreshes from Notion)
          </span>
          <span className="text-slate-500 font-normal">Click column header to sort • Click cell to edit</span>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-lime-50/70 p-3 rounded-lg border border-lime-200">
          
          {/* Search Box */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-lime-900">Search Placements:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search consultant, position..."
              className="w-full p-2 border border-lime-300 rounded-md text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-600"
            />
          </div>

          {/* Filter by Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-lime-900">Filter Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 border border-lime-300 rounded-md text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-600"
            >
              <option value="ALL">All Statuses</option>
              {statusFilterOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Client / Vendor */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-lime-900">Filter Vendor / Client:</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full p-2 border border-lime-300 rounded-md text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-600"
            >
              <option value="ALL">All Clients</option>
              {clientFilterOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || selectedStatus !== 'ALL' || selectedClient !== 'ALL' || sortColumn) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('ALL');
                  setSelectedClient('ALL');
                  setSortColumn(null);
                }}
                className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-md text-xs border border-red-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="w-full overflow-x-auto border border-lime-300 rounded-lg shadow-sm bg-white">
        <table className="min-w-max w-full text-left text-xs sm:text-sm border-collapse">
          <thead className="bg-lime-100 text-lime-950 font-semibold border-b border-lime-300 sticky top-0 z-10">
            <tr>
              {columnHeaders.map((header) => {
                const isSorted = sortColumn === header;
                return (
                  <th
                    key={header}
                    onClick={() => handleSort(header)}
                    className="px-4 py-3 border-r border-lime-300 last:border-r-0 whitespace-nowrap bg-lime-100 font-bold select-none cursor-pointer hover:bg-lime-200/80 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{header}</span>
                      <span className="text-lime-700 text-xs">
                        {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-lime-200">
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={columnHeaders.length} className="px-4 py-8 text-center text-slate-500 font-medium">
                  No placements match your current filter criteria.
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
                          renderEditInput(row.id, header)
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 px-1 text-sm text-lime-900 font-medium">
          <div>
            Showing <span className="font-bold text-lime-950">{startIndex + 1}</span> to{' '}
            <span className="font-bold text-lime-950">
              {Math.min(startIndex + rowsPerPage, filteredAndSortedData.length)}
            </span>{' '}
            of <span className="font-bold text-lime-950">{filteredAndSortedData.length}</span> rows
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentPage === 1}
              className="px-4 py-1.5 rounded-md border border-lime-300 bg-white text-lime-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-lime-100 transition-colors shadow-xs"
            >
              ← Previous
            </button>

            <span className="px-3 py-1 bg-lime-100 rounded-md border border-lime-300 text-lime-900 font-bold">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="px-4 py-1.5 rounded-md border border-lime-300 bg-white text-lime-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-lime-100 transition-colors shadow-xs"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
