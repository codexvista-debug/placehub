'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useNotifications, LiveNotification } from '@/app/context/NotificationContext';
import CellBadge from '@/app/components/CellBadge';
import { getInitials } from '@/app/utils/nameUtils';

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    desktopEnabled,
    permission,
    isSyncing,
    lastSynced,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    toggleDesktopNotifications,
    refreshNotifications,
    soundEnabled,
    setSoundEnabled,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'interview' | 'submission' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTestingAlert, setIsTestingAlert] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Tab counts
  const interviewCount = useMemo(
    () => notifications.filter((n) => n.type === 'interview').length,
    [notifications]
  );
  const submissionCount = useMemo(
    () => notifications.filter((n) => n.type === 'submission').length,
    [notifications]
  );

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeTab === 'interview' && n.type !== 'interview') return false;
      if (activeTab === 'submission' && n.type !== 'submission') return false;
      if (activeTab === 'unread' && n.read) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const match =
          n.candidate?.toLowerCase().includes(query) ||
          n.client?.toLowerCase().includes(query) ||
          n.position?.toLowerCase().includes(query) ||
          n.marketer?.toLowerCase().includes(query) ||
          n.status?.toLowerCase().includes(query) ||
          n.title?.toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const handleTestNotification = async () => {
    setIsTestingAlert(true);
    try {
      if (Notification.permission !== 'granted') {
        const granted = await toggleDesktopNotifications();
        if (!granted) {
          setIsTestingAlert(false);
          return;
        }
      }

      new Notification('🔔 RemoteTiger Test Alert', {
        body: 'Live notifications are working perfectly! You will receive instant alerts for new interviews and submissions.',
        icon: '/favicon.ico',
      });
    } catch (err) {
      console.error('Test notification failed:', err);
      alert('Could not trigger test notification. Please verify browser notification permissions.');
    } finally {
      setIsTestingAlert(false);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen theme-bg theme-text-body p-4 sm:p-8 md:p-12 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b theme-border">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <span className="text-2xl sm:text-3xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Live Notifications
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                Live Feed
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
              Combined real-time alerts for scheduled interviews and team submissions with desktop notifications.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => refreshNotifications(true)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
              title="Poll live data now"
            >
              <svg
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-orange-600' : 'text-slate-600 dark:text-slate-300'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black bg-blue-100 text-blue-950 border border-blue-300 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-700 hover:bg-blue-200 transition-all cursor-pointer shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Mark All Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <>
                {confirmClear ? (
                  <div className="inline-flex items-center gap-1.5 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 rounded-lg p-0.5 shadow-2xs">
                    <span className="text-[11px] font-black text-rose-950 dark:text-rose-200 px-1.5">Sure?</span>
                    <button
                      onClick={() => {
                        clearAllNotifications();
                        setConfirmClear(false);
                      }}
                      className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-extrabold hover:bg-rose-700 cursor-pointer shadow-2xs"
                    >
                      Yes, Clear
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                    title="Clear notification list"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Clear</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Desktop Notification Preference Banner */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-700 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Desktop System Notifications</h3>
                {desktopEnabled ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-950 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-400 dark:border-emerald-700 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Active
                  </span>
                ) : permission === 'denied' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-rose-950 dark:text-rose-100 bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-700 shadow-2xs">
                    Blocked in Browser
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 shadow-2xs">
                    Turned Off
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 max-w-xl">
                {desktopEnabled
                  ? 'Desktop alerts are active. You will get native popup banners even when this tab is running in the background.'
                  : permission === 'denied'
                  ? 'Notifications are blocked in your browser. Click the lock icon in your address bar to allow notifications.'
                  : 'Turn on native desktop banners so you never miss an interview confirmation or new team submission.'}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0 self-end md:self-center">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all cursor-pointer shadow-2xs ${
                soundEnabled
                  ? 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
              title="Toggle audio chime alert"
            >
              <span>{soundEnabled ? '🔊 Sound On' : '🔇 Muted'}</span>
            </button>

            {/* Test Alert Button */}
            <button
              onClick={handleTestNotification}
              disabled={isTestingAlert}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-white hover:bg-slate-100 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Test Alert</span>
            </button>

            {/* Main Toggle Button */}
            <button
              onClick={toggleDesktopNotifications}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs cursor-pointer ${
                desktopEnabled
                  ? 'bg-rose-100 text-rose-950 border border-rose-300 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-500/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${desktopEnabled ? 'bg-rose-600' : 'bg-white'}`}></span>
              <span>{desktopEnabled ? 'Turn Off Desktop Alerts' : 'Enable Desktop Alerts'}</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('interview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'interview'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>⚡ Interviews</span>
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'interview'
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-100 text-indigo-950 border border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700'
                }`}
              >
                {interviewCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('submission')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'submission'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>📝 Team Submissions</span>
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'submission'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700'
                }`}
              >
                {submissionCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                    activeTab === 'unread'
                      ? 'bg-white/20 text-white'
                      : 'bg-rose-100 text-rose-950 border border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Search box & Sync status */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search candidate, client, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-orange-500/40 transition-all placeholder:text-slate-400 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {lastSynced && (
              <span className="hidden md:inline text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                Synced {lastSynced}
              </span>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex flex-col gap-3">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
                📭
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No notifications found</h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-sm">
                {searchQuery
                  ? 'No notifications matched your search query. Try clearing the filter.'
                  : activeTab === 'unread'
                  ? 'All caught up! You have no unread notifications right now.'
                  : 'New interviews and team submissions will automatically appear here when posted.'}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-extrabold text-orange-600 hover:underline cursor-pointer"
                >
                  Clear search filter
                </button>
              ) : (
                <button
                  onClick={() => refreshNotifications(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-orange-600 text-white hover:bg-orange-700 transition-all cursor-pointer shadow-xs"
                >
                  <span>Sync live data now</span>
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isInterview = notif.type === 'interview';

              return (
                <div
                  key={notif.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-2xs hover:shadow-md ${
                    !notif.read
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/25'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Left Column: Icon + Content */}
                  <div className="flex items-start gap-3.5">
                    {/* Unread indicator / Type Icon */}
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-2xs border ${
                          isInterview
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        }`}
                      >
                        {isInterview ? '⚡' : '📝'}
                      </div>
                      {!notif.read && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-2 min-w-0">
                      {/* Page Tag, Status Badge & Time */}
                      <div className="flex items-center flex-wrap gap-2">
                        {isInterview ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black tracking-wide uppercase bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-2xs dark:bg-indigo-950 dark:text-indigo-100 dark:border-indigo-700">
                            ⚡ [INTERVIEWS]
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black tracking-wide uppercase bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-700">
                            📝 [TEAM SUBMISSIONS]
                          </span>
                        )}

                        {notif.status && (
                          <CellBadge header="status" value={notif.status} />
                        )}

                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center">
                          • {formatRelativeTime(notif.timestamp)}
                        </span>
                      </div>

                      {/* Main Title / Candidate with Initials Badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black shrink-0 text-white shadow-2xs"
                            style={{ backgroundColor: isInterview ? '#4f46e5' : '#059669' }}
                          >
                            {getInitials(notif.candidate)}
                          </span>
                          <span className="text-[14.5px] font-black text-slate-900 dark:text-white tracking-tight">
                            {notif.candidate}
                          </span>
                        </div>

                        {notif.position && (
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            as {notif.position}
                          </span>
                        )}
                      </div>

                      {/* Metadata Chips - High Contrast & Bold */}
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-xs">
                        {notif.client && (
                          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            <span className="font-bold text-slate-600 dark:text-slate-400">Client:</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">{notif.client}</span>
                          </div>
                        )}

                        {notif.marketer && notif.marketer !== '-' && (
                          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            <span className="font-bold text-slate-600 dark:text-slate-400">Marketer:</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">{notif.marketer}</span>
                          </div>
                        )}

                        {isInterview && notif.timeRaw && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-extrabold">
                            <svg className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{notif.timeRaw}</span>
                          </div>
                        )}

                        {!isInterview && notif.rate && notif.rate !== '-' && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-black font-mono">
                            <span>Rate: {notif.rate}</span>
                          </div>
                        )}

                        {notif.dateRaw && (
                          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                            ({notif.dateRaw})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Quick Links & Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link
                      href={notif.link}
                      onClick={() => markAsRead(notif.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all shadow-2xs cursor-pointer ${
                        isInterview
                          ? 'bg-indigo-700 text-white hover:bg-indigo-800'
                          : 'bg-emerald-700 text-white hover:bg-emerald-800'
                      }`}
                    >
                      <span>{isInterview ? 'View Interview' : 'View Submission'}</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>

                    {!notif.read ? (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:border-blue-400 transition-all cursor-pointer shadow-2xs"
                        title="Mark as read"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => markAsUnread(notif.id)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-orange-600 hover:border-orange-400 transition-all cursor-pointer shadow-2xs"
                        title="Mark as unread"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500 block m-0.5"></span>
                      </button>
                    )}

                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-rose-600 hover:border-rose-400 transition-all cursor-pointer shadow-2xs"
                      title="Dismiss notification"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
