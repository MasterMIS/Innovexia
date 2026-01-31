'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/LayoutWrapper';
import { TableToolbar } from '@/components/TableToolbar';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';
import UserFormModal from '@/components/UserFormModal';

interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  phone: string;
  role_name: string;
  image_url?: string;
  created_at: string;
  
  // Personal Details
  dob?: string;
  uan_number?: string;
  aadhaar_number?: string;
  pan_number?: string;
  
  // Address Details
  present_address_line1?: string;
  present_address_line2?: string;
  present_city?: string;
  present_country?: string;
  present_state?: string;
  present_postal_code?: string;
  permanent_same_as_present?: boolean;
  permanent_address_line1?: string;
  permanent_address_line2?: string;
  permanent_city?: string;
  permanent_country?: string;
  permanent_state?: string;
  permanent_postal_code?: string;
  
  // Professional Details
  experience?: string;
  source_of_hire?: string;
  skill_set?: string;
  highest_qualification?: string;
  additional_information?: string;
  location?: string;
  title?: string;
  current_salary?: string;
  department?: string;
  offer_letter_url?: string;
  tentative_joining_date?: string;
  
  // Education (JSON string)
  education?: string;
  
  // Work Experience (JSON string)
  work_experience?: string;
}

interface SortConfig {
  key: keyof User;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  role_name?: string;
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
  
  // Multi-step form
  const [currentStep, setCurrentStep] = useState(1);
  const [offerLetterFile, setOfferLetterFile] = useState<File | null>(null);
  
