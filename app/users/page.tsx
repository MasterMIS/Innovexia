'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/LayoutWrapper';
import { TableToolbar } from '@/components/TableToolbar';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';

interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  phone: string;
  role_id: number;
  role_name?: string;
  image_url?: string;
  created_at: string;
}

interface SortConfig {
  key: keyof User;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  role_id?: string;
  search?: string;
}

const ITEMS_PER_PAGE = 10;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'username', direction: 'asc' });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    roleId: '1',
    imageUrl: '',
  });

  const { addToast } = useToast();
  const loader = useLoader();

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // Filter logic
  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (filterConfig.search) {
      const q = filterConfig.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    if (filterConfig.role_id) {
      result = result.filter((u) => u.role_id === parseInt(filterConfig.role_id!));
    }

    return result;
  }, [users, filterConfig]);

  // Sorting logic
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredUsers, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedUsers, currentPage]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return '';

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', imageFile);
      uploadFormData.append('type', 'user'); // Specify this is a user image

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      return '';
    } finally {
      setUploading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUserId && !formData.password) {
      // For edit mode without password change, allow empty password
    } else if (!editingUserId && !formData.password) {
      addToast('Password is required for new users', 'error');
      return;
    }

    try {
      loader.showLoader();
      let imageUrl = formData.imageUrl;
      if (imageFile) {
        imageUrl = await uploadImage();
        if (!imageUrl && imageFile) {
          loader.hideLoader();
          return;
        }
      }

      const payload = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        roleId: parseInt(formData.roleId),
        imageUrl: imageUrl,
        ...(formData.password && { password: formData.password }),
      };

      const method = editingUserId ? 'PUT' : 'POST';
      const body = editingUserId ? { ...payload, id: editingUserId } : payload;

      const response = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save user');

      resetForm();
      setShowModal(false);
      fetchUsers();
      setCurrentPage(1);
      addToast('User saved successfully', 'success');
    } catch (error) {
      addToast('Error saving user', 'error');
    } finally {
      loader.hideLoader();
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      phone: user.phone,
      roleId: String(user.role_id),
      imageUrl: user.image_url || '',
    });
    setImagePreview(user.image_url || '');
    setImageFile(null);
    setShowModal(true);
  };

  const handleDeleteUser = async (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      loader.showLoader();
      const response = await fetch(`/api/users?id=${deleteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
      fetchUsers();
      addToast('User deleted successfully', 'success');
    } catch (error) {
      addToast('Error deleting user', 'error');
    } finally {
      loader.hideLoader();
      setShowDeleteModal(false);
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setEditingUserId(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      phone: '',
      roleId: '1',
      imageUrl: '',
    });
    setImageFile(null);
    setImagePreview('');
  };

  const handleSort = (key: keyof User) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const togglePasswordVisibility = (userId: number) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const SortIcon = ({ column }: { column: keyof User }) => {
    if (sortConfig.key !== column) return <span className="text-gray-500">↕</span>;
    return <span className="text-gray-900 font-bold">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const getRoleBadgeColor = (roleName: string | undefined) => {
    switch (roleName?.toLowerCase()) {
      case 'admin':
        return 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-700 dark:text-red-400 border-red-500/30';
      case 'manager':
        return 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-700 dark:text-purple-400 border-purple-500/30';
      case 'employee':
        return 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-700 dark:text-blue-400 border-blue-500/30';
      default:
        return 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-700 dark:text-gray-400 border-gray-500/30';
    }
  };

  const tableColumns = [
    { key: 'username' as const, label: 'Username' },
    { key: 'email' as const, label: 'Email' },
    { key: 'phone' as const, label: 'Phone' },
    { key: 'role_name' as const, label: 'Role' },
  ];

  return (
    <LayoutWrapper>
      <motion.div
        className="p-4 space-y-4 min-h-screen bg-gradient-to-br from-[#fffef7] via-[#fff9e6] to-[#fffef7] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <motion.div
          className="flex justify-between items-center flex-wrap gap-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] bg-clip-text text-transparent">
              Users Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users and their roles</p>
          </div>
          <motion.button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] hover:from-[#e5c33a] hover:to-[#d6b42a] text-gray-900 font-semibold py-2.5 px-6 rounded-xl transition-all shadow-md"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            + Add New User
          </motion.button>
        </motion.div>

        {/* Filters & Export */}
        <motion.div
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-4 space-y-4 border border-[#f4d24a]/20"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-start flex-wrap gap-4">
            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              <input
                type="text"
                placeholder="Search username or email..."
                value={filterConfig.search || ''}
                onChange={(e) => {
                  setFilterConfig({ ...filterConfig, search: e.target.value });
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent outline-none text-sm shadow-sm"
              />

              <select
                value={filterConfig.role_id || ''}
                onChange={(e) => {
                  setFilterConfig({ ...filterConfig, role_id: e.target.value || undefined });
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#f4d24a] outline-none text-sm shadow-sm"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role_name}
                  </option>
                ))}
              </select>

              <motion.button
                onClick={() => {
                  setFilterConfig({});
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded-xl transition shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Clear Filters
              </motion.button>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-3">
              <TableToolbar data={sortedUsers} fileName="users" columns={tableColumns} />
            </div>
          </div>

          {/* Summary */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {paginatedUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, sortedUsers.length)} of {sortedUsers.length} users
          </p>
        </motion.div>

        {/* Users Table */}
        <motion.div
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-[#f4d24a]/20"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#f4d24a] border-r-transparent"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
            </div>
          ) : sortedUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No users found</p>
              <motion.button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="text-[#e5c33a] dark:text-[#f4d24a] hover:underline font-semibold"
                whileHover={{ scale: 1.05 }}
              >
                Create your first user
              </motion.button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] border-b-2 border-[#d6b42a]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors" onClick={() => handleSort('username')}>
                      <div className="flex items-center gap-2">Username <SortIcon column="username" /></div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors" onClick={() => handleSort('email')}>
                      <div className="flex items-center gap-2">Email <SortIcon column="email" /></div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[#e5c33a] transition-colors" onClick={() => handleSort('phone')}>
                      <div className="flex items-center gap-2">Phone <SortIcon column="phone" /></div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Password</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      className="hover:bg-[#f4d24a]/10 dark:hover:bg-[#e5c33a]/10 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.image_url ? (
                            <img src={user.image_url} alt={user.username} className="w-10 h-10 rounded-full object-cover border-2 border-[#f4d24a]" />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-[#f4d24a] to-[#e5c33a] rounded-full flex items-center justify-center text-sm font-bold text-gray-900 shadow-md">
                              {user.username[0].toUpperCase()}
                            </div>
                          )}
                          <span className="text-gray-900 dark:text-white font-semibold">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{user.email}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{user.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400 text-sm font-mono">
                            {visiblePasswords.has(user.id) ? user.password : '••••••••'}
                          </span>
                          <motion.button
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title={visiblePasswords.has(user.id) ? 'Hide password' : 'Show password'}
                          >
                            {visiblePasswords.has(user.id) ? (
                              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </motion.button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 ${getRoleBadgeColor(user.role_name)} border rounded-full text-sm font-semibold`}>
                          {user.role_name || 'Employee'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => handleEditUser(user)}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors border border-blue-500/30"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Edit user"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </motion.button>
                          <motion.button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors border border-red-500/30"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Delete user"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-4 flex items-center justify-center gap-2 flex-wrap border border-[#f4d24a]/20"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white rounded-xl transition font-semibold shadow-sm"
              whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
              whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
            >
              Previous
            </motion.button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <motion.button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-xl transition font-semibold shadow-sm ${
                  currentPage === page
                    ? 'bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {page}
              </motion.button>
            ))}

            <motion.button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white rounded-xl transition font-semibold shadow-sm"
              whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
              whileTap={{ scale: currentPage === totalPages ? 1 : 0.95 }}
            >
              Next
            </motion.button>
          </motion.div>
        )}

        {/* User Form Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                resetForm();
                setShowModal(false);
              }}
            >
              <motion.div
                className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-[#f4d24a]/30"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] bg-clip-text text-transparent mb-4">
                  {editingUserId ? 'Edit User' : 'Add New User'}
                </h3>

                <form onSubmit={handleSaveUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent shadow-sm"
                      required
                      disabled={editingUserId ? true : false}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent shadow-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Password {editingUserId ? '(leave blank to keep current)' : '*'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent shadow-sm"
                      required={!editingUserId}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Profile Picture
                    </label>
                    <div className="flex items-center gap-4">
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#f4d24a]"
                        />
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#f4d24a]/20 file:text-gray-900 hover:file:bg-[#f4d24a]/30 file:cursor-pointer cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Role *
                    </label>
                    <select
                      value={formData.roleId}
                      onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#f4d24a] focus:border-transparent shadow-sm"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.role_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <motion.button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setShowModal(false);
                      }}
                      className="flex-1 px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={uploading}
                      className="flex-1 px-6 py-2.5 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] hover:from-[#e5c33a] hover:to-[#d6b42a] text-gray-900 rounded-xl font-semibold transition-all shadow-md disabled:opacity-50"
                      whileHover={{ scale: uploading ? 1 : 1.02 }}
                      whileTap={{ scale: uploading ? 1 : 0.98 }}
                    >
                      {uploading ? 'Uploading...' : editingUserId ? 'Update User' : 'Add User'}
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
                      Are you sure you want to delete this user?
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  This action cannot be undone. The user will be permanently removed from the system.
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
                    Delete User
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutWrapper>
  );
}