'use client';
// Version: 1.0.3 - UI Cleanup (Date, ID, Delete)
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ToastProvider';
import { ensureSessionId } from '@/utils/session';
import LayoutWrapper from '@/components/LayoutWrapper';

interface Notification {
  id: number;
  user_id: number;
  user_role: string;
  type: string;
  title: string;
  message: string;
  resource_id?: string | number;
  target_page?: string;
  action_by?: string;
  is_read: boolean;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role_name?: string;
}

const TABS = [
  { id: 'all', label: 'All Activities', icon: '🔔' },
  { id: 'delegation', label: 'Delegations', icon: '📋' },
  { id: 'checklist', label: 'Checklists', icon: '✅' },
  { id: 'todo', label: 'To-Dos', icon: '📝' },
  { id: 'mom', label: 'MOM', icon: '🤝' },
  { id: 'helpdesk', label: 'Helpdesk', icon: '🎫' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionId = ensureSessionId();
        const response = await fetch('/api/auth', { headers: { 'x-session-id': sessionId } });
        const data = await response.json();

        if (!data.authenticated) {
          router.push('/login');
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?userId=${user?.id}&userRole=${user?.role_name || ''}`);

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      } else {
        toast.error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Error loading notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNavigate = async (notification: Notification) => {
    // ONLY delete if current user is the target recipient
    if (String(notification.user_id) === String(user?.id)) {
      await handleDelete(notification.id);
    }

    // Determine path and deep link
    const page = notification.target_page || notification.type?.split('_')[0] || 'delegation';
    const resourceId = notification.resource_id;

    if (resourceId) {
      router.push(`/${page}?id=${resourceId}`);
    } else {
      router.push(`/${page}`);
    }

    toast.success('Jumping to task...');
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Tab filter
      const categoryMatch = activeTab === 'all' ||
        n.target_page?.toLowerCase() === activeTab ||
        n.type?.startsWith(activeTab);

      // Search filter
      const searchMatch = !searchTerm ||
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.action_by?.toLowerCase().includes(searchTerm.toLowerCase());

      return categoryMatch && searchMatch;
    });
  }, [notifications, activeTab, searchTerm]);

  const getNotificationStyles = (type: string) => {
    if (type.includes('created')) return { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-200 dark:border-green-800', iconBg: 'bg-green-500', text: 'text-green-700 dark:text-green-400' };
    if (type.includes('updated')) return { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', iconBg: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400' };
    if (type.includes('status')) return { bg: 'bg-purple-50 dark:bg-purple-900/10', border: 'border-purple-200 dark:border-purple-800', iconBg: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-400' };
    if (type.includes('remark')) return { bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800', iconBg: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400' };
    return { bg: 'bg-gray-50 dark:bg-gray-700/50', border: 'border-gray-200 dark:border-gray-600', iconBg: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-400' };
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return '';

    let date: Date;
    // Try to extract numbers from any string (dd/mm/yyyy HH:mm:ss or similar)
    const parts = dateStr.split(/[^0-9]/).filter(p => p.length > 0);

    if (parts.length >= 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      const hour = parts[3] ? parseInt(parts[3]) : 0;
      const min = parts[4] ? parseInt(parts[4]) : 0;
      const sec = parts[5] ? parseInt(parts[5]) : 0;

      date = new Date(year, month, day, hour, min, sec);
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) return '';

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <span className="bg-[var(--theme-primary)] p-2 rounded-lg text-2xl">🔔</span>
                Notifications Center
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 ml-12">
                Manage and track all system activities across pages
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm w-64 focus:ring-2 focus:ring-[var(--theme-primary)] transition"
                />
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={fetchNotifications}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition text-gray-500"
                title="Refresh"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Role Indicator for Admins */}
          {user?.role_name?.toLowerCase() === 'admin' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-amber-800 dark:text-amber-400 text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <strong>Admin Mode:</strong> You are viewing notifications for all users.
            </div>
          )}

          {/* Tabs Section */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {TABS.filter(tab => {
              if (tab.id === 'all') return true;
              return notifications.some(n =>
                n.target_page?.toLowerCase() === tab.id ||
                n.type?.startsWith(tab.id)
              );
            }).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-[var(--theme-primary)] text-gray-900 shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <span className="ml-1 bg-white/30 px-2 py-0.5 rounded-full text-xs">
                    {filteredNotifications.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-12 h-12 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Fetching your updates...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-32 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                  📭
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  No notifications found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  {searchTerm ? "We couldn't find anything matching your search." : "You're all caught up! No recent activity in this category."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-[var(--theme-primary)] font-semibold hover:underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <AnimatePresence mode='popLayout'>
                  {filteredNotifications.map((n, index) => {
                    const styles = getNotificationStyles(n.type);
                    return (
                      <motion.div
                        key={`${n.id}-${index}`}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`group relative flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl border transition-all hover:shadow-lg bg-white dark:bg-gray-800 ${styles.border}`}
                      >
                        {/* Type Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center text-white text-xl shadow-inner`}>
                          {n.target_page === 'delegation' ? '📋' :
                            n.target_page === 'checklist' ? '✅' :
                              n.target_page === 'todo' ? '📝' : '🔔'}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex flex-col">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                {n.title}
                              </h3>
                              <p className="text-xs text-gray-500 font-bold mt-1">
                                {n.action_by || 'System'} {n.type.includes('created') ? 'created a task for you' : 'updated a task details'}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 font-medium whitespace-nowrap bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-full">
                              {formatDateTime(n.created_at)}
                            </span>
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-750/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 mb-3 shadow-inner">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 text-[var(--theme-primary)]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 italic font-medium">
                                "{n.message}"
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 text-xs bg-[var(--theme-primary)]/10 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg font-bold tracking-wide border border-[var(--theme-primary)]/20 uppercase">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {n.target_page || 'System'}
                            </span>
                            {n.resource_id &&
                              !['N/A', '#N/A', 'undefined', 'null', ''].includes(String(n.resource_id).trim()) && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold border-l border-gray-200 dark:border-gray-700 pl-4">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  Resource ID: #{n.resource_id}
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleNavigate(n)}
                            className="flex items-center gap-2 px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold rounded-xl hover:scale-105 transition active:scale-95"
                          >
                            Jump to Task
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