  // Education & Experience arrays
  const [educationList, setEducationList] = useState<any[]>([{ school_name: '', degree: '', field_of_study: '', completion_date: '', notes: '' }]);
  const [experienceList, setExperienceList] = useState<any[]>([{ occupation: '', company: '', summary: '', duration: '', currently_working: false }]);

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'username', direction: 'asc' });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    roleName: 'Admin',
    imageUrl: '',
    
    // Personal Details
    dob: '',
    uan_number: '',
    aadhaar_number: '',
    pan_number: '',
    
    // Address Details
    present_address_line1: '',
    present_address_line2: '',
    present_city: '',
    present_country: 'India',
    present_state: '',
    present_postal_code: '',
    permanent_same_as_present: false,
    permanent_address_line1: '',
    permanent_address_line2: '',
    permanent_city: '',
    permanent_country: 'India',
    permanent_state: '',
    permanent_postal_code: '',
    
    // Professional Details
    experience: '',
    source_of_hire: '',
    skill_set: '',
    highest_qualification: '',
    additional_information: '',
    location: '',
    title: '',
    current_salary: '',
    department: '',
    offer_letter_url: '',
    tentative_joining_date: '',
  });

  const { addToast } = useToast();
  const loader = useLoader();

  // Helper function to create notification for a user
  const createNotificationForUser = async (username: string, type: string, title: string, message: string) => {
    try {
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        const users = data.users || [];
        const targetUser = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
        if (targetUser) {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: targetUser.id,
              user_role: targetUser.role_name || 'Doer',
              type,
              title,
              message,
            }),
          });
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

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

    if (filterConfig.role_name) {
      result = result.filter((u) => u.role_name === filterConfig.role_name);
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
      let offerLetterUrl = formData.offer_letter_url;
      
      // Upload profile image
      if (imageFile) {
        imageUrl = await uploadImage();
        if (!imageUrl && imageFile) {
          loader.hideLoader();
          return;
        }
      }
      
      // Upload offer letter
      if (offerLetterFile) {
        offerLetterUrl = await uploadOfferLetter();
      }

      const payload = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        roleName: formData.roleName,
        imageUrl: imageUrl,
        ...(formData.password && { password: formData.password }),
        
        // Personal details
        dob: formData.dob,
        uanNumber: formData.uan_number,
        aadhaarNumber: formData.aadhaar_number,
        panNumber: formData.pan_number,
        
        // Address details
        presentAddressLine1: formData.present_address_line1,
        presentAddressLine2: formData.present_address_line2,
        presentCity: formData.present_city,
        presentCountry: formData.present_country,
        presentState: formData.present_state,
        presentPostalCode: formData.present_postal_code,
        permanentSameAsPresent: formData.permanent_same_as_present,
        permanentAddressLine1: formData.permanent_address_line1,
        permanentAddressLine2: formData.permanent_address_line2,
        permanentCity: formData.permanent_city,
        permanentCountry: formData.permanent_country,
        permanentState: formData.permanent_state,
        permanentPostalCode: formData.permanent_postal_code,
        
        // Professional details
        experience: formData.experience,
        sourceOfHire: formData.source_of_hire,
        skillSet: formData.skill_set,
        highestQualification: formData.highest_qualification,
        additionalInformation: formData.additional_information,
        location: formData.location,
        title: formData.title,
        currentSalary: formData.current_salary,
        department: formData.department,
        offerLetterUrl: offerLetterUrl,
        tentativeJoiningDate: formData.tentative_joining_date,
        
        // Education and Experience as JSON
        education: JSON.stringify(educationList),
        workExperience: JSON.stringify(experienceList),
      };

      const method = editingUserId ? 'PUT' : 'POST';
      const body = editingUserId ? { ...payload, id: editingUserId } : payload;

      const response = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save user');

      const isUpdate = !!editingUserId;
      const actionType = isUpdate ? 'user_updated' : 'user_created';
      const actionTitle = isUpdate ? 'Profile Updated' : 'Welcome!';
      const actionMessage = isUpdate 
        ? `Your profile has been updated by an administrator`
        : `Welcome ${formData.username}! Your account has been created`;

      // Send notification to the user
      await createNotificationForUser(formData.username, actionType, actionTitle, actionMessage);

      // If role changed, send additional notification
      if (isUpdate) {
        const oldUser = users.find(u => u.id === editingUserId);
        if (oldUser && oldUser.role_name !== formData.roleName) {
          await createNotificationForUser(
            formData.username,
            'user_role_changed',
            'Role Changed',
            `Your role has been changed to ${formData.roleName}`
          );
        }
      }

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

  const uploadOfferLetter = async (): Promise<string> => {
    if (!offerLetterFile) return '';

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', offerLetterFile);
      uploadFormData.append('type', 'user'); // Specify this is a user document

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload offer letter');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading offer letter:', error);
      alert('Failed to upload offer letter');
      return '';
    } finally {
      setUploading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      email: user.email,
      password: user.password || '',
      phone: user.phone || '',
      roleName: user.role_name || 'User',
      imageUrl: user.image_url || '',
      dob: user.dob || '',
      uan_number: user.uan_number || '',
      aadhaar_number: user.aadhaar_number || '',
      pan_number: user.pan_number || '',
      present_address_line1: user.present_address_line1 || '',
      present_address_line2: user.present_address_line2 || '',
      present_city: user.present_city || '',
      present_country: user.present_country || 'India',
      present_state: user.present_state || '',
      present_postal_code: user.present_postal_code || '',
      permanent_same_as_present: user.permanent_same_as_present || false,
      permanent_address_line1: user.permanent_address_line1 || '',
      permanent_address_line2: user.permanent_address_line2 || '',
      permanent_city: user.permanent_city || '',
      permanent_country: user.permanent_country || 'India',
      permanent_state: user.permanent_state || '',
      permanent_postal_code: user.permanent_postal_code || '',
      experience: user.experience || '',
      source_of_hire: user.source_of_hire || '',
      skill_set: user.skill_set || '',
      highest_qualification: user.highest_qualification || '',
      additional_information: user.additional_information || '',
      location: user.location || '',
      title: user.title || '',
      current_salary: user.current_salary || '',
      department: user.department || '',
      offer_letter_url: user.offer_letter_url || '',
      tentative_joining_date: user.tentative_joining_date || '',
    });
    setImagePreview(user.image_url || '');
    setImageFile(null);
    setOfferLetterFile(null);
    
    // Parse education and experience JSON
    try {
      const eduStr = typeof user.education === 'string' ? user.education : JSON.stringify(user.education || []);
      if (eduStr && eduStr !== '[]' && eduStr !== 'null') {
        const edu = JSON.parse(eduStr);
        setEducationList(Array.isArray(edu) && edu.length > 0 ? edu : [{ school_name: '', degree: '', field_of_study: '', completion_date: '', notes: '' }]);
      } else {
        setEducationList([{ school_name: '', degree: '', field_of_study: '', completion_date: '', notes: '' }]);
      }
    } catch (e) {
      console.error('Error parsing education:', e, 'Value:', user.education);
      setEducationList([{ school_name: '', degree: '', field_of_study: '', completion_date: '', notes: '' }]);
    }
    
    try {
      const expStr = typeof user.work_experience === 'string' ? user.work_experience : JSON.stringify(user.work_experience || []);
      if (expStr && expStr !== '[]' && expStr !== 'null') {
        const exp = JSON.parse(expStr);
        setExperienceList(Array.isArray(exp) && exp.length > 0 ? exp : [{ occupation: '', company: '', summary: '', duration: '', currently_working: false }]);
      } else {
        setExperienceList([{ occupation: '', company: '', summary: '', duration: '', currently_working: false }]);
      }
    } catch (e) {
      console.error('Error parsing work_experience:', e, 'Value:', user.work_experience);
      setExperienceList([{ occupation: '', company: '', summary: '', duration: '', currently_working: false }]);
    }
    
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
      const user = users.find(u => u.id === deleteId);
      const response = await fetch(`/api/users?id=${deleteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
      
      // Send notification to the deleted user (they won't see it but for records)
      if (user) {
        await createNotificationForUser(
          user.username,
          'user_deleted',
          'Account Deleted',
          `Your account has been deleted by an administrator`
        );
      }
      
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
    setCurrentStep(1);
    setFormData({
      username: '',
      email: '',
      password: '',
      phone: '',
      roleName: 'Admin',
      imageUrl: '',
      dob: '',
      uan_number: '',
      aadhaar_number: '',
      pan_number: '',
      present_address_line1: '',
      present_address_line2: '',
      present_city: '',
      present_country: 'India',
      present_state: '',
      present_postal_code: '',
      permanent_same_as_present: false,
      permanent_address_line1: '',
      permanent_address_line2: '',
      permanent_city: '',
      permanent_country: 'India',
      permanent_state: '',
      permanent_postal_code: '',
      experience: '',
      source_of_hire: '',
      skill_set: '',
      highest_qualification: '',
      additional_information: '',
      location: '',
      title: '',
      current_salary: '',
      department: '',
      offer_letter_url: '',
      tentative_joining_date: '',
    });
    setImageFile(null);
    setImagePreview('');
    setOfferLetterFile(null);
    setEducationList([{ school_name: '', degree: '', field_of_study: '', completion_date: '', notes: '' }]);
    setExperienceList([{ occupation: '', company: '', summary: '', duration: '', currently_working: false }]);
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
        className="p-4 space-y-4 min-h-screen bg-gradient-to-br from-[var(--theme-light)] via-[var(--theme-lighter)] to-[var(--theme-light)] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] bg-clip-text text-transparent">
              Users Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users and their roles</p>
          </div>
          <motion.button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] hover:from-[var(--theme-secondary)] hover:to-[var(--theme-tertiary)] text-gray-900 font-semibold py-2.5 px-6 rounded-xl transition-all shadow-md"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            + Add New User
          </motion.button>
        </motion.div>

        {/* Filters & Export */}
        <motion.div
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-4 space-y-4 border border-[var(--theme-primary)]/20"
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
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent outline-none text-sm shadow-sm"
              />

              <select
                value={filterConfig.role_name || ''}
                onChange={(e) => {
                  setFilterConfig({ ...filterConfig, role_name: e.target.value || undefined });
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] outline-none text-sm shadow-sm"
              >
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="TL">TL</option>
                <option value="User">User</option>
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
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-[var(--theme-primary)]/20"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--theme-primary)] border-r-transparent"></div>
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
                className="text-[var(--theme-secondary)] dark:text-[var(--theme-primary)] hover:underline font-semibold"
                whileHover={{ scale: 1.05 }}
              >
                Create your first user
              </motion.button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] border-b-2 border-[var(--theme-tertiary)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[var(--theme-secondary)] transition-colors" onClick={() => handleSort('username')}>
                      <div className="flex items-center gap-2">Username <SortIcon column="username" /></div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[var(--theme-secondary)] transition-colors" onClick={() => handleSort('email')}>
                      <div className="flex items-center gap-2">Email <SortIcon column="email" /></div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-[var(--theme-secondary)] transition-colors" onClick={() => handleSort('phone')}>
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
                      className="hover:bg-[var(--theme-primary)]/10 dark:hover:bg-[var(--theme-secondary)]/10 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.image_url ? (
                            <img 
                              src={`/api/image-proxy?url=${encodeURIComponent(user.image_url)}`}
                              alt={user.username} 
                              className="w-10 h-10 rounded-full object-cover border-2 border-[var(--theme-primary)]" 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          {!user.image_url ? (
                            <div className="w-10 h-10 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-full flex items-center justify-center text-sm font-bold text-gray-900 shadow-md">
                              {user.username[0].toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-full items-center justify-center text-sm font-bold text-gray-900 shadow-md" style={{ display: 'none' }}>
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
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-4 flex items-center justify-center gap-2 flex-wrap border border-[var(--theme-primary)]/20"
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
                    ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900'
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

        {/* User Form Modal - New Multi-Step Form */}
        <UserFormModal
          showModal={showModal}
          editingUserId={editingUserId}
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            resetForm();
            setShowModal(false);
          }}
          onSave={handleSaveUser}
          roles={roles}
          imagePreview={imagePreview}
          onImageChange={handleImageChange}
          offerLetterFile={offerLetterFile}
          setOfferLetterFile={setOfferLetterFile}
          educationList={educationList}
          setEducationList={setEducationList}
          experienceList={experienceList}
          setExperienceList={setExperienceList}
          uploading={uploading}
        />

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
