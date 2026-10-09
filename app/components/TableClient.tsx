'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import CellBadge from './CellBadge';
import CellSmartEditor from './CellSmartEditor';
import InterviewDocket from './InterviewDocket';
import { normalizeName, getInitials } from '@/app/utils/nameUtils';

interface SchemaInfo {
  type: string;
  options: string[];
}

interface TableClientProps {
  placements: Record<string, string>[];
  columnHeaders: string[];
  columnSchema?: Record<string, SchemaInfo>;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const monthsAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Smart Chronological Date Parser for Live Table (handles ISO, Notion date strings, composites)
function parseDateToTimestamp(str: string): number {
  if (!str || str === '-' || str.trim() === '') return 0;
  const clean = str.trim();

  // 1. Direct ISO format YYYY-MM-DD
  const isoMatch = clean.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(y, m, d).getTime();
  }

  // 2. Standard timestamp parse if possible
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) return parsed;

  // 3. Month name/abbr match (e.g. "Tue Jun 16, 2026 12:30 pm" or "Jun 16 2026")
  const mMatch = clean.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
  if (mMatch) {
    const mSub = mMatch[1].toLowerCase().substring(0, 3);
    const mIdx = monthsAbbr.indexOf(mSub);
    const dMatch = clean.match(/\b(\d{1,2})\b/);
    const yMatch = clean.match(/\b(20\d{2})\b/);
    const d = dMatch ? parseInt(dMatch[1], 10) : 1;
    const y = yMatch ? parseInt(yMatch[1], 10) : 2026;
    if (mIdx !== -1) {
      return new Date(y, mIdx, d).getTime();
    }
  }

  // 4. Slash format MM/DD/YYYY
  const slashMatch = clean.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2}|\d{2})\b/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10) - 1;
    const d = parseInt(slashMatch[2], 10);
    let y = parseInt(slashMatch[3], 10);
    if (y < 100) y += 2000;
    return new Date(y, m, d).getTime();
  }

  return 0;
}

// Extract Month Label from Date String (e.g. "June 2026" or "January 2026")
function extractMonthLabel(str: string): string {
  if (!str || str === '-' || str.trim() === '') return 'Unspecified';
  const clean = str.trim();

  // 1. Check for ISO format YYYY-MM-DD (e.g. "2026-06-16")
  const isoMatch = clean.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = parseInt(isoMatch[2], 10) - 1;
    if (m >= 0 && m < 12) {
      return `${monthNames[m]} ${y}`;
    }
  }

  // 2. Check for month word / abbreviation anywhere in string (e.g. "Tue Jun 16, 2026", "June 5, 2026")
  const monthWordMatch = clean.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
  if (monthWordMatch) {
    const sub = monthWordMatch[1].toLowerCase().substring(0, 3);
    const idx = monthsAbbr.indexOf(sub);
    if (idx !== -1) {
      const yearMatch = clean.match(/\b(20\d{2})\b/);
      const year = yearMatch ? yearMatch[1] : '2026';
      return `${monthNames[idx]} ${year}`;
    }
  }

  // 3. Check for MM/DD/YYYY or M/D/YYYY
  const slashMatch = clean.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2}|\d{2})\b/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10) - 1;
    let y = slashMatch[3];
    if (y.length === 2) y = '20' + y;
    if (m >= 0 && m < 12) {
      return `${monthNames[m]} ${y}`;
    }
  }

  return 'Other';
}

function compareMonths(a: string, b: string): number {
  const [mA, yA] = a.split(' ');
  const [mB, yB] = b.split(' ');
  if (yA !== yB) return (parseInt(yA) || 0) - (parseInt(yB) || 0);
  return monthNames.indexOf(mA) - monthNames.indexOf(mB);
}


