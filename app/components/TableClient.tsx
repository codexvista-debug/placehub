'use client';

import React, { useState } from 'react';

interface TableClientProps {
  placements: Record<string, string>[];
  columnHeaders: string[];
}

export default function TableClient({ placements, columnHeaders }: TableClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  const totalPages = Math.ceil(placements.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = placements.slice(startIndex, startIndex + rowsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Table Container with Horizontal Scroll */}
      <div className="w-full overflow-x-auto border border-lime-300 rounded-lg shadow-sm bg-white scrollbar-thin scrollbar-thumb-lime-400">
        <table className="min-w-max w-full text-left text-xs sm:text-sm border-collapse">
          <thead className="bg-lime-100 text-lime-950 font-semibold border-b border-lime-300 sticky top-0 z-10">
            <tr>
              {columnHeaders.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 border-r border-lime-300 last:border-r-0 whitespace-nowrap bg-lime-100 font-bold"
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
                  const isStatus = header.toLowerCase() === 'status';

                  return (
                    <td
                      key={header}
                      className="px-4 py-3 border-r border-lime-200 last:border-r-0 text-slate-700 whitespace-nowrap min-w-[120px]"
                    >
                      {isStatus && val !== '-' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lime-100 text-lime-900 border border-lime-300">
                          {val}
                        </span>
                      ) : (
                        val
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
              {Math.min(startIndex + rowsPerPage, placements.length)}
            </span>{' '}
            of <span className="font-bold text-lime-950">{placements.length}</span> rows
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
