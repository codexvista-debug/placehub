'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface VendorRecord {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  comments: string;
  lastEdited?: string;
}

export default function VendorInfoPage() {
  const [activeTab, setActiveTab] = useState<'desi' | 'pv'>('desi');
  const [desiVendors, setDesiVendors] = useState<VendorRecord[]>([]);
  const [pvVendors, setPvVendors] = useState<VendorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'phone' | 'email' | 'links'>('all');
  const [sortField, setSortField] = useState<'company' | 'name' | 'email'>('company');
  const [sortAsc, setSortAsc] = useState(true);

  // Quick feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    vendor: VendorRecord;
    cellField?: string;
    cellValue?: string;
  } | null>(null);

  // Add Vendor Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    comments: '',
  });

  // Delete Vendor Modal
  const [vendorToDelete, setVendorToDelete] = useState<VendorRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline Cell Editing
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingStatus, setSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  // Fetch both Desi and PV Vendor databases on initial load
  const loadVendors = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/fetch-vendors');
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to load vendor databases');
      }

      setDesiVendors(data.desiVendors || []);
      setPvVendors(data.pvVendors || []);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.error('Error fetching vendors:', err);
      setErrorMsg(err.message || 'Error communicating with Notion');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text);
    triggerToast(`Copied ${label}: "${text.length > 28 ? text.slice(0, 28) + '...' : text}"`);
  };

  // Active dataset
  const currentList = activeTab === 'desi' ? desiVendors : pvVendors;
  const setCurrentList = activeTab === 'desi' ? setDesiVendors : setPvVendors;

  // Filtered & Sorted list
  const filteredVendors = useMemo(() => {
    let list = [...currentList];

    // Filter type
    if (filterType === 'phone') {
      list = list.filter((v) => v.phone && v.phone !== '-');
    } else if (filterType === 'email') {
      list = list.filter((v) => v.email && v.email !== '-');
    } else if (filterType === 'links') {
      list = list.filter((v) => v.comments && (v.comments.includes('http') || v.comments.includes('linkedin.com')));
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (v) =>
          v.company.toLowerCase().includes(q) ||
          v.name.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.phone.toLowerCase().includes(q) ||
          v.comments.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      let valA = (a[sortField] || '').toLowerCase();
      let valB = (b[sortField] || '').toLowerCase();
      if (valA === '-' || !valA) valA = 'zzz';
      if (valB === '-' || !valB) valB = 'zzz';
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return list;
  }, [currentList, filterType, searchQuery, sortField, sortAsc]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = currentList.length;
    const uniqueCompanies = new Set(
      currentList.map((v) => v.company.trim().toLowerCase()).filter((c) => c && c !== '-')
    ).size;
    const withEmail = currentList.filter((v) => v.email && v.email !== '-').length;
    const withPhone = currentList.filter((v) => v.phone && v.phone !== '-').length;

    return { total, uniqueCompanies, withEmail, withPhone };
  }, [currentList]);

  // Handle Inline Cell Edit Save
  const handleSaveCell = async (id: string, field: string, newValue: string) => {
    const key = `${id}-${field}`;
    setSavingStatus((prev) => ({ ...prev, [key]: 'saving' }));

    // Optimistic update
    setCurrentList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: newValue } : item))
    );
    setEditingCell(null);

    try {
      const res = await fetch('/api/update-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field, value: newValue }),
      });

      if (!res.ok) throw new Error('Failed to update in Notion');
      setSavingStatus((prev) => ({ ...prev, [key]: 'saved' }));
      triggerToast(`Updated ${field} in Notion ✓`);
      setTimeout(() => {
        setSavingStatus((prev) => {
          const n = { ...prev };
          delete n[key];
          return n;
        });
      }, 2000);
    } catch (err: any) {
      console.error('Error saving cell:', err);
      setSavingStatus((prev) => ({ ...prev, [key]: 'error' }));
      triggerToast(`Failed to update ${field} in Notion`);
    }
  };

  // Handle Add New Vendor Form Submit
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorForm.name && !newVendorForm.company) {
      alert('Please provide at least a Company name or Contact name.');
      return;
    }

    setIsSavingNew(true);
    try {
      const res = await fetch('/api/create-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTab: activeTab,
          ...newVendorForm,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to create vendor in Notion');
      }

      if (json.vendor) {
        setCurrentList((prev) => [json.vendor, ...prev]);
      }

      setIsAddModalOpen(false);
      setNewVendorForm({ company: '', name: '', email: '', phone: '', comments: '' });
      triggerToast(`Added vendor to ${activeTab === 'desi' ? 'Desi' : 'PV'} Vendor Info ✓`);
    } catch (err: any) {
      alert(err.message || 'Error creating vendor');
    } finally {
      setIsSavingNew(false);
    }
  };

  // Handle Delete Vendor
  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/api/delete-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: vendorToDelete.id }),
      });

      if (!res.ok) throw new Error('Failed to delete vendor from Notion');

      setCurrentList((prev) => prev.filter((v) => v.id !== vendorToDelete.id));
      triggerToast(`Archived ${vendorToDelete.name || vendorToDelete.company} from Notion ✓`);
      setVendorToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export current view to CSV
  const handleExportCSV = () => {
    if (filteredVendors.length === 0) return;
    const headers = ['Company', 'Contact Name', 'Email', 'Phone', 'Comments'];
    const rows = filteredVendors.map((v) => [
      `"${(v.company || '').replace(/"/g, '""')}"`,
      `"${(v.name || '').replace(/"/g, '""')}"`,
      `"${(v.email || '').replace(/"/g, '""')}"`,
      `"${(v.phone || '').replace(/"/g, '""')}"`,
      `"${(v.comments || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}_vendor_info_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Exported CSV file ✓');
  };

  return (
    <div className="min-h-screen theme-bg theme-text-body p-2 sm:p-5 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border theme-surface theme-border shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                🏢 Vendor Directory
              </span>
              <span className="text-xs theme-text-muted">
                Direct Notion Database Sync
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight theme-text">
              Vendor Info
            </h1>
            <p className="text-xs sm:text-sm theme-text-muted mt-0.5">
              Browse, search, and manage recruiter &amp; employer contacts across Desi and PV networks.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadVendors(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold theme-surface theme-border theme-text hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh directly from Notion"
            >
              <span className={`text-sm ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredVendors.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold theme-surface theme-border theme-text hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-40"
              title="Export filtered list to CSV"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-xs cursor-pointer"
            >
              <span>✨</span>
              <span>Add New Vendor</span>
            </button>
          </div>
        </div>

        {/* Database Switching Tabs (Desi Vendor Info vs PV Vendor Info) */}
        <div className="flex items-center justify-between border-b theme-border pb-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab('desi');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer select-none ${
                activeTab === 'desi'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'theme-surface theme-border border theme-text hover:bg-slate-100/70'
              }`}
            >
              <span>🇮🇳</span>
              <span>Desi Vendor Info</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-extrabold ${
                  activeTab === 'desi' ? 'bg-orange-800 text-orange-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {desiVendors.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('pv');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer select-none ${
                activeTab === 'pv'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'theme-surface theme-border border theme-text hover:bg-slate-100/70'
              }`}
            >
              <span>🌐</span>
              <span>PV Vendor Info</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-extrabold ${
                  activeTab === 'pv' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {pvVendors.length}
              </span>
            </button>
          </div>

          {lastSynced && (
            <span className="hidden sm:inline-block text-[11px] theme-text-muted font-mono">
              Last synced: {lastSynced}
            </span>
          )}
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border theme-surface theme-border flex flex-col shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
              Total {activeTab === 'desi' ? 'Desi' : 'PV'} Vendors
            </span>
            <span className="text-2xl font-black theme-text mt-0.5">{metrics.total}</span>
          </div>

          <div className="p-3.5 rounded-xl border theme-surface theme-border flex flex-col shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
              Unique Companies
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-0.5">{metrics.uniqueCompanies}</span>
          </div>

          <div className="p-3.5 rounded-xl border theme-surface theme-border flex flex-col shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
              With Direct Email
            </span>
            <span className="text-2xl font-black text-blue-600 mt-0.5">{metrics.withEmail}</span>
          </div>

          <div className="p-3.5 rounded-xl border theme-surface theme-border flex flex-col shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
              With Phone Number
            </span>
            <span className="text-2xl font-black text-purple-600 mt-0.5">{metrics.withPhone}</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border theme-surface theme-border shadow-2xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === 'desi' ? 'Desi' : 'PV'} vendors by company, recruiter name, email, phone...`}
              className="w-full pl-9 pr-8 py-2 rounded-lg text-xs font-medium border theme-border theme-input transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All Contacts' },
                { id: 'phone', label: '📞 Has Phone' },
                { id: 'email', label: '✉️ Has Email' },
                { id: 'links', label: '🔗 Has LinkedIn' },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                onClick={() => setFilterType(chip.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === chip.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'theme-surface-alt theme-text hover:bg-slate-200/70 border theme-border'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Container */}
        <div className="rounded-xl border theme-border overflow-hidden shadow-xs theme-surface">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold theme-text-muted">Loading vendor database from Notion...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-8 text-center flex flex-col items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm font-bold text-rose-600">Error connecting to Notion database</p>
              <p className="text-xs theme-text-muted max-w-md">{errorMsg}</p>
              <button
                onClick={() => loadVendors()}
                className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-orange-600 text-white cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-2">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-bold theme-text">No vendors match your search</p>
              <p className="text-xs theme-text-muted">Try clearing the search query or adjusting your filters.</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full text-left text-xs border-collapse table-auto">
                <thead className="theme-table-head border-b theme-table-border text-[11px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-3 py-3 w-12 text-center border-r theme-table-border">#</th>
                    <th
                      className="px-3.5 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors border-r theme-table-border w-[220px]"
                      onClick={() => {
                        if (sortField === 'company') setSortAsc(!sortAsc);
                        else {
                          setSortField('company');
                          setSortAsc(true);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Company</span>
                        <span>{sortField === 'company' ? (sortAsc ? '▲' : '▼') : '↕'}</span>
                      </div>
                    </th>
                    <th
                      className="px-3.5 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors border-r theme-table-border w-[190px]"
                      onClick={() => {
                        if (sortField === 'name') setSortAsc(!sortAsc);
                        else {
                          setSortField('name');
                          setSortAsc(true);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Contact Name</span>
                        <span>{sortField === 'name' ? (sortAsc ? '▲' : '▼') : '↕'}</span>
                      </div>
                    </th>
                    <th
                      className="px-3.5 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors border-r theme-table-border w-[240px]"
                      onClick={() => {
                        if (sortField === 'email') setSortAsc(!sortAsc);
                        else {
                          setSortField('email');
                          setSortAsc(true);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Email / Contact</span>
                        <span>{sortField === 'email' ? (sortAsc ? '▲' : '▼') : '↕'}</span>
                      </div>
                    </th>
                    <th className="px-3.5 py-3 border-r theme-table-border w-[170px]">Phone Number</th>
                    <th className="px-3.5 py-3 border-r theme-table-border min-w-[240px]">Comments / Notes</th>
                    <th className="px-3 py-3 text-center w-20">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y theme-table-border text-xs">
                  {filteredVendors.map((vendor, index) => {
                    const isEven = index % 2 === 0;
                    const isLinkedIn = vendor.comments && (vendor.comments.includes('linkedin.com') || vendor.comments.includes('http'));

                    return (
                      <tr
                        key={vendor.id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            vendor,
                          });
                        }}
                        className={`transition-colors ${
                          isEven ? 'theme-table-row-even' : 'theme-table-row-odd'
                        } theme-table-row-hover`}
                      >
                        {/* Index */}
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-[11px] theme-text-muted border-r theme-table-border">
                          {index + 1}
                        </td>

                        {/* Company */}
                        <td
                          className="px-3.5 py-2.5 font-bold border-r theme-table-border align-top"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              vendor,
                              cellField: 'Company',
                              cellValue: vendor.company,
                            });
                          }}
                        >
                          {editingCell?.id === vendor.id && editingCell?.field === 'company' ? (
                            <input
                              type="text"
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(vendor.id, 'company', editValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              onBlur={() => handleSaveCell(vendor.id, 'company', editValue)}
                              className="w-full p-1 border rounded text-xs theme-input"
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setEditingCell({ id: vendor.id, field: 'company' });
                                setEditValue(vendor.company === '-' ? '' : vendor.company);
                              }}
                              className="cursor-pointer hover:text-orange-600 transition-colors flex items-center justify-between group"
                              title="Click to edit company"
                            >
                              <span className="theme-text">{vendor.company}</span>
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400">✏️</span>
                            </div>
                          )}
                        </td>

                        {/* Contact Name */}
                        <td
                          className="px-3.5 py-2.5 border-r theme-table-border align-top"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              vendor,
                              cellField: 'Name',
                              cellValue: vendor.name,
                            });
                          }}
                        >
                          {editingCell?.id === vendor.id && editingCell?.field === 'name' ? (
                            <input
                              type="text"
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(vendor.id, 'name', editValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              onBlur={() => handleSaveCell(vendor.id, 'name', editValue)}
                              className="w-full p-1 border rounded text-xs theme-input"
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setEditingCell({ id: vendor.id, field: 'name' });
                                setEditValue(vendor.name === '-' ? '' : vendor.name);
                              }}
                              className="cursor-pointer hover:text-orange-600 transition-colors flex items-center justify-between group"
                              title="Click to edit contact name"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {(vendor.name || 'V')[0]?.toUpperCase()}
                                </span>
                                <span className="font-semibold theme-text">{vendor.name}</span>
                              </div>
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400">✏️</span>
                            </div>
                          )}
                        </td>

                        {/* Email */}
                        <td
                          className="px-3.5 py-2.5 border-r theme-table-border align-top"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              vendor,
                              cellField: 'Contact',
                              cellValue: vendor.email,
                            });
                          }}
                        >
                          {editingCell?.id === vendor.id && editingCell?.field === 'email' ? (
                            <input
                              type="text"
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(vendor.id, 'email', editValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              onBlur={() => handleSaveCell(vendor.id, 'email', editValue)}
                              className="w-full p-1 border rounded text-xs theme-input"
                            />
                          ) : vendor.email && vendor.email !== '-' ? (
                            <div className="flex items-center justify-between gap-1 group">
                              <a
                                href={`mailto:${vendor.email}`}
                                className="font-mono text-[11px] text-blue-600 hover:underline truncate select-all"
                                title={`Email ${vendor.email}`}
                              >
                                {vendor.email}
                              </a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(vendor.email, 'Email')}
                                className="opacity-0 group-hover:opacity-100 text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-opacity cursor-pointer shrink-0"
                                title="Copy Email"
                              >
                                📋
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingCell({ id: vendor.id, field: 'email' });
                                setEditValue('');
                              }}
                              className="text-slate-400 italic cursor-pointer hover:text-slate-600"
                              title="Click to add email"
                            >
                              - Add email -
                            </span>
                          )}
                        </td>

                        {/* Phone */}
                        <td
                          className="px-3.5 py-2.5 border-r theme-table-border align-top"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              vendor,
                              cellField: 'Phone',
                              cellValue: vendor.phone,
                            });
                          }}
                        >
                          {editingCell?.id === vendor.id && editingCell?.field === 'phone' ? (
                            <input
                              type="text"
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(vendor.id, 'phone', editValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              onBlur={() => handleSaveCell(vendor.id, 'phone', editValue)}
                              className="w-full p-1 border rounded text-xs theme-input"
                            />
                          ) : vendor.phone && vendor.phone !== '-' ? (
                            <div className="flex items-center justify-between gap-1 group">
                              <a
                                href={`tel:${vendor.phone}`}
                                className="font-mono text-[11px] text-slate-800 hover:underline break-words"
                              >
                                {vendor.phone}
                              </a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(vendor.phone, 'Phone')}
                                className="opacity-0 group-hover:opacity-100 text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-opacity cursor-pointer shrink-0"
                                title="Copy Phone"
                              >
                                📋
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingCell({ id: vendor.id, field: 'phone' });
                                setEditValue('');
                              }}
                              className="text-slate-400 italic cursor-pointer hover:text-slate-600"
                              title="Click to add phone"
                            >
                              - Add phone -
                            </span>
                          )}
                        </td>

                        {/* Comments / Notes */}
                        <td
                          className="px-3.5 py-2.5 border-r theme-table-border align-top break-words"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              vendor,
                              cellField: 'Comments',
                              cellValue: vendor.comments,
                            });
                          }}
                        >
                          {editingCell?.id === vendor.id && editingCell?.field === 'comments' ? (
                            <textarea
                              value={editValue}
                              autoFocus
                              rows={2}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveCell(vendor.id, 'comments', editValue);
                                }
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              onBlur={() => handleSaveCell(vendor.id, 'comments', editValue)}
                              className="w-full p-1 border rounded text-xs theme-input"
                            />
                          ) : isLinkedIn ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={vendor.comments.trim().startsWith('http') ? vendor.comments.trim() : `https://${vendor.comments.trim()}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold text-[11px] transition-colors"
                              >
                                <span>🔗</span>
                                <span>LinkedIn / URL</span>
                              </a>
                              <span className="text-[10px] theme-text-muted truncate max-w-[180px]">
                                {vendor.comments}
                              </span>
                            </div>
                          ) : vendor.comments && vendor.comments !== '-' ? (
                            <span
                              onClick={() => {
                                setEditingCell({ id: vendor.id, field: 'comments' });
                                setEditValue(vendor.comments);
                              }}
                              className="cursor-pointer hover:text-orange-600 transition-colors text-slate-700"
                              title="Click to edit notes"
                            >
                              {vendor.comments}
                            </span>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingCell({ id: vendor.id, field: 'comments' });
                                setEditValue('');
                              }}
                              className="text-slate-400 italic cursor-pointer hover:text-slate-600 text-[11px]"
                            >
                              + Add notes
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2.5 text-center align-top whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setVendorToDelete(vendor)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete / Archive Vendor"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 w-64 text-xs font-semibold text-slate-800 animate-in fade-in zoom-in-95 duration-75 select-none"
          style={{
            left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 270 : contextMenu.x),
            top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 220 : contextMenu.y),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 flex items-center justify-between">
            <span className="truncate max-w-[170px]">
              {contextMenu.cellField ? `${contextMenu.cellField}` : 'Vendor Actions'}
            </span>
            <span className="text-[9px] font-mono text-slate-400">Right-click</span>
          </div>

          {/* 1. Dynamic Cell Copy */}
          {contextMenu.cellField && (
            <button
              type="button"
              disabled={!contextMenu.cellValue || contextMenu.cellValue === '-'}
              onClick={() => {
                copyToClipboard(contextMenu.cellValue || '', contextMenu.cellField || 'Value');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-800 flex items-start gap-2.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <span className="text-sm mt-0.5">📋</span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                  Copy {contextMenu.cellField}
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

          {/* 2. Copy Company */}
          {contextMenu.vendor.company && contextMenu.vendor.company !== '-' && contextMenu.cellField !== 'Company' && (
            <button
              type="button"
              onClick={() => {
                copyToClipboard(contextMenu.vendor.company, 'Company');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100 text-[11px]"
            >
              <span>🏢</span>
              <span className="truncate">Copy Company: <strong>{contextMenu.vendor.company}</strong></span>
            </button>
          )}

          {/* 3. Copy Contact Name */}
          {contextMenu.vendor.name && contextMenu.vendor.name !== '-' && contextMenu.cellField !== 'Name' && (
            <button
              type="button"
              onClick={() => {
                copyToClipboard(contextMenu.vendor.name, 'Contact');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100 text-[11px]"
            >
              <span>👤</span>
              <span className="truncate">Copy Contact: <strong>{contextMenu.vendor.name}</strong></span>
            </button>
          )}

          {/* 4. Delete Action */}
          <div className="border-t border-slate-100 my-0.5" />
          <button
            type="button"
            onClick={() => {
              setVendorToDelete(contextMenu.vendor);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>🗑️</span> Delete Vendor...
          </button>
        </div>
      )}

      {/* Add New Vendor Modal Dialog */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isSavingNew && setIsAddModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-900 flex flex-col gap-5 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add New Vendor</h3>
                <p className="text-xs text-slate-500">
                  Target Database: <strong className="text-orange-600 font-bold">{activeTab === 'desi' ? 'Desi Vendor Info' : 'PV Vendor Info'}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technogen Inc, Judge, Brillio..."
                  value={newVendorForm.company}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, company: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact / Recruiter Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ranjitha, Tushar..."
                  value={newVendorForm.name}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="recruiter@company.com"
                    value={newVendorForm.email}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={newVendorForm.phone}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Comments / LinkedIn Profile URL</label>
                <textarea
                  rows={2}
                  placeholder="Notes, LinkedIn link, specializations..."
                  value={newVendorForm.comments}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, comments: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSavingNew}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNew}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingNew ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving to Notion...</span>
                    </>
                  ) : (
                    <span>Save to Notion</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vendor Confirmation Modal */}
      {vendorToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setVendorToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 text-slate-900 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 text-xl font-bold">
                ⚠️
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Archive Vendor?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to remove <strong className="text-slate-800 font-semibold">{vendorToDelete.company || vendorToDelete.name}</strong>?
                  This will archive the record in your Notion database.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVendorToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteVendor}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Archiving...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="text-emerald-400 font-bold text-sm">✓</span>
          <span className="truncate max-w-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
