'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface LiveNotification {
  id: string;
  sourceId: string;
  type: 'interview' | 'submission';
  title: string;
  candidate: string;
  position: string;
  client: string;
  marketer: string;
  status?: string;
  rate?: string;
  timeRaw?: string;
  dateRaw?: string;
  timestamp: number;
  read: boolean;
  link: string;
}

interface NotificationContextType {
  notifications: LiveNotification[];
  unreadCount: number;
  desktopEnabled: boolean;
  permission: NotificationPermission;
  isSyncing: boolean;
  lastSynced: string | null;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  toggleDesktopNotifications: () => Promise<boolean>;
  refreshNotifications: (manual?: boolean) => Promise<void>;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  desktopEnabled: false,
  permission: 'default',
  isSyncing: false,
  lastSynced: null,
  markAsRead: () => {},
  markAsUnread: () => {},
  markAllAsRead: () => {},
  deleteNotification: () => {},
  clearAllNotifications: () => {},
  toggleDesktopNotifications: async () => false,
  refreshNotifications: async () => {},
  soundEnabled: true,
  setSoundEnabled: () => {},
});

// Self-contained subtle chime via Web Audio API
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

const STORAGE_KEY_NOTIFS = 'placehub_live_notifications_v1';
const STORAGE_KEY_DESKTOP = 'placehub_desktop_notifs_enabled';
const STORAGE_KEY_SOUND = 'placehub_notifs_sound_enabled';
const STORAGE_KEY_KNOWN_INTERVIEWS = 'placehub_known_interview_ids';
const STORAGE_KEY_KNOWN_SUBMISSIONS = 'placehub_known_submission_ids';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const isInitialLoadRef = useRef(true);
  const isSyncingRef = useRef(false);
  const desktopEnabledRef = useRef(false);
  const soundEnabledRef = useRef(true);

  // Keep refs in sync with state
  useEffect(() => {
    desktopEnabledRef.current = desktopEnabled;
  }, [desktopEnabled]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Initialize from localStorage and check notification permission
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Permission check
    try {
      if ('Notification' in window) {
        setPermission(Notification.permission);
        const savedDesktop = localStorage.getItem(STORAGE_KEY_DESKTOP);
        if (savedDesktop === 'true' && Notification.permission === 'granted') {
          setDesktopEnabled(true);
          desktopEnabledRef.current = true;
        } else {
          setDesktopEnabled(false);
          desktopEnabledRef.current = false;
        }
      }
    } catch {}

    // 2. Sound check
    try {
      const savedSound = localStorage.getItem(STORAGE_KEY_SOUND);
      if (savedSound !== null) {
        const val = savedSound === 'true';
        setSoundEnabledState(val);
        soundEnabledRef.current = val;
      }
    } catch {}

    // 3. Stored notifications
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTIFS);
      if (stored) {
        const parsed: LiveNotification[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved notifications:', e);
    }
  }, []);

  // Save notifications to localStorage whenever changed
  const saveNotifications = useCallback((newNotifs: LiveNotification[]) => {
    setNotifications(newNotifs);
    try {
      // Keep up to 100 recent notifications
      const trimmed = newNotifs.slice(0, 100);
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(trimmed));
    } catch {}
  }, []);

  const setSoundEnabled = (val: boolean) => {
    setSoundEnabledState(val);
    soundEnabledRef.current = val;
    try {
      localStorage.setItem(STORAGE_KEY_SOUND, String(val));
    } catch {}
  };

  // Trigger desktop alert
  const fireDesktopNotification = useCallback((notif: LiveNotification) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const title =
        notif.type === 'interview'
          ? `⚡ New Interview Scheduled: ${notif.candidate}`
          : `📝 New Team Submission: ${notif.candidate}`;

      const body = `${notif.position ? `${notif.position} at ` : ''}${notif.client || 'Client'} (Marketer: ${notif.marketer || 'Team'})`;

      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `placehub-${notif.id}`,
      });

      n.onclick = () => {
        window.focus();
        window.location.href = notif.link;
      };
    } catch (e) {
      console.warn('Failed to fire desktop notification:', e);
    }
  }, []);

  // Poll & sync live data
  const refreshNotifications = useCallback(async (manual = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      // Fetch both endpoints concurrently (use limit=40 on placements to only query 1 page from Notion)
      const [resInterviews, resSubmissions] = await Promise.allSettled([
        fetch('/api/fetch-placements?limit=40', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/fetch-google-sheet', { cache: 'no-store' }).then((r) => r.json()),
      ]);

      const knownInterviewsRaw = localStorage.getItem(STORAGE_KEY_KNOWN_INTERVIEWS);
      const knownSubmissionsRaw = localStorage.getItem(STORAGE_KEY_KNOWN_SUBMISSIONS);

      const knownInterviews = new Set<string>(knownInterviewsRaw ? JSON.parse(knownInterviewsRaw) : []);
      const knownSubmissions = new Set<string>(knownSubmissionsRaw ? JSON.parse(knownSubmissionsRaw) : []);

      const incomingNotifications: LiveNotification[] = [];
      const updatedKnownInterviews = new Set(knownInterviews);
      const updatedKnownSubmissions = new Set(knownSubmissions);

      // 1. Process Interviews
      if (resInterviews.status === 'fulfilled' && resInterviews.value?.placements) {
        const placements: Record<string, string>[] = resInterviews.value.placements;

        // If very first run and nothing known yet, seed initial recent notifications
        if (knownInterviews.size === 0) {
          placements.forEach((p) => updatedKnownInterviews.add(p.id));
          // Take the most recent 12 interviews for initial history
          placements.slice(0, 12).forEach((p, idx) => {
            const candidate = p['Consultant Name'] || p['Candidate'] || 'Candidate';
            const position = p['Position'] || p['Role'] || 'Role';
            const client = p['Vendor / Client'] || p['Client'] || p['Vendor'] || 'Client';
            const marketer = p['Marketer'] || p['Recruiter'] || '-';
            const status = p['Status'] || 'Interview';
            const timeRaw = p['Interview Time'] || p['Time'] || '';
            const dateRaw = p['Date'] || '';

            incomingNotifications.push({
              id: `notif-int-${p.id || idx}`,
              sourceId: p.id || String(idx),
              type: 'interview',
              title: `Interview: ${candidate} with ${client}`,
              candidate,
              position,
              client,
              marketer,
              status,
              timeRaw,
              dateRaw,
              timestamp: Date.now() - idx * 3600000,
              read: true,
              link: `/?row=${p.id || idx}`,
            });
          });
        } else {
          // Detect truly new interviews
          placements.forEach((p) => {
            if (!knownInterviews.has(p.id)) {
              updatedKnownInterviews.add(p.id);
              const candidate = p['Consultant Name'] || p['Candidate'] || 'Candidate';
              const position = p['Position'] || p['Role'] || 'Role';
              const client = p['Vendor / Client'] || p['Client'] || p['Vendor'] || 'Client';
              const marketer = p['Marketer'] || p['Recruiter'] || '-';
              const status = p['Status'] || 'Interview';
              const timeRaw = p['Interview Time'] || p['Time'] || '';
              const dateRaw = p['Date'] || '';

              const notif: LiveNotification = {
                id: `notif-int-${p.id}-${Date.now()}`,
                sourceId: p.id,
                type: 'interview',
                title: `Interview Scheduled: ${candidate}`,
                candidate,
                position,
                client,
                marketer,
                status,
                timeRaw,
                dateRaw,
                timestamp: Date.now(),
                read: false,
                link: `/?row=${p.id}`,
              };
              incomingNotifications.push(notif);
            }
          });
        }
      }

      // 2. Process Team Submissions
      if (resSubmissions.status === 'fulfilled' && resSubmissions.value?.rows) {
        const rows: Record<string, string>[] = resSubmissions.value.rows;

        // If very first run and nothing known yet, seed initial recent notifications
        if (knownSubmissions.size === 0) {
          rows.forEach((r) => updatedKnownSubmissions.add(r.id));
          // Take the most recent 12 submissions for initial history
          rows.slice(0, 12).forEach((r, idx) => {
            const candidate = r['Consultant Name'] || r['CONSULTANT NAME'] || 'Consultant';
            const position = r['Position'] || r['POSITION'] || 'Position';
            const client = r['Client'] || r['CLIENT'] || 'Client';
            const marketer = r['Marketer Name'] || r['MARKETER NAME'] || '-';
            const status = r['Submitted/Rejected'] || r['SUBMITTED/REJECTED'] || 'Submitted';
            const rate = r['Rate'] || r['RATE'] || '-';
            const dateRaw = r['Date'] || r['DATE'] || '';

            incomingNotifications.push({
              id: `notif-sub-${r.id || idx}`,
              sourceId: r.id || String(idx),
              type: 'submission',
              title: `Team Submission: ${candidate}`,
              candidate,
              position,
              client,
              marketer,
              status,
              rate,
              dateRaw,
              timestamp: Date.now() - idx * 2800000,
              read: true,
              link: `/team-submissions`,
            });
          });
        } else {
          // Detect truly new submissions
          rows.forEach((r) => {
            if (!knownSubmissions.has(r.id)) {
              updatedKnownSubmissions.add(r.id);
              const candidate = r['Consultant Name'] || r['CONSULTANT NAME'] || 'Consultant';
              const position = r['Position'] || r['POSITION'] || 'Position';
              const client = r['Client'] || r['CLIENT'] || 'Client';
              const marketer = r['Marketer Name'] || r['MARKETER NAME'] || '-';
              const status = r['Submitted/Rejected'] || r['SUBMITTED/REJECTED'] || 'Submitted';
              const rate = r['Rate'] || r['RATE'] || '-';
              const dateRaw = r['Date'] || r['DATE'] || '';

              const notif: LiveNotification = {
                id: `notif-sub-${r.id}-${Date.now()}`,
                sourceId: r.id,
                type: 'submission',
                title: `New Submission: ${candidate}`,
                candidate,
                position,
                client,
                marketer,
                status,
                rate,
                dateRaw,
                timestamp: Date.now(),
                read: false,
                link: `/team-submissions`,
              };
              incomingNotifications.push(notif);
            }
          });
        }
      }

      // Update storage of known IDs
      localStorage.setItem(STORAGE_KEY_KNOWN_INTERVIEWS, JSON.stringify(Array.from(updatedKnownInterviews)));
      localStorage.setItem(STORAGE_KEY_KNOWN_SUBMISSIONS, JSON.stringify(Array.from(updatedKnownSubmissions)));

      // If we got new notifications:
      if (incomingNotifications.length > 0) {
        setNotifications((prev) => {
          // Merge and avoid duplicate IDs
          const existingIds = new Set(prev.map((n) => n.id));
          const uniqueIncoming = incomingNotifications.filter((n) => !existingIds.has(n.id));
          const combined = [...uniqueIncoming, ...prev].sort((a, b) => b.timestamp - a.timestamp);
          try {
            localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(combined.slice(0, 100)));
          } catch {}
          return combined;
        });

        // If not initial load and there are brand new notifications:
        if (!isInitialLoadRef.current) {
          const unreadNew = incomingNotifications.filter((n) => !n.read);
          if (unreadNew.length > 0) {
            if (soundEnabledRef.current) playChime();
            if (desktopEnabledRef.current && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              unreadNew.slice(0, 3).forEach((n) => fireDesktopNotification(n));
            }
          }
        }
      }

      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      isInitialLoadRef.current = false;
    } catch (err) {
      console.warn('Notification sync error:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [fireDesktopNotification]);

  // Periodic background polling (every 45 seconds + on window focus)
  useEffect(() => {
    refreshNotifications();

    const interval = setInterval(() => {
      refreshNotifications();
    }, 45000);

    const onFocus = () => {
      refreshNotifications();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshNotifications]);

  // Toggle desktop notifications with browser permission request
  const toggleDesktopNotifications = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Desktop notifications are not supported in your browser.');
      return false;
    }

    if (desktopEnabled) {
      // Turn off
      setDesktopEnabled(false);
      desktopEnabledRef.current = false;
      localStorage.setItem(STORAGE_KEY_DESKTOP, 'false');
      return false;
    }

    // Turn on
    let currentPerm = Notification.permission;
    if (currentPerm !== 'granted') {
      currentPerm = await Notification.requestPermission();
      setPermission(currentPerm);
    }

    if (currentPerm === 'granted') {
      setDesktopEnabled(true);
      desktopEnabledRef.current = true;
      localStorage.setItem(STORAGE_KEY_DESKTOP, 'true');

      // Send confirmation test notification
      try {
        new Notification('🔔 RemoteTiger Alerts Activated', {
          body: 'You will receive live desktop alerts when new interviews or team submissions are posted!',
          icon: '/favicon.ico',
        });
        if (soundEnabled) playChime();
      } catch {}

      return true;
    } else {
      setDesktopEnabled(false);
      localStorage.setItem(STORAGE_KEY_DESKTOP, 'false');
      alert('Desktop notification permission was denied or blocked in your browser settings.');
      return false;
    }
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const markAsUnread = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: false } : n));
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  };

  const clearAllNotifications = () => {
    saveNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
