'use client';

import React, { useState } from 'react';

interface TableClientProps {
  placements: Record<string, string>[];
  columnHeaders: string[];
  columnTypes?: Record<string, string>;
}

export default function TableClient({ placements, columnHeaders, columnTypes = {} }: TableClientProps) {
  const [data, setData] = useState(placements);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Editing state: { rowId, header }
  const [editingCell, setEditingCell] = useState<{ rowId: string; header: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingStatus, setSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = data.slice(startIndex, startIndex + rowsPerPage);

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

  const saveCellEdit = async (rowId: string, header: string) => {
    setEditingCell(null);

    // Find previous value
    const row = data.find((r) => r.id === rowId);
    if (!row || row[header] === editValue) return;

    const cellKey = `${rowId}-${header}`;
    setSavingStatus((prev) => ({ ...prev, [cellKey]: 'saving' }));

    // Optimistic UI update
    setData((prevData) =>
      prevData.map((r) => (r.id === rowId ? { ...r, [header]: editValue || '-' } : r))
    );

    try {
      const response = await fetch('/api/update-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: rowId,
          propertyName: header,
          propertyType: columnTypes[header] || 'rich_text',
          value: editValue,
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

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Table Container with Horizontal Scroll */}
      <div className="w-full overflow-x-auto border border-lime-300 rounded-lg shadow-sm bg-white">
        <table className="min-w-max w-full text-left text-xs sm:text-sm border-collapse">
          <thead className="bg-lime-100 text-lime-950 font-semibold border-b border-lime-300 sticky top-0 z-10">
            <tr>
              {columnHeaders.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 border-r border-lime-300 last:border-r-0 whitespace-nowrap bg-lime-100 font-bold select-none"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-lime-200">
            {currentRows.map((row) => (
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
                          className="w-full p-1 border border-lime-500 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-lime-600"
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 px-1 text-sm text-lime-900 font-medium">
          <div>
            Showing <span className="font-bold text-lime-950">{startIndex + 1}</span> to{' '}
            <span className="font-bold text-lime-950">
              {Math.min(startIndex + rowsPerPage, data.length)}
            </span>{' '}
            of <span className="font-bold text-lime-950">{data.length}</span> rows
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
