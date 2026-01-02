'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/LayoutWrapper';
import { ensureSessionId } from '@/utils/session';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';

interface Checklist {
  id: number;
  question: string;
  assignee: string;
  doer_name: string | null;
  priority: string;
  department: string | null;
  verification_required: boolean;
  verifier_name: string | null;
  attachment_required: boolean;
  frequency: string;
  from_date: string;
  due_date: string;
  status: string;
  created_at: string;
  weekly_days?: number[];
  selected_dates?: string[];
}

interface User {
  id: number;
  username: string;
  email: string;
  image_url?: string;
}

const DEPARTMENTS = [
  'Sales', 'Marketing', 'Human Resources', 'Finance', 'IT',
  'Operations', 'Customer Service', 'Product Development', 'Legal'
];

const PRIORITIES = [
  { value: 'high', label: 'High', color: 'bg-red-500 text-white' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500 text-white' },
  { value: 'low', label: 'Low', color: 'bg-green-500 text-white' }
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

export default function ChecklistPage() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  
  // Sorting and pagination states
  const [sortColumn, setSortColumn] = useState<string>('due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Dropdown search states
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [doerSearch, setDoerSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [verifierSearch, setVerifierSearch] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showDoerDropdown, setShowDoerDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showVerifierDropdown, setShowVerifierDropdown] = useState(false);
  
  // Date Time Picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  
  // Weekly day selection (0=Monday, 1=Tuesday, ..., 5=Saturday)
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  
  // Multiple dates selection for monthly/quarterly/yearly
  const [selectedMultipleDates, setSelectedMultipleDates] = useState<string[]>([]);
  const [showMultipleDatePicker, setShowMultipleDatePicker] = useState(false);
  const [multipleDatePickerDate, setMultipleDatePickerDate] = useState(new Date());
  
  // Refs for click-outside handling
  const assigneeRef = useRef<HTMLDivElement>(null);
  const doerRef = useRef<HTMLDivElement>(null);
  const departmentRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    question: '',
    assignee: '',
    doerName: '',
    priority: 'medium',
    department: '',
    verificationRequired: false,
    verifierName: '',
    attachmentRequired: false,
    frequency: 'daily',
    fromDateTime: '',
    weeklyDays: [] as number[],
    selectedDates: [] as string[]
  });

  const router = useRouter();

  // Helper functions for calendar
  const handleDateTimeSet = () => {
    const hour24 = selectedPeriod === 'PM' && selectedHour !== 12
      ? selectedHour + 12
      : selectedPeriod === 'AM' && selectedHour === 12
        ? 0
        : selectedHour;

    const dateTime = new Date(selectedDate);
    dateTime.setHours(hour24, selectedMinute, 0, 0);

    setFormData({
      ...formData,
      fromDateTime: dateTime.toISOString()
    });
    setShowDatePicker(false);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateToLocalTimezone = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Database already has IST offset added, so just format without timezone conversion
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  };

  // Format date for form input display (uses local time as selected by user)
  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  };

  // Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
      if (doerRef.current && !doerRef.current.contains(event.target as Node)) {
        setShowDoerDropdown(false);
      }
      if (departmentRef.current && !departmentRef.current.contains(event.target as Node)) {
        setShowDepartmentDropdown(false);
      }
      if (verifierRef.current && !verifierRef.current.contains(event.target as Node)) {
        setShowVerifierDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        fetchUsers();
        fetchChecklists();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchChecklists = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checklists');
      const data = await response.json();
      setChecklists(data.checklists || []);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const toast = useToast();
  const loader = useLoader();

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      loader.showLoader();
      const response = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdBy: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        loader.hideLoader();
        toast.success(`${data.count || 1} checklist task(s) created successfully!`);
        fetchChecklists();
        setShowAddModal(false);
        resetForm();
      } else {
        loader.hideLoader();
        toast.error('Failed to create checklist');
      }
    } catch (error) {
      console.error('Error adding checklist:', error);
      loader.hideLoader();
      toast.error('Error creating checklist');
    }
  };

  const handleEditChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChecklist) return;

    try {
      const response = await fetch('/api/checklists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingChecklist.id,
          ...formData
        })
      });

      if (response.ok) {
        fetchChecklists();
        setShowEditModal(false);
        setEditingChecklist(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const handleDeleteChecklist = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/checklists?id=${deleteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchChecklists();
        setShowDeleteModal(false);
        setDeleteId(null);
      }
    } catch (error) {
      console.error('Error deleting checklist:', error);
    }
  };

  const openEditModal = (checklist: Checklist) => {
    setEditingChecklist(checklist);
    const weekDays = checklist.weekly_days || [];
    const dates = checklist.selected_dates || [];
    setSelectedWeekDays(weekDays);
    setSelectedMultipleDates(dates);
    setFormData({
      question: checklist.question,
      assignee: checklist.assignee,
      doerName: checklist.doer_name || '',
      priority: checklist.priority,
      department: checklist.department || '',
      verificationRequired: checklist.verification_required,
      verifierName: checklist.verifier_name || '',
      attachmentRequired: checklist.attachment_required,
      frequency: checklist.frequency,
      fromDateTime: checklist.from_date,
      weeklyDays: weekDays,
      selectedDates: dates
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      question: '',
      assignee: '',
      doerName: '',
      priority: 'medium',
      department: '',
      verificationRequired: false,
      verifierName: '',
      attachmentRequired: false,
      frequency: 'daily',
      fromDateTime: '',
      weeklyDays: [],
      selectedDates: []
    });
    setSelectedWeekDays([]);
    setSelectedMultipleDates([]);
    setShowMultipleDatePicker(false);
  };

  const getUserImage = (username: string) => {
    const user = users.find(u => u.username === username);
    return user?.image_url || null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'overdue': return 'bg-red-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'planned': return 'bg-blue-500 text-white';
      case 'completed': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const filteredChecklists = useMemo(() => {
    let filtered = checklists.filter(checklist => {
      const matchesSearch = searchTerm === '' || 
        checklist.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        checklist.assignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (checklist.doer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (checklist.department?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Checklist];
      let bVal: any = b[sortColumn as keyof Checklist];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Convert to comparable values
      if (sortColumn === 'due_date' || sortColumn === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [checklists, searchTerm, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredChecklists.length / itemsPerPage);
  const paginatedChecklists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredChecklists.slice(startIndex, endIndex);
  }, [filteredChecklists, currentPage, itemsPerPage]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#f4d24a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading checklists...</p>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-[#fffef7] via-[#fff9e6] to-[#fef6d8] dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header with Title and Add Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] bg-clip-text text-transparent mb-2">
                ✅ Checklist Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage recurring tasks with automated scheduling
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 rounded-xl font-semibold hover:shadow-lg transition whitespace-nowrap"
            >
              ➕ Add Checklist
            </motion.button>
          </div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-[#f4d24a]/20 p-4 mb-6"
          >
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search checklists..."
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white placeholder-gray-500"
              />
              <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#f4d24a]/20 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-[#f4d24a] to-[#e5c33a]">
                    <th onClick={() => handleSort('id')} className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors">
                      <div className="flex items-center gap-2">
                        ID
                        {sortColumn === 'id' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('question')} className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors">
                      <div className="flex items-center gap-2">
                        Question/Task
                        {sortColumn === 'question' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('assignee')} className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors">
                      <div className="flex items-center gap-2">
                        Assignee
                        {sortColumn === 'assignee' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('doer_name')} className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors">
                      <div className="flex items-center gap-2">
                        Doer
                        {sortColumn === 'doer_name' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('priority')} className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors">
                      <div className="flex items-center gap-2">
                        Priority
                        {sortColumn === 'priority' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('department')} className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors">
                      <div className="flex items-center gap-2">
                        Department
                        {sortColumn === 'department' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('frequency')} className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors">
                      <div className="flex items-center gap-2">
                        Frequency
                        {sortColumn === 'frequency' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('due_date')} className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors">
                      <div className="flex items-center gap-2">
                        Due Date
                        {sortColumn === 'due_date' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('status')} className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors">
                      <div className="flex items-center gap-2">
                        Status
                        {sortColumn === 'status' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Verification</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f4d24a]/10 dark:divide-slate-700">
                  {paginatedChecklists.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#f4d24a] to-[#e5c33a] rounded-full flex items-center justify-center mb-4 text-3xl">
                            📋
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No checklists found</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first checklist to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedChecklists.map((checklist) => (
                      <motion.tr
                        key={checklist.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ backgroundColor: 'rgba(244, 210, 74, 0.05)' }}
                        className="transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                            #{checklist.id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                            {checklist.question}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getUserImage(checklist.assignee) ? (
                              <img src={getUserImage(checklist.assignee)!} alt={checklist.assignee} className="w-8 h-8 rounded-full object-cover border-2 border-[#f4d24a]" />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-br from-[#f4d24a] to-[#e5c33a] rounded-full flex items-center justify-center text-sm font-bold text-gray-900 shadow-md">
                                {checklist.assignee[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-gray-900 dark:text-white">{checklist.assignee}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {checklist.doer_name ? (
                            <div className="flex items-center gap-2">
                              {getUserImage(checklist.doer_name) ? (
                                <img src={getUserImage(checklist.doer_name)!} alt={checklist.doer_name} className="w-8 h-8 rounded-full object-cover border-2 border-[#f4d24a]" />
                              ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-[#f4d24a] to-[#e5c33a] rounded-full flex items-center justify-center text-sm font-bold text-gray-900 shadow-md">
                                  {checklist.doer_name[0]?.toUpperCase() || '?'}
                                </div>
                              )}
                              <span className="text-gray-900 dark:text-white">{checklist.doer_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(checklist.priority)}`}>
                            {checklist.priority?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {checklist.department || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            {checklist.frequency}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900 dark:text-white font-medium">
                              {formatDateToLocalTimezone(checklist.due_date)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(checklist.status)}`}>
                            {checklist.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {checklist.verification_required ? (
                            <div className="text-sm">
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium mb-1">
                                ✓ Required
                              </span>
                              {checklist.verifier_name && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  By: {checklist.verifier_name}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">Not Required</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => openEditModal(checklist)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => openDeleteModal(checklist.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredChecklists.length > 0 && (
              <div className="px-6 py-4 border-t border-[#f4d24a]/20 bg-white/50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredChecklists.length)} of {filteredChecklists.length} checklists
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-[#f4d24a]/30 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f4d24a]/10 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </motion.button>
                    
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500 dark:text-gray-400">...</span>
                      ) : (
                        <motion.button
                          key={page}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentPage(page as number)}
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 font-bold border-[#f4d24a]'
                              : 'bg-white dark:bg-slate-700 border-[#f4d24a]/30 hover:bg-[#f4d24a]/10'
                          }`}
                        >
                          {page}
                        </motion.button>
                      )
                    ))}
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-[#f4d24a]/30 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f4d24a]/10 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Add Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] px-6 py-4 rounded-t-2xl">
                  <h2 className="text-2xl font-bold text-gray-900">✅ Add New Checklist</h2>
                  <p className="text-gray-700 text-sm mt-1">Tasks will be automatically generated based on frequency</p>
                </div>

                <form onSubmit={handleAddChecklist} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Question/Task *
                    </label>
                    <textarea
                      required
                      value={formData.question}
                      onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white"
                      rows={3}
                      placeholder="Enter the task or question..."
                    />
                  </div>

                  {/* Row 1: Assignee, Doer, Department */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="relative" ref={assigneeRef}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assignee *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={formData.assignee || assigneeSearch}
                          onChange={(e) => {
                            setAssigneeSearch(e.target.value);
                            setFormData({ ...formData, assignee: '' });
                            setShowAssigneeDropdown(true);
                          }}
                          onFocus={() => setShowAssigneeDropdown(true)}
                          placeholder="Search assignee..."
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white"
                        />
                        {showAssigneeDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {users.filter(u => u.username.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setFormData({ ...formData, assignee: u.username });
                                  setAssigneeSearch('');
                                  setShowAssigneeDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-[#f4d24a]/20 cursor-pointer text-gray-900 dark:text-white"
                              >
                                {u.username}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative" ref={doerRef}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Doer
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.doerName || doerSearch}
                          onChange={(e) => {
                            setDoerSearch(e.target.value);
                            setFormData({ ...formData, doerName: '' });
                            setShowDoerDropdown(true);
                          }}
                          onFocus={() => setShowDoerDropdown(true)}
                          placeholder="Search doer..."
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white"
                        />
                        {showDoerDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {users.filter(u => u.username.toLowerCase().includes(doerSearch.toLowerCase())).map(u => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setFormData({ ...formData, doerName: u.username });
                                  setDoerSearch('');
                                  setShowDoerDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-[#f4d24a]/20 cursor-pointer text-gray-900 dark:text-white"
                              >
                                {u.username}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative" ref={departmentRef}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.department || departmentSearch}
                          onChange={(e) => {
                            setDepartmentSearch(e.target.value);
                            setFormData({ ...formData, department: '' });
                            setShowDepartmentDropdown(true);
                          }}
                          onFocus={() => setShowDepartmentDropdown(true)}
                          placeholder="Search department..."
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white"
                        />
                        {showDepartmentDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {DEPARTMENTS.filter(d => d.toLowerCase().includes(departmentSearch.toLowerCase())).map(d => (
                              <div
                                key={d}
                                onClick={() => {
                                  setFormData({ ...formData, department: d });
                                  setDepartmentSearch('');
                                  setShowDepartmentDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-[#f4d24a]/20 cursor-pointer text-gray-900 dark:text-white"
                              >
                                {d}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority *
                    </label>
                    <div className="flex gap-2">
                      {PRIORITIES.map(p => (
                        <motion.button
                          key={p.value}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setFormData({ ...formData, priority: p.value })}
                          className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition ${
                            formData.priority === p.value
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                              : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:border-blue-500'
                          }`}
                        >
                          {p.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Frequency *
                    </label>
                      <div className="grid grid-cols-5 gap-2">
                        {FREQUENCIES.map(f => (
                          <motion.button
                            key={f.value}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setFormData({ ...formData, frequency: f.value })}
                            className={`px-3 py-2.5 rounded-xl font-medium text-sm transition ${
                              formData.frequency === f.value
                                ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 shadow-md'
                                : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:border-[#f4d24a]'
                            }`}
                          >
                            {f.label}
                          </motion.button>
                        ))}
                      </div>
                  </div>

                  {/* Weekly Days Selection - Shows when frequency is weekly */}
                  {formData.frequency === 'weekly' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Days *
                      </label>
                      <div className="flex gap-3 justify-center">
                        {['M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                          const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                          const isSelected = selectedWeekDays.includes(index);
                          return (
                            <motion.button
                              key={index}
                              type="button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                const newDays = isSelected
                                  ? selectedWeekDays.filter(d => d !== index)
                                  : [...selectedWeekDays, index].sort();
                                setSelectedWeekDays(newDays);
                                setFormData({ ...formData, weeklyDays: newDays });
                              }}
                              className={`w-12 h-12 rounded-full font-bold text-sm transition-all ${
                                isSelected
                                  ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 shadow-lg'
                                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-slate-600 hover:border-[#f4d24a]'
                              }`}
                              title={dayNames[index]}
                            >
                              {day}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Row 4: From Date & Time */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly' 
                        ? `Select Dates * ${selectedMultipleDates.length > 0 ? `(${selectedMultipleDates.length} selected)` : ''}`
                        : 'From Date & Time *'
                      }
                    </label>
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-[#fffef7] to-[#fff9e6] dark:bg-slate-700 border-2 border-[#f4d24a]/50 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white font-medium shadow-sm text-left flex items-center justify-between"
                      >
                        <span>
                          {formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly'
                            ? (selectedMultipleDates.length > 0 
                                ? `Selected dates: ${selectedMultipleDates.map(d => new Date(d).getDate()).join(', ')}`
                                : 'Click to select dates')
                            : (formData.fromDateTime ? formatDateForInput(formData.fromDateTime) : 'Select date & time')
                          }
                        </span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>

                      {/* Custom Date Time Picker */}
                      <AnimatePresence>
                        {showDatePicker && (
                          <>
                            {/* Backdrop */}
                            <motion.div
                              className="fixed inset-0 bg-black/50 z-40"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => setShowDatePicker(false)}
                            />

                            {/* Modal */}
                            <motion.div
                              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 flex gap-6"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                            >
                              {/* Calendar */}
                              <div className="w-80">
                                <div className="flex items-center justify-between mb-3">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                                    className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                  </button>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                                    className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                    <div key={day} className="font-semibold text-gray-600 dark:text-gray-400">{day}</div>
                                  ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                  {Array.from({ length: getFirstDayOfMonth(selectedDate) }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                  ))}
                                  {Array.from({ length: getDaysInMonth(selectedDate) }).map((_, i) => {
                                    const day = i + 1;
                                    const isMultiSelect = formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly';
                                    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const isSelected = isMultiSelect 
                                      ? selectedMultipleDates.includes(dateStr)
                                      : selectedDate.getDate() === day;
                                    
                                    return (
                                      <button
                                        key={day}
                                        type="button"
                                        onClick={() => {
                                          if (isMultiSelect) {
                                            // Multiple date selection for monthly/quarterly/yearly
                                            const newDates = isSelected
                                              ? selectedMultipleDates.filter(d => d !== dateStr)
                                              : [...selectedMultipleDates, dateStr].sort();
                                            setSelectedMultipleDates(newDates);
                                            setFormData({ ...formData, selectedDates: newDates });
                                          } else {
                                            // Single date selection for daily/weekly
                                            const newDate = new Date(selectedDate);
                                            newDate.setDate(day);
                                            setSelectedDate(newDate);
                                          }
                                        }}
                                        className={`p-2 text-sm rounded-lg transition ${isSelected
                                          ? 'bg-[#f4d24a] text-gray-900 font-bold'
                                          : 'hover:bg-[#f5f1e8] dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                          }`}
                                      >
                                        {day}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Clock Time Picker - For all frequencies */}
                              <div className="w-80 border-l border-gray-200 dark:border-gray-700 pl-6">
                                <div className="text-center mb-3">
                                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
                                  </span>
                                </div>

                                <div className="flex gap-3 justify-center mb-3">
                                  {/* Hour Selector */}
                                  <div className="flex flex-col items-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedHour(selectedHour === 12 ? 1 : selectedHour + 1)}
                                      className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    </button>
                                    <div className="w-16 h-16 flex items-center justify-center bg-[#f5f1e8] dark:bg-gray-700 rounded-lg my-2">
                                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedHour.toString().padStart(2, '0')}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedHour(selectedHour === 1 ? 12 : selectedHour - 1)}
                                      className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                  </div>

                                  <span className="text-3xl font-bold text-gray-900 dark:text-white self-center">:</span>

                                  {/* Minute Selector */}
                                  <div className="flex flex-col items-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedMinute((selectedMinute + 15) % 60)}
                                      className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    </button>
                                    <div className="w-16 h-16 flex items-center justify-center bg-[#f5f1e8] dark:bg-gray-700 rounded-lg my-2">
                                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedMinute.toString().padStart(2, '0')}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedMinute(selectedMinute === 0 ? 45 : selectedMinute - 15)}
                                      className="p-1 hover:bg-[#f5f1e8] dark:hover:bg-gray-700 rounded"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                  </div>

                                  {/* AM/PM Selector */}
                                  <div className="flex flex-col items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPeriod('AM')}
                                      className={`px-3 py-2 rounded-lg font-semibold text-sm mb-1 ${selectedPeriod === 'AM' ? 'bg-[#f4d24a] text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                      AM
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPeriod('PM')}
                                      className={`px-3 py-2 rounded-lg font-semibold text-sm ${selectedPeriod === 'PM' ? 'bg-[#f4d24a] text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                      PM
                                    </button>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') ? (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMultipleDates([]);
                                        setFormData({ ...formData, selectedDates: [] });
                                      }}
                                      className="flex-1 px-3 py-2 bg-gray-200 dark:bg-slate-600 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-slate-500"
                                    >
                                      Clear Dates
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (selectedMultipleDates.length > 0) {
                                          // Set the time from the first selected date
                                          const hour24 = selectedPeriod === 'PM' && selectedHour !== 12
                                            ? selectedHour + 12
                                            : selectedPeriod === 'AM' && selectedHour === 12
                                              ? 0
                                              : selectedHour;
                                          const dateTime = new Date(selectedDate);
                                          dateTime.setHours(hour24, selectedMinute, 0, 0);
                                          // Subtract 5 hours 30 minutes to convert IST to UTC
                                          dateTime.setMinutes(dateTime.getMinutes() - 330);
                                          setFormData({
                                            ...formData,
                                            fromDateTime: dateTime.toISOString()
                                          });
                                        }
                                        setShowDatePicker(false);
                                      }}
                                      className="flex-1 px-3 py-2 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] rounded-lg text-sm font-semibold"
                                    >
                                      Done
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleDateTimeSet}
                                    className="w-full py-2 bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 font-semibold rounded-lg transition mt-4"
                                  >
                                    Set Date & Time
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                  </div>

                  {/* Row 5: Verification & Attachment */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#fffef7] to-[#fff9e6] dark:bg-slate-700/50 rounded-xl border border-[#f4d24a]/30">
                      <label htmlFor="verificationRequired" className="text-sm font-medium text-gray-900 dark:text-gray-300">
                        ✓ Verification Required
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, verificationRequired: !formData.verificationRequired })}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                          formData.verificationRequired ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a]' : 'bg-gray-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                            formData.verificationRequired ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#fffef7] to-[#fff9e6] dark:bg-slate-700/50 rounded-xl border border-[#f4d24a]/30">
                      <label htmlFor="attachmentRequired" className="text-sm font-medium text-gray-900 dark:text-gray-300">
                        📎 Task Attachment Required
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, attachmentRequired: !formData.attachmentRequired })}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                          formData.attachmentRequired ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a]' : 'bg-gray-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                            formData.attachmentRequired ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Verifier Name - Shows when Verification is Required */}
                  {formData.verificationRequired && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative"
                    >
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Verifier Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.verifierName || verifierSearch}
                          onChange={(e) => {
                            setVerifierSearch(e.target.value);
                            setFormData({ ...formData, verifierName: '' });
                            setShowVerifierDropdown(true);
                          }}
                          onFocus={() => setShowVerifierDropdown(true)}
                          placeholder="Search verifier..."
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white"
                        />
                        {showVerifierDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {users.filter(u => u.username.toLowerCase().includes(verifierSearch.toLowerCase())).map(u => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setFormData({ ...formData, verifierName: u.username });
                                  setVerifierSearch('');
                                  setShowVerifierDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-[#f4d24a]/20 cursor-pointer text-gray-900 dark:text-white"
                              >
                                {u.username}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition"
                    >
                      Create Checklist
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        resetForm();
                      }}
                      className="px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-slate-600 transition"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Modal - Similar structure to Add Modal */}
        <AnimatePresence>
          {showEditModal && editingChecklist && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowEditModal(false);
                setEditingChecklist(null);
                resetForm();
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] px-6 py-4 rounded-t-2xl">
                  <h2 className="text-2xl font-bold text-gray-900">✏️ Edit Checklist</h2>
                  <p className="text-gray-700 text-sm mt-1">Update checklist details</p>
                </div>

                <form onSubmit={handleEditChecklist} className="p-6 space-y-4">
                  {/* Same form fields as Add Modal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Question/Task *
                    </label>
                    <textarea
                      required
                      value={formData.question}
                      onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white"
                      rows={3}
                    />
                  </div>

                  {/* Row 1: Assignee, Doer, Department */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="relative" ref={assigneeRef}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assignee *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={formData.assignee || assigneeSearch}
                          onChange={(e) => {
                            setAssigneeSearch(e.target.value);
                            setFormData({ ...formData, assignee: '' });
                            setShowAssigneeDropdown(true);
                          }}
                          onFocus={() => setShowAssigneeDropdown(true)}
                          placeholder="Search assignee..."
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white"
                        />
                        {showAssigneeDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {users.filter(u => u.username.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setFormData({ ...formData, assignee: u.username });
                                  setAssigneeSearch('');
                                  setShowAssigneeDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-[#f4d24a]/20 cursor-pointer text-gray-900 dark:text-white"
                              >
                                {u.username}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative" ref={doerRef}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Doer
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.doerName || doerSearch}
                          onChange={(e) => {
                            setDoerSearch(e.target.value);
                            setFormData({ ...formData, doerName: '' });
                            setShowDoerDropdown(true);
                          }}
                          onFocus={() => setShowDoerDropdown(true)}
                          placeholder="Search doer..."
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white"
                        />
                        {showDoerDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {users.filter(u => u.username.toLowerCase().includes(doerSearch.toLowerCase())).map(u => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setFormData({ ...formData, doerName: u.username });
                                  setDoerSearch('');
                                  setShowDoerDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-[#f4d24a]/20 cursor-pointer text-gray-900 dark:text-white"
                              >
                                {u.username}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative" ref={departmentRef}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.department || departmentSearch}
                          onChange={(e) => {
                            setDepartmentSearch(e.target.value);
                            setFormData({ ...formData, department: '' });
                            setShowDepartmentDropdown(true);
                          }}
                          onFocus={() => setShowDepartmentDropdown(true)}
                          placeholder="Search department..."
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white"
                        />
                        {showDepartmentDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {DEPARTMENTS.filter(d => d.toLowerCase().includes(departmentSearch.toLowerCase())).map(d => (
                              <div
                                key={d}
                                onClick={() => {
                                  setFormData({ ...formData, department: d });
                                  setDepartmentSearch('');
                                  setShowDepartmentDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-[#f4d24a]/20 cursor-pointer text-gray-900 dark:text-white"
                              >
                                {d}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority *
                    </label>
                    <div className="flex gap-2">
                      {PRIORITIES.map(p => (
                        <motion.button
                          key={p.value}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setFormData({ ...formData, priority: p.value })}
                          className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition ${
                            formData.priority === p.value
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                              : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:border-blue-500'
                          }`}
                        >
                          {p.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Frequency *
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {FREQUENCIES.map(f => (
                        <motion.button
                          key={f.value}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setFormData({ ...formData, frequency: f.value })}
                          className={`px-3 py-2.5 rounded-xl font-medium text-sm transition ${
                            formData.frequency === f.value
                              ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 shadow-md'
                              : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:border-[#f4d24a]'
                          }`}
                        >
                          {f.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Weekly Days Selection - Shows when frequency is weekly */}
                  {formData.frequency === 'weekly' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Days *
                      </label>
                      <div className="flex gap-3 justify-center">
                        {['M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                          const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                          const isSelected = selectedWeekDays.includes(index);
                          return (
                            <motion.button
                              key={index}
                              type="button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                const newDays = isSelected
                                  ? selectedWeekDays.filter(d => d !== index)
                                  : [...selectedWeekDays, index].sort();
                                setSelectedWeekDays(newDays);
                                setFormData({ ...formData, weeklyDays: newDays });
                              }}
                              className={`w-12 h-12 rounded-full font-bold text-sm transition-all ${
                                isSelected
                                  ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 shadow-lg'
                                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-slate-600 hover:border-[#f4d24a]'
                              }`}
                              title={dayNames[index]}
                            >
                              {day}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Multiple Dates Selection - Shows when frequency is monthly/quarterly/yearly */}
                  {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Dates * {selectedMultipleDates.length > 0 && `(${selectedMultipleDates.length} selected)`}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowMultipleDatePicker(!showMultipleDatePicker)}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-[#fffef7] to-[#fff9e6] dark:bg-slate-700 border-2 border-[#f4d24a]/50 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white font-medium shadow-sm text-left"
                      >
                        {selectedMultipleDates.length > 0 
                          ? `Selected: ${selectedMultipleDates.map(d => new Date(d).getDate()).join(', ')}`
                          : 'Click to select dates'
                        }
                      </button>

                      {/* Multiple Date Picker Modal */}
                      {showMultipleDatePicker && (
                        <div className="mt-2 p-4 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl shadow-lg">
                          <div className="flex items-center justify-between mb-4">
                            <button
                              type="button"
                              onClick={() => {
                                const newDate = new Date(multipleDatePickerDate);
                                newDate.setMonth(newDate.getMonth() - 1);
                                setMultipleDatePickerDate(newDate);
                              }}
                              className="px-3 py-1 bg-gray-200 dark:bg-slate-600 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500"
                            >
                              ←
                            </button>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {multipleDatePickerDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newDate = new Date(multipleDatePickerDate);
                                newDate.setMonth(newDate.getMonth() + 1);
                                setMultipleDatePickerDate(newDate);
                              }}
                              className="px-3 py-1 bg-gray-200 dark:bg-slate-600 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500"
                            >
                              →
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-7 gap-1">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-1">
                                {day}
                              </div>
                            ))}
                            {Array.from({ length: getFirstDayOfMonth(multipleDatePickerDate) }).map((_, i) => (
                              <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: getDaysInMonth(multipleDatePickerDate) }).map((_, i) => {
                              const day = i + 1;
                              const dateStr = `${multipleDatePickerDate.getFullYear()}-${String(multipleDatePickerDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const isSelected = selectedMultipleDates.includes(dateStr);
                              
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    const newDates = isSelected
                                      ? selectedMultipleDates.filter(d => d !== dateStr)
                                      : [...selectedMultipleDates, dateStr].sort();
                                    setSelectedMultipleDates(newDates);
                                    setFormData({ ...formData, selectedDates: newDates });
                                  }}
                                  className={`py-2 rounded-lg text-sm transition ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 font-bold'
                                      : 'hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                          
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMultipleDates([]);
                                setFormData({ ...formData, selectedDates: [] });
                              }}
                              className="flex-1 px-3 py-2 bg-gray-200 dark:bg-slate-600 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-slate-500"
                            >
                              Clear All
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowMultipleDatePicker(false)}
                              className="flex-1 px-3 py-2 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] rounded-lg text-sm font-semibold"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Row 5: Verification & Attachment */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#fffef7] to-[#fff9e6] dark:bg-slate-700/50 rounded-xl border border-[#f4d24a]/30">
                      <label htmlFor="editVerificationRequired" className="text-sm font-medium text-gray-900 dark:text-gray-300">
                        ✓ Verification Required
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, verificationRequired: !formData.verificationRequired })}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                          formData.verificationRequired ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a]' : 'bg-gray-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                            formData.verificationRequired ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#fffef7] to-[#fff9e6] dark:bg-slate-700/50 rounded-xl border border-[#f4d24a]/30">
                      <label htmlFor="editAttachmentRequired" className="text-sm font-medium text-gray-900 dark:text-gray-300">
                        📎 Task Attachment Required
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, attachmentRequired: !formData.attachmentRequired })}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                          formData.attachmentRequired ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a]' : 'bg-gray-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                            formData.attachmentRequired ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Verifier Name (conditional) */}
                  {formData.verificationRequired && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative"
                    >
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Verifier Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.verifierName || verifierSearch}
                          onChange={(e) => {
                            setVerifierSearch(e.target.value);
                            setFormData({ ...formData, verifierName: '' });
                            setShowVerifierDropdown(true);
                          }}
                          onFocus={() => setShowVerifierDropdown(true)}
                          placeholder="Search verifier..."
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white"
                        />
                        {showVerifierDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {users.filter(u => u.username.toLowerCase().includes(verifierSearch.toLowerCase())).map(u => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setFormData({ ...formData, verifierName: u.username });
                                  setVerifierSearch('');
                                  setShowVerifierDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-[#f4d24a]/20 cursor-pointer text-gray-900 dark:text-white"
                              >
                                {u.username}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition"
                    >
                      Update Checklist
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingChecklist(null);
                        resetForm();
                      }}
                      className="px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-slate-600 transition"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteId(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
              >
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                  Delete Checklist
                </h3>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete this checklist? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeleteChecklist}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition"
                  >
                    Delete
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteId(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-slate-600 transition"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutWrapper>
  );
}
