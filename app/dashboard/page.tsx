'use client';

import { useState, useEffect } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import { ensureSessionId } from '@/utils/session';

interface DashboardStats {
  totalDelegations: number;
  pendingTasks: number;
  inProgress: number;
  completed: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDelegations: 0,
    pendingTasks: 0,
    inProgress: 0,
    completed: 0,
  });

  useEffect(() => {
    // Fetch delegation stats
    const fetchStats = async () => {
      try {
        const sessionId = ensureSessionId();
        const response = await fetch('/api/auth', { headers: { 'x-session-id': sessionId } });
        const data = await response.json();
        
        if (data.authenticated) {
          const delResponse = await fetch(`/api/delegations?userId=${data.user.id}`);
          const delData = await delResponse.json();
          
          const delegations = delData.delegations || [];
          setStats({
            totalDelegations: delegations.length,
            pendingTasks: delegations.filter((d: any) => d.status === 'pending').length,
            inProgress: delegations.filter((d: any) => d.status === 'in-progress').length,
            completed: delegations.filter((d: any) => d.status === 'completed').length,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <LayoutWrapper>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 sm:p-6 md:p-8 text-white">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Welcome to ERP System</h1>
          <p className="text-sm sm:text-base text-blue-100">Manage your business efficiently with our enterprise resource planning solution</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">Total Delegations</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.totalDelegations}</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-xl sm:text-2xl">
                📋
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">Pending Tasks</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.pendingTasks}</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center text-xl sm:text-2xl">
                ⏳
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">In Progress</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-xl sm:text-2xl">
                🔄
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-xl sm:text-2xl">
                ✅
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <a href="/delegation" className="block p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition">
                📋 Manage Delegations
              </a>
              <a href="/users" className="block p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition">
                👥 Manage Users
              </a>
              <a href="/chat" className="block p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition">
                💬 Open Chat
              </a>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-4">System Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Status</span>
                <span className="text-green-600 font-semibold">● Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Database</span>
                <span className="text-slate-900 dark:text-white">Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Last Sync</span>
                <span className="text-slate-900 dark:text-white">Just now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
