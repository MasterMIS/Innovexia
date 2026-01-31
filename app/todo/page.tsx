'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ensureSessionId, sessionHeader } from '@/utils/session';
import LayoutWrapper from '@/components/LayoutWrapper';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';

interface Todo {
  id: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'on-hold' | 'done';
  category: 'inbox' | 'important' | 'trash';
  is_important: boolean;
  assigned_to: string;
  user_id: number;
  username: string;
  image_url?: string;
  created_at: string;
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
};

const STATUS_COLORS = {
  'pending': 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  'on-hold': 'bg-orange-100 text-orange-800',
  'done': 'bg-green-100 text-green-800',
};

const ICON_MAP = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

interface User {
  id: number;
  username: string;
  email: string;
  image_url?: string;
}

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'done' | 'important' | 'trash'>('inbox');
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [selectedTodos, setSelectedTodos] = useState<Set<number>>(new Set());
  const [openStatusDropdown, setOpenStatusDropdown] = useState<number | null>(null);
  const [assignedToSearch, setAssignedToSearch] = useState('');
  const [showAssignedToDropdown, setShowAssignedToDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    assigned_to: '',
  });

  const toast = useToast();
  const loader = useLoader();

  const ITEMS_PER_PAGE = 10;

  // Helper function to create notification for a user
  const createNotificationForUser = async (username: string, type: string, title: string, message: string, todoId?: number) => {
    try {
      const usersResponse = await fetch('/api/users', { headers: sessionHeader() });
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        const users = data.users || [];
        const targetUser = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
        if (targetUser) {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...sessionHeader() },
            body: JSON.stringify({
              user_id: targetUser.id,
              user_role: targetUser.role_name || 'Doer',
              type,
              title,
              message,
              delegation_id: todoId,
            }),
          });
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Fetch todos
  const fetchTodos = async () => {
    try {
      loader.showLoader();
      const response = await fetch('/api/todos', {
        headers: sessionHeader(),
      });
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      } else {
        toast.error('Failed to fetch todos');
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast.error('An error occurred while fetching todos');
    } finally {
      setLoading(false);
      loader.hideLoader();
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: sessionHeader(),
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Users fetched:', data); // Debug log
        // API returns { users: [...] }
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        } else if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error('Users data is not in expected format:', data);
          setUsers([]);
        }
      } else {
        console.error('Failed to fetch users, status:', response.status);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const sessionId = ensureSessionId();
        const response = await fetch('/api/auth', { headers: { 'x-session-id': sessionId } });
        const data = await response.json();
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
    fetchTodos();
    fetchUsers();

    // Setup polling for auto-refresh
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTodos();
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openStatusDropdown !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.status-dropdown-container')) {
          setOpenStatusDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openStatusDropdown]);

  // Filter and sort todos
  const filteredTodos = useMemo(() => {
    let result = todos;

    // Filter by category/tab
    if (activeTab === 'done') {
      result = result.filter((t) => t.status === 'done');
    } else if (activeTab === 'important') {
      result = result.filter((t) => t.is_important);
    } else if (activeTab === 'trash') {
      result = result.filter((t) => t.category === 'trash');
    } else {
      result = result.filter((t) => t.category === 'inbox' && t.status !== 'done');
    }

    // Filter by priority
    if (selectedPriority) {
      result = result.filter((t) => t.priority === selectedPriority);
    }

    // Filter by status
    if (selectedStatus) {
      result = result.filter((t) => t.status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [todos, activeTab, selectedPriority, selectedStatus, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredTodos.length / ITEMS_PER_PAGE);
  const paginatedTodos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTodos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTodos, currentPage]);

  // Save todo
  const handleSaveTodo = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    try {
      loader.showLoader();
      const userId = 1; // Get from auth context or session
      const method = editingTodo ? 'PUT' : 'POST';
      const body = editingTodo
        ? {
          id: editingTodo.id,
          ...formData,
        }
        : {
          ...formData,
          user_id: userId,
        };

      const response = await fetch('/api/todos', {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...sessionHeader(),
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const isUpdate = !!editingTodo;
        const actionType = isUpdate ? 'todo_updated' : 'todo_created';
        const actionTitle = isUpdate ? 'Todo Updated' : 'New Todo Created';
        const actionMessage = isUpdate
          ? `${currentUser?.username || 'Someone'} updated todo "${formData.title}"`
          : `${currentUser?.username || 'Someone'} created a new todo "${formData.title}"`;

        // Send notification to assigned user if exists and different from current user
        if (formData.assigned_to && formData.assigned_to !== currentUser?.username) {
          await createNotificationForUser(formData.assigned_to, actionType, actionTitle, actionMessage);
        }

        setShowAddModal(false);
        setEditingTodo(null);
        setFormData({ title: '', description: '', priority: 'medium', status: 'pending', assigned_to: '' });
        await fetchTodos();
        toast.success(editingTodo ? 'Task updated successfully' : 'Task created successfully');
      } else {
        toast.error('Failed to save task');
      }
    } catch (error) {
      console.error('Error saving todo:', error);
      toast.error('An error occurred while saving the task');
    } finally {
      loader.hideLoader();
    }
  };

  // Edit todo
  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      status: todo.status,
      assigned_to: todo.assigned_to,
    });
    setShowAddModal(true);
  };

  // Delete todo
  const handleDelete = async (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  // Toggle important
  const handleToggleImportant = async (todo: Todo) => {
    try {
      loader.showLoader();
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...sessionHeader(),
        },
        body: JSON.stringify({
          id: todo.id,
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          status: todo.status,
          category: todo.category,
          is_important: !todo.is_important,
          assigned_to: todo.assigned_to,
        }),
      });
      if (response.ok) {
        // Send notification to assigned user if marking as important
        if (!todo.is_important && todo.assigned_to && todo.assigned_to !== currentUser?.username) {
          await createNotificationForUser(
            todo.assigned_to,
            'todo_marked_important',
            'Todo Marked as Important',
            `${currentUser?.username || 'Someone'} marked "${todo.title}" as important`,
            todo.id
          );
        }

        await fetchTodos();
        toast.success(todo.is_important ? 'Removed from important' : 'Marked as important');
      } else {
        toast.error('Failed to update task');
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('An error occurred while updating the task');
    } finally {
      loader.hideLoader();
    }
  };

  // Quick status update
  const handleStatusChange = async (todo: Todo, newStatus: string) => {
    try {
      loader.showLoader();
      setOpenStatusDropdown(null);
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...sessionHeader(),
        },
        body: JSON.stringify({
          id: todo.id,
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          status: newStatus,
          category: todo.category,
          is_important: todo.is_important,
          assigned_to: todo.assigned_to,
        }),
      });
      if (response.ok) {
        // Send notification to assigned user
        if (todo.assigned_to && todo.assigned_to !== currentUser?.username) {
          await createNotificationForUser(
            todo.assigned_to,
            'todo_status_changed',
            'Todo Status Changed',
            `${currentUser?.username || 'Someone'} changed status of "${todo.title}" to ${newStatus.replace('-', ' ')}`,
            todo.id
          );
        }

        await fetchTodos();
        toast.success(`Status updated to ${newStatus.replace('-', ' ')}`);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('An error occurred while updating status');
    } finally {
      loader.hideLoader();
    }
  };

  // Toggle checkbox
  const handleToggleCheckbox = (id: number) => {
    const newSelected = new Set(selectedTodos);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTodos(newSelected);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedTodos.size === 0) return;
    setDeleteId(-1); // Use -1 for bulk delete
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;

    // Bulk delete
    if (deleteId === -1) {
      const ids = Array.from(selectedTodos);
      try {
        loader.showLoader();
        for (const id of ids) {
          const todo = todos.find(t => t.id === id);
          await fetch(`/api/todos?id=${id}`, {
            method: 'DELETE',
            headers: sessionHeader(),
          });
          // Notify assigned user
          if (todo && todo.assigned_to && todo.assigned_to !== currentUser?.username) {
            await createNotificationForUser(
              todo.assigned_to,
              'todo_deleted',
              'Todo Deleted',
              `${currentUser?.username || 'Someone'} deleted todo "${todo.title}"`,
              todo.id
            );
          }
        }
        setSelectedTodos(new Set());
        await fetchTodos();
        toast.success(`${ids.length} tasks deleted successfully`);
      } catch (error) {
        console.error('Error deleting todos:', error);
        toast.error('An error occurred while deleting tasks');
      } finally {
        loader.hideLoader();
        setShowDeleteModal(false);
        setDeleteId(null);
      }
      return;
    }

    // Single delete
    try {
      loader.showLoader();
      const todo = todos.find(t => t.id === deleteId);
      const response = await fetch(`/api/todos?id=${deleteId}`, {
        method: 'DELETE',
        headers: sessionHeader(),
      });
      if (response.ok) {
        // Notify assigned user
        if (todo && todo.assigned_to && todo.assigned_to !== currentUser?.username) {
          await createNotificationForUser(
            todo.assigned_to,
            'todo_deleted',
            'Todo Deleted',
            `${currentUser?.username || 'Someone'} deleted todo "${todo.title}"`,
            todo.id
          );
        }
        await fetchTodos();
        toast.success('Task deleted successfully');
      } else {
        toast.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('An error occurred while deleting the task');
    } finally {
      loader.hideLoader();
      setShowDeleteModal(false);
      setDeleteId(null);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingTodo(null);
    setFormData({ title: '', description: '', priority: 'medium', status: 'pending', assigned_to: '' });
    setAssignedToSearch('');
    setShowAssignedToDropdown(false);
  };

  const renderSidebarContent = () => (
    <>
      {/* Categories */}
      <div className="mb-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Categories
        </h3>
        <nav className="space-y-2">
          {[
            { id: 'inbox', label: 'Inbox', icon: '📥', color: 'purple' },
            { id: 'done', label: 'Done', icon: '✅', color: 'green' },
            { id: 'important', label: 'Important', icon: '⭐', color: 'yellow' },
            { id: 'trash', label: 'Trash', icon: '🗑️', color: 'red' },
          ].map((cat) => (
            <motion.button
              key={cat.id}
              onClick={() => {
                setActiveTab(cat.id as any);
                setCurrentPage(1);
                setSelectedPriority(null);
                setSelectedStatus(null);
                setShowMobileSidebar(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all text-sm md:text-base ${activeTab === cat.id
                ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 shadow-md'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-lg mr-2">{cat.icon}</span>
              {cat.label}
            </motion.button>
          ))}
        </nav>
      </div>

      {/* Tags */}
      <div className="mb-6 pb-6 border-b dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm md:text-base">Tags</h4>
        <div className="space-y-2">
          {[
            { value: 'pending', label: 'Pending', color: 'blue' },
            { value: 'in-progress', label: 'In Progress', color: 'yellow' },
            { value: 'on-hold', label: 'On Hold', color: 'orange' },
            { value: 'done', label: 'Done', color: 'green' },
          ].map((tag) => (
            <motion.button
              key={tag.value}
              onClick={() => {
                setSelectedStatus(selectedStatus === tag.value ? null : tag.value);
                setCurrentPage(1);
                setShowMobileSidebar(false);
              }}
              className={`flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all ${selectedStatus === tag.value
                ? 'bg-[var(--theme-primary)] text-gray-900 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className={`w-2 h-2 rounded-full mr-2 ${selectedStatus === tag.value ? 'bg-gray-900' : 'bg-current'
                }`}></span>
              {tag.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm md:text-base">Priority</h4>
        <div className="space-y-2">
          {[
            { value: 'high', label: 'High', icon: '🔴' },
            { value: 'medium', label: 'Medium', icon: '🟡' },
            { value: 'low', label: 'Low', icon: '🟢' },
          ].map((pri) => (
            <motion.button
              key={pri.value}
              onClick={() => {
                setSelectedPriority(selectedPriority === pri.value ? null : pri.value);
                setCurrentPage(1);
                setShowMobileSidebar(false);
              }}
              className={`flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all ${selectedPriority === pri.value
                ? 'bg-[var(--theme-primary)] text-gray-900 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-lg mr-2">{pri.icon}</span>
              {pri.label}
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <LayoutWrapper>
      <motion.div
        className="min-h-screen bg-gradient-to-br from-[var(--theme-light)] via-[#fffef0] to-[var(--theme-lighter)] dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 p-4 space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] bg-clip-text text-transparent mb-2">
            Todo Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
            Organize and track your tasks efficiently
          </p>
        </motion.div>

        {/* Summary Statistics */}
        <motion.div
          className="overflow-x-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex gap-3 min-w-max pb-2">
            {/* Total Tasks */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 rounded-xl p-3 border border-slate-200 dark:border-slate-800 hover:shadow-md transition min-w-[150px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{filteredTodos.length}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total Tasks</p>
                </div>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800 hover:shadow-md transition min-w-[150px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{todos.filter(t => t.status === 'pending').length}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Pending</p>
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800 hover:shadow-md transition min-w-[150px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{todos.filter(t => t.status === 'in-progress').length}</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">In Progress</p>
                </div>
              </div>
            </div>

            {/* On Hold */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-3 border border-orange-200 dark:border-orange-800 hover:shadow-md transition min-w-[150px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{todos.filter(t => t.status === 'on-hold').length}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">On Hold</p>
                </div>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-3 border border-green-200 dark:border-green-800 hover:shadow-md transition min-w-[150px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{todos.filter(t => t.status === 'done').length}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Completed</p>
                </div>
              </div>
            </div>

            {/* Important */}
            <div className="bg-gradient-to-br from-[var(--theme-lighter)] to-[#fff4cc] dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-xl p-3 border border-[var(--theme-primary)] dark:border-yellow-700 hover:shadow-md transition min-w-[150px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-yellow-100">{todos.filter(t => t.is_important).length}</p>
                  <p className="text-xs text-gray-700 dark:text-yellow-400 font-medium">Important</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar */}
          <motion.div
            className="lg:col-span-1 hidden lg:block"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6 lg:sticky lg:top-6">
              {renderSidebarContent()}
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Toolbar */}
            <motion.div
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex-1 flex gap-2">
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="lg:hidden p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent shadow-sm"
                  />
                </div>
              </div>
              <motion.button
                onClick={() => {
                  setEditingTodo(null);
                  setFormData({ title: '', description: '', priority: 'medium', status: 'pending', assigned_to: '' });
                  setShowAddModal(true);
                }}
                className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] hover:from-[var(--theme-secondary)] hover:to-[var(--theme-tertiary)] text-gray-900 font-semibold py-2.5 px-6 rounded-xl shadow-md transition-all whitespace-nowrap"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="hidden sm:inline">+ Add Task</span>
                <span className="sm:hidden">+</span>
              </motion.button>
            </motion.div>

            {/* Filter tags */}
            {(selectedPriority || selectedStatus || searchTerm) && (
              <motion.div
                className="flex flex-wrap gap-2 mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {selectedPriority && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded-full text-sm font-medium">
                    Priority: {selectedPriority}
                    <button onClick={() => setSelectedPriority(null)} className="text-red-600 dark:text-red-400 hover:text-red-800 font-bold">✕</button>
                  </span>
                )}
                {selectedStatus && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-sm font-medium">
                    Status: {selectedStatus}
                    <button onClick={() => setSelectedStatus(null)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold">✕</button>
                  </span>
                )}
                {searchTerm && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-sm font-medium">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="text-green-600 dark:text-green-400 hover:text-green-800 font-bold">✕</button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedPriority(null);
                    setSelectedStatus(null);
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm underline font-medium"
                >
                  Clear All
                </button>
              </motion.div>
            )}

            {/* Bulk actions */}
            <AnimatePresence>
              {selectedTodos.size > 0 && (
                <motion.div
                  className="bg-gradient-to-r from-[var(--theme-primary)]/20 to-[var(--theme-secondary)]/20 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-[var(--theme-primary)] dark:border-yellow-700 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <span className="text-gray-900 dark:text-gray-100 font-semibold text-sm md:text-base">
                    {selectedTodos.size} task{selectedTodos.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTodos(new Set())}
                      className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      Delete Selected
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Todo list */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[var(--theme-primary)] border-t-transparent"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tasks...</p>
                </div>
              ) : paginatedTodos.length === 0 ? (
                <motion.div
                  className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-lg">No tasks found</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Create a new task to get started</p>
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                >
                  {paginatedTodos.map((todo) => (
                    <motion.div
                      key={todo.id}
                      className="bg-gradient-to-br from-white to-[var(--theme-light)] dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-[var(--theme-primary)] p-4 md:p-5"
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-start gap-3 md:gap-4">
                        <motion.input
                          type="checkbox"
                          checked={selectedTodos.has(todo.id)}
                          onChange={() => handleToggleCheckbox(todo.id)}
                          className="w-5 h-5 mt-1 rounded border-gray-300 text-[var(--theme-primary)] cursor-pointer focus:ring-[var(--theme-primary)]"
                          whileTap={{ scale: 0.9 }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white break-words">
                              {todo.title}
                            </h3>
                            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                              <motion.button
                                onClick={() => handleToggleImportant(todo)}
                                className={`transition-colors ${todo.is_important ? 'text-[var(--theme-primary)]' : 'text-gray-400 dark:text-gray-600 hover:text-[var(--theme-primary)]'
                                  }`}
                                whileHover={{ scale: 1.2, rotate: 15 }}
                                whileTap={{ scale: 0.9 }}
                                title={todo.is_important ? 'Remove from important' : 'Mark as important'}
                              >
                                {todo.is_important ? (
                                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                  </svg>
                                )}
                              </motion.button>
                              <motion.button
                                onClick={() => handleEdit(todo)}
                                className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Edit"
                              >
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </motion.button>
                              <motion.button
                                onClick={() => handleDelete(todo.id)}
                                className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Delete"
                              >
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </motion.button>
                            </div>
                          </div>
                          {todo.description && (
                            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-3 break-words">{todo.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[todo.priority]
                                } dark:opacity-90`}
                            >
                              {ICON_MAP[todo.priority]} {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                            </span>
                            <div className="relative status-dropdown-container">
                              <motion.button
                                onClick={() => setOpenStatusDropdown(openStatusDropdown === todo.id ? null : todo.id)}
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-80 ${STATUS_COLORS[todo.status]
                                  } dark:opacity-90`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="Click to change status"
                              >
                                {todo.status.charAt(0).toUpperCase() + todo.status.slice(1).replace('-', ' ')}
                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </motion.button>
                              <AnimatePresence>
                                {openStatusDropdown === todo.id && (
                                  <motion.div
                                    className="absolute left-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                  >
                                    {[
                                      { value: 'pending', label: 'Pending', color: 'blue' },
                                      { value: 'in-progress', label: 'In Progress', color: 'yellow' },
                                      { value: 'on-hold', label: 'On Hold', color: 'orange' },
                                      { value: 'done', label: 'Done', color: 'green' },
                                    ].map((status) => (
                                      <button
                                        key={status.value}
                                        onClick={() => handleStatusChange(todo, status.value)}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${todo.status === status.value ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                                          }`}
                                      >
                                        {status.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            {todo.assigned_to && (
                              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 gap-1.5">
                                {users.find(u => u.username === todo.assigned_to)?.image_url ? (
                                  <img src={`/api/image-proxy?url=${encodeURIComponent(users.find(u => u.username === todo.assigned_to)?.image_url!)}`} alt={todo.assigned_to} className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                  <div className="w-4 h-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                                    {todo.assigned_to[0]?.toUpperCase()}
                                  </div>
                                )}
                                {todo.assigned_to}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTodos.length)} of {filteredTodos.length} tasks
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                    whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
                    whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
                  >
                    ← Previous
                  </motion.button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 2 + i;
                      }
                      if (pageNum > totalPages) return null;
                      return (
                        <motion.button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                            ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 shadow-md'
                            : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {pageNum}
                        </motion.button>
                      );
                    })}
                  </div>
                  <motion.button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                    whileHover={currentPage !== totalPages ? { scale: 1.05 } : {}}
                    whileTap={currentPage !== totalPages ? { scale: 0.95 } : {}}
                  >
                    Next →
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            >
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-200 dark:border-gray-700"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {editingTodo ? 'Edit Task' : 'Add New Task'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                      placeholder="Enter task title"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent resize-none"
                      placeholder="Enter task description (optional)"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                      >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="on-hold">On Hold</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Assigned To
                    </label>
                    <input
                      type="text"
                      value={assignedToSearch || formData.assigned_to}
                      onChange={(e) => {
                        setAssignedToSearch(e.target.value);
                        setFormData({ ...formData, assigned_to: e.target.value });
                        setShowAssignedToDropdown(true);
                      }}
                      onFocus={() => {
                        setShowAssignedToDropdown(true);
                      }}
                      onBlur={() => {
                        // Delay to allow click on dropdown items
                        setTimeout(() => setShowAssignedToDropdown(false), 200);
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                      placeholder="Search or enter person name (optional)"
                    />
                    <AnimatePresence>
                      {showAssignedToDropdown && (
                        <motion.div
                          className="absolute left-0 right-0 z-[100] w-full mt-2 bg-white dark:bg-gray-800 border-2 border-[var(--theme-primary)] dark:border-[var(--theme-secondary)] rounded-xl shadow-2xl max-h-64 overflow-y-auto"
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                        >
                          {users.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No users found</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Check console for debug info</p>
                            </div>
                          ) : (
                            <>
                              {Array.isArray(users) && users
                                .filter((user) =>
                                  user.username.toLowerCase().includes((assignedToSearch || formData.assigned_to).toLowerCase())
                                )
                                .map((user) => (
                                  <button
                                    key={user.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setFormData({ ...formData, assigned_to: user.username });
                                      setAssignedToSearch('');
                                      setShowAssignedToDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-[var(--theme-primary)]/10 dark:hover:bg-[var(--theme-secondary)]/10 transition-colors first:rounded-t-xl last:rounded-b-xl border-b border-gray-100 dark:border-gray-700 last:border-0"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-gray-900">{user.username.charAt(0).toUpperCase()}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.username}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              {Array.isArray(users) && users.filter((user) =>
                                user.username.toLowerCase().includes((assignedToSearch || formData.assigned_to).toLowerCase())
                              ).length === 0 && (
                                  <div className="px-4 py-8 text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No matching users found</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try a different search term</p>
                                  </div>
                                )}
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <motion.button
                    onClick={closeModal}
                    className="flex-1 px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleSaveTodo}
                    className="flex-1 px-6 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] hover:from-[var(--theme-secondary)] hover:to-[var(--theme-tertiary)] text-gray-900 rounded-xl font-semibold transition-all shadow-md"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {editingTodo ? 'Update Task' : 'Create Task'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteId(null);
              }}
            >
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full border-2 border-red-500/20"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {deleteId === -1
                        ? `Are you sure you want to delete ${selectedTodos.size} tasks?`
                        : 'Are you sure you want to delete this task?'}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  This action cannot be undone. The {deleteId === -1 ? 'tasks' : 'task'} will be permanently removed from the system.
                </p>
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteId(null);
                    }}
                    className="flex-1 px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all shadow-md"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Delete {deleteId === -1 ? 'All' : ''}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            className="fixed inset-0 z-[100] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileSidebar(false)}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-[80%] max-w-sm bg-white dark:bg-gray-800 shadow-2xl p-6 overflow-y-auto"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filters & Menu</h2>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {renderSidebarContent()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutWrapper>
  );
}