// Flexible field getter to handle slightly differing column names in Notion
function getField(row: Record<string, string>, searchKeys: string[]): string {
  for (const key of searchKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  const rowKeys = Object.keys(row);
  for (const key of searchKeys) {
    const match = rowKeys.find((rk) => rk.toLowerCase().includes(key.toLowerCase()));
    if (match && row[match]) return row[match];
  }
  return '';
}

function getColumnWidthClass(header: string): string {
  const h = header.toLowerCase();
  if (h === 'date') return 'w-[95px] min-w-[90px] max-w-[105px] whitespace-nowrap';
  if (h.includes('time')) return 'w-[170px] min-w-[155px] max-w-[195px]';
  if (h.includes('consultant') || h.includes('candidate')) return 'w-[155px] min-w-[140px] max-w-[175px]';
  if (h.includes('position') || h.includes('role')) return 'w-[155px] min-w-[140px] max-w-[185px]';
  if (h.includes('vendor') || h.includes('client')) return 'w-[125px] min-w-[110px] max-w-[145px]';
  if (h.includes('status')) return 'w-[125px] min-w-[115px] max-w-[140px]';
  if (h.includes('marketer')) return 'w-[105px] min-w-[95px] max-w-[120px]';
  if (h.includes('support')) return 'w-[105px] min-w-[95px] max-w-[120px]';
  if (h.includes('recruiter') && !h.includes('email') && !h.includes('phone')) return 'w-[145px] min-w-[125px] max-w-[170px]';
  if (h.includes('email')) return 'w-[210px] min-w-[185px] max-w-[245px]';
  if (h.includes('phone')) return 'w-[165px] min-w-[145px] max-w-[190px]';
  if (h.includes('rate') || h.includes('price')) return 'w-[95px] min-w-[85px] max-w-[110px] whitespace-nowrap';
  if (h.includes('update') || h.includes('notes')) return 'w-[260px] min-w-[210px] max-w-[320px]';
  return 'w-[125px] min-w-[105px] max-w-[155px]';
}

export default function TableClient({
  placements,
  columnHeaders,
  columnSchema = {},
}: TableClientProps) {
  const [data, setData] = useState(placements);

  // View Mode: 'table' is the default landing tab as requested
  const [viewMode, setViewMode] = useState<'table' | 'metrics'>('table');

  // Metrics filters & Dossier inspector state
  const [selectedMarketerFilter, setSelectedMarketerFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedDossierMarketer, setSelectedDossierMarketer] = useState<string | null>(null);
  const [dossierMonthFilter, setDossierMonthFilter] = useState<string>('all');
  const [dossierSearch, setDossierSearch] = useState<string>('');
  const [dossierPage, setDossierPage] = useState<number>(1);
  const dossierRowsPerPage = 10;

  // Table specific state
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
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  // Row deletion and context menu states
  const [rowToDelete, setRowToDelete] = useState<Record<string, string> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: Record<string, string>;
    cellHeader?: string;
    cellValue?: string;
  } | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [contextMenu]);

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
        const res = await fetch('/api/fetch-placements', { cache: 'no-store' });
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

  const handleDocketSelectRow = (rowId: string) => {
    const rowIndex = filteredAndSortedData.findIndex((r) => r.id === rowId);
    if (rowIndex !== -1) {
      const targetPage = Math.floor(rowIndex / rowsPerPage) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
    setHighlightedRowId(rowId);
    setTimeout(() => {
      const el = document.getElementById(`row-${rowId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    setTimeout(() => {
      setHighlightedRowId(null);
    }, 4000);
  };

  const handleDeleteConfirm = async () => {
    if (!rowToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/delete-placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: rowToDelete.id }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to delete row');
      }
      setData((prev) => prev.filter((r) => r.id !== rowToDelete.id));
      setRowToDelete(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Error deleting placement');
    } finally {
      setIsDeleting(false);
    }
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

  // ==========================================
  // METRICS & ANALYTICS COMPUTATIONS (LIVE TABLE)
  // ==========================================
  const analytics = useMemo(() => {
    // 1. Gather all unique months, marketers, and statuses from full dataset
    const allMonthsSet = new Set<string>();
    const allMarketersSet = new Set<string>();
    const allStatusesSet = new Set<string>();

    data.forEach((r) => {
      const mName = normalizeName(getField(r, ['marketer']));
      if (mName && mName !== 'Unknown') allMarketersSet.add(mName);
      const st = (getField(r, ['status']) || '').trim();
      if (st && st !== '-') allStatusesSet.add(st);
      const dateVal = getField(r, ['date', 'interview time', 'time']);
      const mLabel = extractMonthLabel(dateVal);
      if (mLabel && mLabel !== 'Unspecified' && mLabel !== 'Other') {
        allMonthsSet.add(mLabel);
      }
    });

    const monthList = Array.from(allMonthsSet).sort(compareMonths);

    if (data.length === 0) {
      return {
        totalCount: 0,
        uniqueMarketersCount: 0,
        uniqueConsultantsCount: 0,
        advancedInterviewsCount: 0,
        topClient: { name: 'None', count: 0 },
        marketerLeaderboard: [],
        monthlyTrend: [],
        maxMonthCount: 1,
        consultantLeaderboard: [],
        topClients: [],
        topPositions: [],
        statusBreakdown: [],
        marketerNames: [],
        statusNames: [],
        allMonths: [],
      };
    }

    // Filter active rows by marketer, status, and month
    const activeRows = data.filter((r) => {
      const marketer = normalizeName(getField(r, ['marketer']));
      const status = (getField(r, ['status']) || '').trim();
      const dateVal = getField(r, ['date', 'interview time', 'time']);
      const month = extractMonthLabel(dateVal);

      const matchMarketer = selectedMarketerFilter === 'all' || marketer === selectedMarketerFilter;
      const matchStatus = selectedStatusFilter === 'all' || status === selectedStatusFilter;
      const matchMonth = selectedMonthFilter === 'all' || month === selectedMonthFilter;
      return matchMarketer && matchStatus && matchMonth;
    });

    const totalCount = activeRows.length;

    // Aggregations
    const marketerMap: Record<string, {
      count: number;
      monthly: Record<string, number>;
      consultants: Record<string, number>;
      clients: Record<string, number>;
      statuses: Record<string, number>;
    }> = {};

    const consultantMap: Record<string, {
      count: number;
      positions: Record<string, number>;
      marketers: Record<string, number>;
      statuses: Record<string, number>;
    }> = {};

    const clientMap: Record<string, number> = {};
    const positionMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    const monthMap: Record<string, number> = {};
    monthList.forEach((m) => { monthMap[m] = 0; });

    let advancedInterviewsCount = 0;

    activeRows.forEach((row) => {
      const marketer = normalizeName(getField(row, ['marketer']));
      const consultant = normalizeName(getField(row, ['consultant']));
      const client = (getField(row, ['vendor', 'client']) || '').trim();
      const position = (getField(row, ['position', 'role']) || '').trim();
      const status = (getField(row, ['status']) || '').trim();
      const dateVal = getField(row, ['date', 'interview time', 'time']);
      const month = extractMonthLabel(dateVal);

      // Advanced/Final round check
      const stLower = status.toLowerCase();
      if (stLower.includes('final') || stLower.includes('cleared') || stLower.includes('placed') || stLower.includes('offer')) {
        advancedInterviewsCount += 1;
      }

      // 1. Marketer
      if (marketer && marketer !== 'Unknown') {
        if (!marketerMap[marketer]) {
          marketerMap[marketer] = { count: 0, monthly: {}, consultants: {}, clients: {}, statuses: {} };
          monthList.forEach((m) => { marketerMap[marketer].monthly[m] = 0; });
        }
        marketerMap[marketer].count += 1;
        if (month && month !== 'Unspecified') {
          marketerMap[marketer].monthly[month] = (marketerMap[marketer].monthly[month] || 0) + 1;
        }
        if (consultant && consultant !== 'Unknown') {
          marketerMap[marketer].consultants[consultant] = (marketerMap[marketer].consultants[consultant] || 0) + 1;
        }
        if (client && client !== '-') {
          marketerMap[marketer].clients[client] = (marketerMap[marketer].clients[client] || 0) + 1;
        }
        if (status && status !== '-') {
          marketerMap[marketer].statuses[status] = (marketerMap[marketer].statuses[status] || 0) + 1;
        }
      }

      // 2. Consultant
      if (consultant && consultant !== 'Unknown') {
        if (!consultantMap[consultant]) {
          consultantMap[consultant] = { count: 0, positions: {}, marketers: {}, statuses: {} };
        }
        consultantMap[consultant].count += 1;
        if (position && position !== '-') {
          consultantMap[consultant].positions[position] = (consultantMap[consultant].positions[position] || 0) + 1;
        }
        if (marketer && marketer !== 'Unknown') {
          consultantMap[consultant].marketers[marketer] = (consultantMap[consultant].marketers[marketer] || 0) + 1;
        }
        if (status && status !== '-') {
          consultantMap[consultant].statuses[status] = (consultantMap[consultant].statuses[status] || 0) + 1;
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

      // 5. Status
      if (status && status !== '-') {
        statusMap[status] = (statusMap[status] || 0) + 1;
      }

      // 6. Month
      if (month && month !== 'Unspecified') {
        if (monthMap[month] !== undefined) {
          monthMap[month] += 1;
        } else {
          monthMap[month] = (monthMap[month] || 0) + 1;
        }
      }
    });

    // Marketer Leaderboard & Matrix Data
    const marketerLeaderboard = Object.entries(marketerMap)
      .map(([name, mData]) => {
        const topConsEntry = Object.entries(mData.consultants).sort((a, b) => b[1] - a[1])[0];
        const topConsultant = topConsEntry ? `${topConsEntry[0]} (${topConsEntry[1]})` : 'Various';
        const topClientEntry = Object.entries(mData.clients).sort((a, b) => b[1] - a[1])[0];
        const topClient = topClientEntry ? `${topClientEntry[0]} (${topClientEntry[1]})` : 'Various';
        return {
          name,
          count: mData.count,
          monthly: mData.monthly,
          uniqueConsultants: Object.keys(mData.consultants).length,
          uniqueClients: Object.keys(mData.clients).length,
          percentage: totalCount > 0 ? ((mData.count / totalCount) * 100).toFixed(1) : '0',
          topConsultant,
          topClient,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Consultant Leaderboard
    const consultantLeaderboard = Object.entries(consultantMap)
      .map(([name, cData]) => {
        const topPosEntry = Object.entries(cData.positions).sort((a, b) => b[1] - a[1])[0];
        const topPosition = topPosEntry ? topPosEntry[0] : 'General';
        const topMarketerEntry = Object.entries(cData.marketers).sort((a, b) => b[1] - a[1])[0];
        const topMarketer = topMarketerEntry ? topMarketerEntry[0] : 'Team';
        return {
          name,
          count: cData.count,
          percentage: totalCount > 0 ? ((cData.count / totalCount) * 100).toFixed(1) : '0',
          topPosition,
          topMarketer,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Monthly Trend (Chronological)
    const monthlyTrend = Object.entries(monthMap)
      .sort(([mA], [mB]) => compareMonths(mA, mB))
      .map(([month, count]) => ({ month, count }));

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

    // Status Breakdown
    const statusBreakdown = Object.entries(statusMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const maxMonthCount = Math.max(...monthlyTrend.map((m) => m.count), 1);
    const topClient = topClients[0] || { name: 'None', count: 0 };

    return {
      totalCount,
      uniqueMarketersCount: Object.keys(marketerMap).length,
      uniqueConsultantsCount: Object.keys(consultantMap).length,
      advancedInterviewsCount,
      topClient,
      marketerLeaderboard,
      monthlyTrend,
      maxMonthCount,
      consultantLeaderboard,
      topClients,
      topPositions,
      statusBreakdown,
      marketerNames: Array.from(allMarketersSet).sort(),
      statusNames: Array.from(allStatusesSet).sort(),
      allMonths: monthList,
    };
  }, [data, selectedMarketerFilter, selectedStatusFilter, selectedMonthFilter]);

  // Filtered rows for the selected Marketer Dossier
  const dossierRows = useMemo(() => {
    if (!selectedDossierMarketer) return [];
    return data.filter((row) => {
      const marketer = normalizeName(getField(row, ['marketer']));
      if (marketer !== selectedDossierMarketer) return false;

      const dateVal = getField(row, ['date', 'interview time', 'time']);
      const month = extractMonthLabel(dateVal);
      if (dossierMonthFilter !== 'all' && month !== dossierMonthFilter) return false;

      if (dossierSearch.trim()) {
        const q = dossierSearch.toLowerCase();
        return Object.values(row).some((val) => String(val).toLowerCase().includes(q));
      }
      return true;
    });
  }, [data, selectedDossierMarketer, dossierMonthFilter, dossierSearch]);

  const dossierTotalPages = Math.ceil(dossierRows.length / dossierRowsPerPage) || 1;
  const dossierPagedRows = dossierRows.slice(
    (dossierPage - 1) * dossierRowsPerPage,
    dossierPage * dossierRowsPerPage
  );

  const handleExportExcel = () => {
    if (filteredAndSortedData.length === 0) return;
    const headers = columnHeaders;
    const rows = filteredAndSortedData.map((row) =>
      headers.map((h) => `"${(row[h] || '').replace(/"/g, '""')}"`)
    );
    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `interviews_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          onClick={handleExportExcel}
          disabled={filteredAndSortedData.length === 0}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold theme-surface theme-border theme-text hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/60 transition-all shadow-2xs cursor-pointer disabled:opacity-40 mr-1"
          title="Export table to Excel (.csv)"
        >
          <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.17 3.25q.33 0 .59.25t.24.58v15.84q0 .33-.24.58t-.59.25H7.83q-.33 0-.58-.25t-.25-.58V17H2.83q-.33 0-.58-.25T2 16.17V7.83q0-.33.25-.58t.58-.25H7V4.08q0-.33.25-.58t.58-.25zM7 8H3.5v8H7zm7.4 7.2 2-3.2-2-3.2h-1.6l1.2 2.2-1.2 2.2zm-3.6 0 1.2-2.2-1.2-2.2H9.2l2 3.2-2 3.2zm9.2 3.8V5H8.5v2h7.83q.33 0 .58.25t.25.58v8.34q0 .33-.25.58t-.58.25H8.5v2z"/>
          </svg>
          <span>Excel</span>
        </button>

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
    <div className="flex flex-col gap-3 w-full">

      {/* Top Control Bar: View Switcher (Table vs Metrics) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-medium pb-2 border-b theme-border">
        
        {/* Dual-View Switcher Tabs (Default is Table View) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl theme-surface-alt theme-border border shadow-2xs">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'theme-btn shadow-xs'
                : 'text-slate-700 hover:text-slate-950 font-bold hover:bg-black/5'
            }`}
          >
            <span>📋</span>
            <span>Table View ({data.length})</span>
          </button>

          <button
            onClick={() => setViewMode('metrics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'metrics'
                ? 'theme-btn shadow-xs'
                : 'text-slate-700 hover:text-slate-950 font-bold hover:bg-black/5'
            }`}
          >
            <span>📊</span>
            <span>Live Analytics &amp; Metrics</span>
          </button>
        </div>

        {/* Quick Filter / Sync Actions */}
        <div className="flex items-center gap-2">
          {viewMode === 'metrics' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold theme-text-muted">Filter Marketer:</span>
                <select
                  value={selectedMarketerFilter}
                  onChange={(e) => setSelectedMarketerFilter(e.target.value)}
                  className="px-2.5 py-1 border rounded-lg text-xs font-bold theme-input theme-border focus:outline-none"
                >
                  <option value="all">All Marketers ({analytics.marketerNames.length})</option>
                  {analytics.marketerNames.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {analytics.allMonths.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold theme-text-muted">Month:</span>
                  <select
                    value={selectedMonthFilter}
                    onChange={(e) => setSelectedMonthFilter(e.target.value)}
                    className="px-2.5 py-1 border rounded-lg text-xs font-bold theme-input theme-border focus:outline-none"
                  >
                    <option value="all">All Months ({analytics.allMonths.length})</option>
                    {analytics.allMonths.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {analytics.statusNames.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold theme-text-muted">Status:</span>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="px-2.5 py-1 border rounded-lg text-xs font-bold theme-input theme-border focus:outline-none"
                  >
                    <option value="all">All Statuses ({analytics.statusNames.length})</option>
                    {analytics.statusNames.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {(selectedMarketerFilter !== 'all' || selectedMonthFilter !== 'all' || selectedStatusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedMarketerFilter('all');
                    setSelectedMonthFilter('all');
                    setSelectedStatusFilter('all');
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                  title="Reset all filters"
                >
                  ✕ Reset
                </button>
              )}
            </div>
          )}

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              syncStatus === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {syncStatus === 'ok' ? '● Live Syncing' : '⚠️ Sync Disconnected'}
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TABLE VIEW (Default Landing Tab)                                  */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="flex flex-col gap-2 w-full">

          {/* Today & Tomorrow's Interviews Quick Docket */}
          <InterviewDocket
            data={data}
            columnHeaders={columnHeaders}
            onSelectRow={handleDocketSelectRow}
          />

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
            <table className="w-full min-w-[1650px] text-left text-xs border-collapse table-fixed">
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
                        className={`px-2 py-2 font-bold select-none relative border-r last:border-r-0 theme-table-border text-[11px] uppercase tracking-wider ${getColumnWidthClass(header)}`}
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
                        id={`row-${row.id}`}
                        data-updated={isNewRow ? 'true' : undefined}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            row,
                          });
                        }}
                        className={`transition-all duration-300 ${
                          highlightedRowId === row.id ? 'ring-2 ring-amber-500 z-10' : ''
                        }`}
                        style={{
                          backgroundColor: highlightedRowId === row.id
                            ? 'rgba(251, 191, 36, 0.28)'
                            : isNewRow
                            ? 'rgba(16,185,129,0.08)'
                            : isEven
                            ? 'var(--color-table-row-even)'
                            : 'var(--color-table-row-odd)',
                          boxShadow: highlightedRowId === row.id
                            ? 'inset 0 0 0 2px rgba(245, 158, 11, 1), 0 4px 12px rgba(245, 158, 11, 0.2)'
                            : isNewRow
                            ? 'inset 0 0 0 1px rgba(16,185,129,0.4)'
                            : undefined,
                        }}
                        onMouseEnter={(e) => {
                          if (!isNewRow && highlightedRowId !== row.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-table-row-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isNewRow && highlightedRowId !== row.id) (e.currentTarget as HTMLElement).style.backgroundColor = isEven ? 'var(--color-table-row-even)' : 'var(--color-table-row-odd)';
                        }}
                      >
                        {/* # Row Number column with quick delete on hover */}
                        <td
                          className="px-2.5 py-2 text-center font-mono font-bold text-[11px] border-r theme-table-border theme-text-muted relative group/idx"
                        >
                          <span className="group-hover/idx:hidden">{displayRowNumber}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRowToDelete(row);
                            }}
                            className="hidden group-hover/idx:inline-block text-slate-400 hover:text-rose-600 transition-colors cursor-pointer text-xs"
                            title="Delete this placement row"
                          >
                            🗑️
                          </button>
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
                              onContextMenu={(e) => {
                                if (isEditing) return;
                                e.preventDefault();
                                e.stopPropagation();
                                setContextMenu({
                                  x: e.clientX,
                                  y: e.clientY,
                                  row,
                                  cellHeader: header,
                                  cellValue: row[header] || '',
                                });
                              }}
                              className={`px-2 py-2 border-r last:border-r-0 relative cursor-pointer transition-colors leading-snug align-top ${getColumnWidthClass(header)}`}
                              style={{
                                borderColor: 'var(--color-table-border)',
                                backgroundColor: isUpdatedCell ? 'rgba(245,158,11,0.12)' : undefined,
                                boxShadow: isUpdatedCell ? 'inset 0 0 0 2px rgba(245,158,11,0.6)' : undefined,
                                color: 'var(--color-text-body)',
                              }}
                              title="Click to edit or acknowledge"
                            >
                              {isEditing && (
                                <CellSmartEditor
                                  rowId={row.id}
                                  header={header}
                                  initialValue={val}
                                  schema={columnSchema[header]}
                                  uniqueValues={columnUniqueOptions[header]}
                                  isNearRight={colIndex >= columnHeaders.length - 2}
                                  isNearBottom={rowIndex >= currentRows.length - 2 && currentRows.length > 3}
                                  onSave={(newVal) => saveCellEdit(row.id, header, newVal)}
                                  onCancel={() => setEditingCell(null)}
                                />
                              )}
                              <div className={`flex flex-col gap-1 w-full min-w-0 min-h-[24px] overflow-hidden ${isEditing ? 'opacity-25 pointer-events-none' : ''}`}>
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
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: LIVE ANALYTICS & METRICS DASHBOARD                                */}
      {/* ========================================================================= */}
      {viewMode === 'metrics' && (
        <div className="flex flex-col gap-5 pt-1">
          
          {/* Top 4 KPI Executive Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Live Placements & Interviews */}
            <div className="p-4 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">
                  Total Placements / Interviews
                </span>
                <span className="text-lg">📊</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold theme-text">
                  {analytics.totalCount}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                  ● {selectedMonthFilter !== 'all' ? selectedMonthFilter : 'Live Synced'}
                </span>
              </div>
              <span className="text-[11px] theme-text-muted truncate">
                {selectedMarketerFilter !== 'all' ? `Filtered by ${selectedMarketerFilter}` : 'Live placements & interviews tracked'}
              </span>
            </div>

            {/* Card 2: Active Marketers */}
            <div className="p-4 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">
                  Team Marketers
                </span>
                <span className="text-lg">👥</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold theme-text">
                  {analytics.uniqueMarketersCount}
                </span>
                <span className="text-[11px] font-semibold theme-text-muted">
                  Active
                </span>
              </div>
              <span className="text-[11px] theme-text-muted truncate">
                Top marketer: <strong className="theme-text">{analytics.marketerLeaderboard[0]?.name || 'N/A'}</strong> ({analytics.marketerLeaderboard[0]?.count || 0})
              </span>
            </div>

            {/* Card 3: Candidates / Consultants Handled */}
            <div className="p-4 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">
                  Candidates / Consultants
                </span>
                <span className="text-lg">💼</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold theme-text">
                  {analytics.uniqueConsultantsCount}
                </span>
                <span className="text-[11px] font-semibold theme-text-muted">
                  Profiles
                </span>
              </div>
              <span className="text-[11px] theme-text-muted truncate">
                Top profile: <strong className="theme-text">{analytics.consultantLeaderboard[0]?.name || 'N/A'}</strong> ({analytics.consultantLeaderboard[0]?.count || 0})
              </span>
            </div>

            {/* Card 4: Advanced Stage / Final Rounds */}
            <div className="p-4 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">
                  Advanced / Final Rounds
                </span>
                <span className="text-lg">🎯</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold theme-text">
                  {analytics.advancedInterviewsCount}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
                  {analytics.totalCount > 0 ? `${((analytics.advancedInterviewsCount / analytics.totalCount) * 100).toFixed(0)}%` : '0%'} pipeline
                </span>
              </div>
              <span className="text-[11px] theme-text-muted truncate">
                Top client: <strong className="theme-text">{analytics.topClient.name}</strong> ({analytics.topClient.count})
              </span>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* IN-DEPTH MARKETER DOSSIER INSPECTOR (Interactive inspection of actual rows)*/}
          {/* ========================================================================= */}
          {selectedDossierMarketer && (
            <div
              id="marketer-dossier-panel"
              className="p-4 sm:p-5 rounded-xl border-2 shadow-md transition-all flex flex-col gap-4"
              style={{
                borderColor: 'var(--color-accent)',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              {/* Dossier Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b theme-border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs shrink-0"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {getInitials(selectedDossierMarketer)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold theme-text">
                        {selectedDossierMarketer}’s Placement Dossier
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {analytics.marketerLeaderboard.find((m) => m.name === selectedDossierMarketer)?.percentage}% Team Share
                      </span>
                    </div>
                    <p className="text-xs theme-text-muted">
                      Full breakdown of candidate submissions, interview rounds, clients, and real-time Notion updates.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedDossierMarketer(null);
                      setDossierSearch('');
                      setDossierMonthFilter('all');
                      setDossierPage(1);
                    }}
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold theme-surface theme-border theme-text hover:bg-black/5 transition-colors cursor-pointer"
                  >
                    ✕ Close Dossier
                  </button>
                </div>
              </div>

              {/* Dossier Quick Stats & Search / Month Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Month Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                  <button
                    onClick={() => { setDossierMonthFilter('all'); setDossierPage(1); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      dossierMonthFilter === 'all'
                        ? 'theme-btn shadow-2xs'
                        : 'theme-surface-alt theme-text-muted hover:theme-text border theme-border'
                    }`}
                  >
                    All Months ({data.filter((r) => normalizeName(getField(r, ['marketer'])) === selectedDossierMarketer).length})
                  </button>
                  {analytics.allMonths.map((m) => {
                    const countInMonth = data.filter((r) => {
                      const isMarketer = normalizeName(getField(r, ['marketer'])) === selectedDossierMarketer;
                      const dateVal = getField(r, ['date', 'interview time', 'time']);
                      return isMarketer && extractMonthLabel(dateVal) === m;
                    }).length;
                    if (countInMonth === 0) return null;
                    return (
                      <button
                        key={m}
                        onClick={() => { setDossierMonthFilter(m); setDossierPage(1); }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          dossierMonthFilter === m
                            ? 'theme-btn shadow-2xs'
                            : 'theme-surface-alt theme-text-muted hover:theme-text border theme-border'
                        }`}
                      >
                        {m} ({countInMonth})
                      </button>
                    );
                  })}
                </div>

                {/* Dossier Search Box */}
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={dossierSearch}
                    onChange={(e) => { setDossierSearch(e.target.value); setDossierPage(1); }}
                    placeholder={`🔍 Search in ${selectedDossierMarketer}’s rows...`}
                    className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none theme-input theme-border"
                  />
                  {dossierSearch && (
                    <button
                      onClick={() => setDossierSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 theme-text-muted hover:theme-text text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

              </div>

              {/* Dossier Table */}
              <div className="w-full overflow-x-auto rounded-lg border theme-table-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="theme-table-head border-b theme-table-border">
                    <tr>
                      <th className="px-3 py-2 font-bold w-10 text-center border-r theme-table-border">#</th>
                      <th className="px-3 py-2 font-bold border-r theme-table-border min-w-[130px]">Date / Time</th>
                      <th className="px-3 py-2 font-bold border-r theme-table-border min-w-[150px]">Candidate Name</th>
                      <th className="px-3 py-2 font-bold border-r theme-table-border min-w-[160px]">Position</th>
                      <th className="px-3 py-2 font-bold border-r theme-table-border min-w-[130px]">Vendor / Client</th>
                      <th className="px-3 py-2 font-bold border-r theme-table-border min-w-[100px]">Support</th>
                      <th className="px-3 py-2 font-bold border-r theme-table-border min-w-[110px]">Status</th>
                      <th className="px-3 py-2 font-bold min-w-[200px]">Update / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossierPagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center theme-text-muted italic">
                          No matching placements found for {selectedDossierMarketer} in this filter view.
                        </td>
                      </tr>
                    ) : (
                      dossierPagedRows.map((row, idx) => {
                        const globalIdx = (dossierPage - 1) * dossierRowsPerPage + idx + 1;
                        const dateVal = getField(row, ['date', 'interview time', 'time']) || '-';
                        const candidate = getField(row, ['consultant', 'candidate', 'name']) || '-';
                        const position = getField(row, ['position', 'role']) || '-';
                        const client = getField(row, ['vendor', 'client']) || '-';
                        const support = getField(row, ['support']) || '-';
                        const status = getField(row, ['status']) || '-';
                        const update = getField(row, ['update', 'notes']) || '-';

                        return (
                          <tr
                            key={row.id || idx}
                            className="border-b theme-table-border hover:bg-black/5 transition-colors"
                          >
                            <td className="px-2.5 py-2 text-center font-mono font-bold text-[11px] theme-text-muted border-r theme-table-border">
                              {globalIdx}
                            </td>
                            <td className="px-3 py-2 border-r theme-table-border theme-text font-medium whitespace-nowrap">
                              {dateVal}
                            </td>
                            <td className="px-3 py-2 border-r theme-table-border font-bold theme-text">
                              {candidate}
                            </td>
                            <td className="px-3 py-2 border-r theme-table-border theme-text-body">
                              <CellBadge header="Position" value={position} />
                            </td>
                            <td className="px-3 py-2 border-r theme-table-border font-semibold theme-text">
                              {client}
                            </td>
                            <td className="px-3 py-2 border-r theme-table-border theme-text-muted">
                              {support}
                            </td>
                            <td className="px-3 py-2 border-r theme-table-border">
                              <CellBadge header="Status" value={status} />
                            </td>
                            <td className="px-3 py-2 text-[11px] theme-text-body leading-relaxed">
                              {update}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dossier Pagination Controls */}
              <div className="flex items-center justify-between text-xs theme-text-muted pt-1">
                <span>
                  Showing <strong>{dossierRows.length === 0 ? 0 : (dossierPage - 1) * dossierRowsPerPage + 1}</strong>–
                  <strong>{Math.min(dossierPage * dossierRowsPerPage, dossierRows.length)}</strong> of{' '}
                  <strong>{dossierRows.length}</strong> records
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDossierPage((p) => Math.max(p - 1, 1))}
                    disabled={dossierPage === 1}
                    className="px-2.5 py-1 rounded border text-xs font-semibold theme-surface theme-border theme-text disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ← Prev
                  </button>
                  <span className="px-2 py-1 rounded border text-xs font-bold theme-surface-alt theme-border theme-text">
                    {dossierPage} / {dossierTotalPages}
                  </span>
                  <button
                    onClick={() => setDossierPage((p) => Math.min(p + 1, dossierTotalPages))}
                    disabled={dossierPage >= dossierTotalPages}
                    className="px-2.5 py-1 rounded border text-xs font-semibold theme-surface theme-border theme-text disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: CHRONOLOGICAL MONTHLY TREND & TOP CANDIDATES                   */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left 7 cols: Placements / Interviews Per Month Trend */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold theme-text flex items-center gap-1.5">
                    <span>📅</span> Monthly Placements &amp; Interviews Trend
                  </h3>
                  <p className="text-[11px] theme-text-muted">
                    Accurate chronological distribution of interviews across 2026
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMonthFilter !== 'all' && (
                    <button
                      onClick={() => setSelectedMonthFilter('all')}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 cursor-pointer"
                    >
                      Filtered: {selectedMonthFilter} ✕
                    </button>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-surface theme-border border">
                    {analytics.monthlyTrend.length} Months Tracked
                  </span>
                </div>
              </div>

              {/* Monthly Bar List */}
              <div className="flex flex-col gap-3 pt-1">
                {analytics.monthlyTrend.length === 0 ? (
                  <p className="text-xs theme-text-muted italic py-4 text-center">No date records available for monthly trend.</p>
                ) : (
                  analytics.monthlyTrend.map((m) => {
                    const isSelected = selectedMonthFilter === m.month;
                    const pct = ((m.count / (analytics.maxMonthCount || 1)) * 100).toFixed(0);
                    const totalPct = analytics.totalCount > 0 ? ((m.count / analytics.totalCount) * 100).toFixed(1) : '0';

                    return (
                      <div
                        key={m.month}
                        onClick={() => setSelectedMonthFilter(isSelected ? 'all' : m.month)}
                        className={`flex flex-col gap-1.5 p-2 rounded-lg transition-all cursor-pointer border ${
                          isSelected
                            ? 'theme-surface border-blue-500 shadow-xs'
                            : 'border-transparent hover:theme-surface hover:border-black/10'
                        }`}
                        title="Click to filter by this month"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold theme-text flex items-center gap-1.5">
                              <span>🗓️</span> {m.month}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-300">
                                Active Filter
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="theme-text-muted font-semibold">{totalPct}% of total</span>
                            <span className="font-mono font-bold px-2 py-0.5 rounded theme-surface theme-border border theme-text">
                              {m.count} interviews
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--color-accent)',
                              opacity: isSelected ? 1 : 0.85,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right 5 cols: Top Active Candidates */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold theme-text flex items-center gap-1.5">
                    <span>🌟</span> Top Active Candidates
                  </h3>
                  <p className="text-[11px] theme-text-muted">
                    Candidates with the highest interview engagement
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-surface theme-border border">
                  {analytics.uniqueConsultantsCount} Profiles
                </span>
              </div>

              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                {analytics.consultantLeaderboard.length === 0 ? (
                  <p className="text-xs theme-text-muted italic py-4 text-center">No consultant records found.</p>
                ) : (
                  analytics.consultantLeaderboard.slice(0, 8).map((c, i) => (
                    <div
                      key={c.name}
                      className="p-2.5 rounded-lg border theme-surface theme-border flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                            i === 0
                              ? 'bg-amber-400 text-amber-950 shadow-2xs'
                              : i === 1
                              ? 'bg-slate-300 text-slate-900 font-bold'
                              : i === 2
                              ? 'bg-amber-700 text-white font-bold'
                              : 'theme-surface-alt theme-text-muted font-medium'
                          }`}
                        >
                          {i === 0 ? '👑' : i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs theme-text truncate">{c.name}</p>
                          <p className="text-[10px] theme-text-muted truncate">
                            {c.topPosition} • Handled by <strong className="theme-text">{c.topMarketer}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                          {c.count} rounds
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: RECRUITER / MARKETER MONTHLY MATRIX TABLE                      */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold theme-text flex items-center gap-1.5">
                  <span>🏆</span> Marketer Monthly Performance Matrix
                </h3>
                <p className="text-[11px] theme-text-muted">
                  Detailed month-by-month interview numbers for each recruiter/marketer with clickable dossier inspection
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold theme-text-muted">
                  {analytics.marketerLeaderboard.length} Marketers Active
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto rounded-lg border theme-table-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="theme-table-head border-b theme-table-border">
                  <tr>
                    <th className="px-3 py-2 font-bold w-12 text-center border-r theme-table-border">#</th>
                    <th className="px-3 py-2 font-bold border-r theme-table-border min-w-[140px]">Marketer Name</th>
                    
                    {/* Monthly Columns */}
                    {analytics.allMonths.map((m) => {
                      const shortMonth = m.split(' ')[0].substring(0, 3);
                      return (
                        <th
                          key={m}
                          className="px-2.5 py-2 font-bold text-center border-r theme-table-border min-w-[65px]"
                          title={m}
                        >
                          {shortMonth}
                        </th>
                      );
                    })}

                    <th className="px-3 py-2 font-bold text-right border-r theme-table-border min-w-[70px]">Total</th>
                    <th className="px-3 py-2 font-bold text-right border-r theme-table-border min-w-[100px]">Team Share</th>
                    <th className="px-3 py-2 font-bold border-r theme-table-border min-w-[140px]">Top Candidate</th>
                    <th className="px-3 py-2 font-bold text-center min-w-[120px]">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {analytics.marketerLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={analytics.allMonths.length + 6} className="py-6 text-center theme-text-muted italic">
                        No marketer records available for this filter.
                      </td>
                    </tr>
                  ) : (
                    analytics.marketerLeaderboard.map((m, idx) => {
                      const isInspecting = selectedDossierMarketer === m.name;
                      return (
                        <tr
                          key={m.name}
                          className={`border-b theme-table-border transition-colors ${
                            isInspecting
                              ? 'bg-blue-50/70'
                              : 'hover:bg-black/5'
                          }`}
                        >
                          <td className="px-2.5 py-2 text-center font-mono font-bold text-[11px] theme-text-muted border-r theme-table-border">
                            {idx === 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-black text-[10px] bg-amber-300 text-amber-950 border border-amber-500 shadow-2xs">
                                👑 1
                              </span>
                            ) : (
                              idx + 1
                            )}
                          </td>

                          <td className="px-3 py-2 border-r theme-table-border">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] text-white shrink-0"
                                style={{ backgroundColor: 'var(--color-accent)' }}
                              >
                                {getInitials(m.name)}
                              </span>
                              <span className="font-bold theme-text">{m.name}</span>
                            </div>
                          </td>

                          {/* Dynamic Month Count Cells */}
                          {analytics.allMonths.map((monthStr) => {
                            const val = m.monthly[monthStr] || 0;
                            return (
                              <td
                                key={monthStr}
                                className="px-2.5 py-2 text-center font-mono text-xs border-r theme-table-border"
                              >
                                {val > 0 ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-900 border border-slate-300">
                                    {val}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-xs">-</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-3 py-2 text-right border-r theme-table-border">
                            <span className="inline-block px-2.5 py-0.5 rounded-md font-mono font-black text-xs bg-slate-900 text-white shadow-2xs">
                              {m.count}
                            </span>
                          </td>

                          <td className="px-3 py-2 border-r theme-table-border">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-12 h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${m.percentage}%`,
                                    backgroundColor: 'var(--color-accent)',
                                  }}
                                />
                              </div>
                              <span className="font-bold text-slate-900 font-mono text-xs w-10 text-right">
                                {m.percentage}%
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-2 border-r theme-table-border text-[11px] theme-text-muted truncate max-w-[150px]">
                            {m.topConsultant}
                          </td>

                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => {
                                if (isInspecting) {
                                  setSelectedDossierMarketer(null);
                                } else {
                                  setSelectedDossierMarketer(m.name);
                                  setDossierMonthFilter('all');
                                  setDossierSearch('');
                                  setDossierPage(1);
                                  setTimeout(() => {
                                    document.getElementById('marketer-dossier-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 100);
                                }
                              }}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                isInspecting
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'theme-btn shadow-2xs'
                              }`}
                            >
                              {isInspecting ? '✕ Close' : '🔍 Inspect Dossier'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: CLIENT PARTNERS & PIPELINE STATUS BREAKDOWN                    */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left 7 cols: Top Clients & Market Share */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold theme-text flex items-center gap-1.5">
                  <span>🏢</span> Top Client &amp; Vendor Partners
                </h3>
                <p className="text-[11px] theme-text-muted">
                  Clients generating the highest volume of candidate interviews
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {analytics.topClients.map((client) => {
                  const pct = ((client.count / (analytics.totalCount || 1)) * 100).toFixed(1);
                  return (
                    <div
                      key={client.name}
                      className="p-3 rounded-xl border theme-surface theme-border flex flex-col justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs theme-text truncate">{client.name}</span>
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-950 border border-sky-300">
                          {client.count}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: 'var(--color-accent)',
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold theme-text-muted shrink-0">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 5 cols: Status Pipeline Breakdown */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl border theme-surface-alt theme-border shadow-2xs flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold theme-text flex items-center gap-1.5">
                  <span>⚡</span> Interview Pipeline Status
                </h3>
                <p className="text-[11px] theme-text-muted">
                  Distribution across interview and screening stages
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {analytics.statusBreakdown.length === 0 ? (
                  <p className="text-xs theme-text-muted italic py-4 text-center">No status data available.</p>
                ) : (
                  analytics.statusBreakdown.map((st) => {
                    const pct = analytics.totalCount > 0 ? ((st.count / analytics.totalCount) * 100).toFixed(1) : '0';
                    return (
                      <div
                        key={st.name}
                        className="flex items-center justify-between p-2.5 rounded-lg border theme-surface theme-border text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CellBadge header="Status" value={st.name} />
                          <span className="text-[11px] theme-text-muted font-medium truncate">
                            {pct}% of pipeline
                          </span>
                        </div>
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded theme-surface-alt theme-border border theme-text">
                          {st.count}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Right-click Floating Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 w-64 text-xs font-semibold text-slate-800 animate-in fade-in zoom-in-95 duration-75 select-none"
          style={{
            left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 270 : contextMenu.x),
            top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 200 : contextMenu.y),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 flex items-center justify-between">
            <span className="truncate max-w-[170px]">
              {contextMenu.cellHeader ? `${contextMenu.cellHeader}` : 'Row Actions'}
            </span>
            <span className="text-[9px] font-mono text-slate-400">Right-click</span>
          </div>

          {/* 1. Copy Clicked Cell Value */}
          {contextMenu.cellHeader && (
            <button
              type="button"
              disabled={!contextMenu.cellValue || contextMenu.cellValue === '-'}
              onClick={() => {
                const textToCopy = contextMenu.cellValue || '';
                if (textToCopy && textToCopy !== '-') {
                  navigator.clipboard.writeText(textToCopy);
                  setCopiedFeedback(`Copied ${contextMenu.cellHeader}: "${textToCopy.length > 28 ? textToCopy.slice(0, 28) + '...' : textToCopy}"`);
                  setTimeout(() => setCopiedFeedback(null), 2500);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-800 flex items-start gap-2.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <span className="text-sm mt-0.5">📋</span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                  Copy {contextMenu.cellHeader}
                </span>
                {contextMenu.cellValue && contextMenu.cellValue !== '-' ? (
                  <span className="text-[10.5px] font-mono text-slate-500 truncate mt-0.5 block max-w-full">
                    {contextMenu.cellValue}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Empty cell</span>
                )}
              </div>
            </button>
          )}

          {/* Clear Cell Value */}
          {contextMenu.cellHeader && contextMenu.cellValue && contextMenu.cellValue !== '-' && (
            <button
              type="button"
              onClick={() => {
                saveCellEdit(contextMenu.row.id, contextMenu.cellHeader!, '');
                setCopiedFeedback(`Cleared ${contextMenu.cellHeader} value ✓`);
                setTimeout(() => setCopiedFeedback(null), 2500);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100 text-xs font-semibold"
            >
              <span className="text-xs">🧹</span>
              <span className="truncate">Clear {contextMenu.cellHeader} Value</span>
            </button>
          )}

          {/* 2. Optional: Copy Candidate Name if clicked cell was something else */}
          {(() => {
            const candidateName =
              contextMenu.row['Consultant Name'] ||
              contextMenu.row['Candidate'] ||
              getField(contextMenu.row, ['Consultant Name', 'Candidate', 'Consultant']) ||
              '';
            const isCandidateCol = contextMenu.cellHeader && 
              (contextMenu.cellHeader.toLowerCase().includes('candidate') || contextMenu.cellHeader.toLowerCase().includes('consultant'));

            if (!candidateName || isCandidateCol) return null;

            return (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(candidateName);
                  setCopiedFeedback(`Copied Candidate: "${candidateName}"`);
                  setTimeout(() => setCopiedFeedback(null), 2500);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100 text-[11px]"
              >
                <span className="text-xs">👤</span>
                <span className="truncate">Copy Candidate: <strong className="text-slate-800 font-semibold">{candidateName}</strong></span>
              </button>
            );
          })()}

          {/* Fallback if right-clicked on row without a specific cell */}
          {!contextMenu.cellHeader && (() => {
            const candidateName =
              contextMenu.row['Consultant Name'] ||
              contextMenu.row['Candidate'] ||
              getField(contextMenu.row, ['Consultant Name', 'Candidate', 'Consultant']) ||
              '';
            if (!candidateName) return null;
            return (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(candidateName);
                  setCopiedFeedback(`Copied Candidate: "${candidateName}"`);
                  setTimeout(() => setCopiedFeedback(null), 2500);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
              >
                <span>📋</span> Copy Candidate Name
              </button>
            );
          })()}

          {/* 3. Delete Placement Action */}
          <div className="border-t border-slate-100 my-0.5" />
          <button
            type="button"
            onClick={() => {
              setRowToDelete(contextMenu.row);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>🗑️</span> Delete Placement...
          </button>
        </div>
      )}

      {/* Copied Feedback Toast Notification */}
      {copiedFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="text-emerald-400 font-bold text-sm">✓</span>
          <span className="truncate max-w-sm">{copiedFeedback}</span>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {rowToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setRowToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 text-slate-900 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl shrink-0">
                ⚠️
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Delete Placement Record?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will archive and permanently remove this row from your Notion database.
                </p>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setRowToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md text-sm cursor-pointer disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {/* Record Summary Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Candidate:</span>
                <span className="font-bold text-slate-900 truncate max-w-[240px]">
                  {rowToDelete['Consultant Name'] || rowToDelete['Candidate'] || rowToDelete['Date'] || 'Placement'}
                </span>
              </div>
              {rowToDelete['Vendor / Client'] && rowToDelete['Vendor / Client'] !== '-' && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Client / Vendor:</span>
                  <span className="font-semibold text-slate-800">{rowToDelete['Vendor / Client']}</span>
                </div>
              )}
              {rowToDelete['Position'] && rowToDelete['Position'] !== '-' && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Position:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[240px]">{rowToDelete['Position']}</span>
                </div>
              )}
              {rowToDelete['Interview Time'] && rowToDelete['Interview Time'] !== '-' && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Interview Time:</span>
                  <span className="font-mono text-slate-700">{rowToDelete['Interview Time']}</span>
                </div>
              )}
              {rowToDelete['Status'] && rowToDelete['Status'] !== '-' && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="font-semibold text-slate-800">{rowToDelete['Status']}</span>
                </div>
              )}
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ✕ {deleteError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setRowToDelete(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting from Notion...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Yes, Delete Row</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
