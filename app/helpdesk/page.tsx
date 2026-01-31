'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/LayoutWrapper';
import Icon from '@/components/Icon';
import { formatDateToLocalTimezone } from '@/utils/timezone';
import SearchableDropdown from '@/components/SearchableDropdown';
import CustomDateTimePicker from '@/components/CustomDateTimePicker';
import DateRangePicker from '@/components/DateRangePicker';
import { ensureSessionId } from '@/utils/session';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';

interface User {
  id: number;
  username: string;
  name: string;
  image_url?: string;
}

interface Ticket {
  id: number;
  ticket_number: string;
  raised_by: number;
  raised_by_name: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  accountable_person: number | null;
  accountable_person_name: string | null;
  desired_date: string | null;
  status: string;
  attachments: any;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface Remark {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name: string;
  remark: string;
  created_at: string;
}

const statusConfig = [
  { key: 'raised', label: 'Raised', icon: 'warning', color: 'from-red-400 to-red-600' },
  { key: 'verified', label: 'Verified', icon: 'check-circle', color: 'from-blue-400 to-blue-600' },
  { key: 'in-progress', label: 'In Progress', icon: 'clock', color: 'from-yellow-400 to-yellow-600' },
  { key: 'solved', label: 'Solved', icon: 'check', color: 'from-green-400 to-green-600' },
  { key: 'follow-up', label: 'Follow-up', icon: 'message', color: 'from-purple-400 to-purple-600' },
  { key: 'closed', label: 'Closed', icon: 'close', color: 'from-gray-400 to-gray-600' }
];

const categories = [
  'Hardware Issue',
  'Software Issue',
  'Network Problem',
  'Access Request',
  'Email Problem',
  'Application Error',
  'Other'
];

const priorities = ['Low', 'Medium', 'High', 'Critical'];

export default function HelpDeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketRemarks, setTicketRemarks] = useState<Remark[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    category: '',
    priority: 'Medium',
    subject: '',
    description: '',
    assignedTo: '',
    accountablePerson: '',
    desiredDate: ''
  });

  const [remarkText, setRemarkText] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Sorting and Pagination
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const filterBtnRef = React.useRef<HTMLButtonElement>(null);
  const [filterPos, setFilterPos] = useState({ top: 0, right: 0 });
  const [filters, setFilters] = useState({
    categories: [] as string[],
    priorities: [] as string[],
    statuses: [] as string[],
    raisedBy: [] as string[],
    assignedTo: [] as string[],
    accountable: [] as string[],
    createdFrom: '',
    createdTo: '',
  });
  const [filterSearches, setFilterSearches] = useState({
    category: '',
    raisedBy: '',
    assignedTo: '',
    accountable: '',
  });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const router = useRouter();
  const toast = useToast();
  const loader = useLoader();

  // Helper function to create notification for a user
  const createNotificationForUser = async (username: string, type: string, title: string, message: string, ticketId?: number) => {
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
              delegation_id: ticketId,
            }),
          });
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoadingUser(true);
        const sessionId = ensureSessionId();
        const response = await fetch('/api/auth', { headers: { 'x-session-id': sessionId } });
        const data = await response.json();

        if (!data.authenticated) {
          router.push('/login');
          return;
        }

        setCurrentUser(data.user);
        fetchUsers();
        fetchTickets();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setLoadingUser(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // The API returns { users: [...] }
        setUsers(Array.isArray(data.users) ? data.users : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/helpdesk');
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketRemarks = async (ticketId: number) => {
    try {
      const response = await fetch(`/api/helpdesk/remarks?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        setTicketRemarks(data);
      }
    } catch (error) {
      console.error('Error fetching ticket remarks:', error);
    }
  };

  const handleAddTicket = async () => {
    // Check if user session is loaded
    if (!currentUser) {
      toast.error('Loading user session... Please wait a moment and try again.');
      return;
    }

    if (!formData.category || !formData.subject || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      loader.showLoader();
      const assignedUser = users.find(u => u.id === parseInt(formData.assignedTo));
      const accountableUser = users.find(u => u.id === parseInt(formData.accountablePerson));

      const response = await fetch('/api/helpdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raisedBy: currentUser.id,
          raisedByName: currentUser.full_name || currentUser.username,
          category: formData.category,
          priority: formData.priority,
          subject: formData.subject,
          description: formData.description,
          assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
          assignedToName: assignedUser?.username || null,
          accountablePerson: formData.accountablePerson ? parseInt(formData.accountablePerson) : null,
          accountablePersonName: accountableUser?.username || null,
          desiredDate: formData.desiredDate || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        loader.hideLoader();
        toast.success('Ticket created successfully!');

        // Send notifications to assigned and accountable persons
        if (assignedUser && assignedUser.username !== currentUser.username) {
          await createNotificationForUser(
            assignedUser.username,
            'ticket_created',
            'New Ticket Assigned',
            `${currentUser.full_name || currentUser.username} assigned you ticket: "${formData.subject}"`,
            data.id
          );
        }
        if (accountableUser && accountableUser.username !== currentUser.username && accountableUser.username !== assignedUser?.username) {
          await createNotificationForUser(
            accountableUser.username,
            'ticket_created',
            'New Ticket - Accountable',
            `${currentUser.full_name || currentUser.username} made you accountable for ticket: "${formData.subject}"`,
            data.id
          );
        }

        setShowAddModal(false);
        setFormData({
          category: '',
          priority: 'Medium',
          subject: '',
          description: '',
          assignedTo: '',
          accountablePerson: '',
          desiredDate: ''
        });
        fetchTickets();
      } else {
        const errorData = await response.json();
        loader.hideLoader();
        toast.error(errorData.error || 'Failed to create ticket');
      }
    } catch (error) {
      loader.hideLoader();
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    }
  };

  const handleStatusChange = async () => {
    if (!selectedTicket || !newStatus) return;

    try {
      loader.showLoader();
      const updateData: any = { id: selectedTicket.id, status: newStatus };

      if (newStatus === 'solved' || newStatus === 'closed') {
        updateData.resolvedAt = new Date().toISOString();
      }

      const response = await fetch('/api/helpdesk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        loader.hideLoader();
        toast.success('Status updated successfully!');

        // Send notifications to assigned and accountable persons
        const ticket = selectedTicket;
        if (ticket) {
          if (ticket.assigned_to_name && ticket.assigned_to_name !== currentUser.username) {
            await createNotificationForUser(
              ticket.assigned_to_name,
              'ticket_status_changed',
              'Ticket Status Changed',
              `${currentUser.full_name || currentUser.username} changed status of "${ticket.subject}" to ${newStatus}`,
              ticket.id
            );
          }
          if (ticket.accountable_person_name && ticket.accountable_person_name !== currentUser.username && ticket.accountable_person_name !== ticket.assigned_to_name) {
            await createNotificationForUser(
              ticket.accountable_person_name,
              'ticket_status_changed',
              'Ticket Status Changed',
              `${currentUser.full_name || currentUser.username} changed status of "${ticket.subject}" to ${newStatus}`,
              ticket.id
            );
          }
          // Notify ticket raiser
          if (ticket.raised_by_name && ticket.raised_by_name !== currentUser.username && ticket.raised_by_name !== ticket.assigned_to_name && ticket.raised_by_name !== ticket.accountable_person_name) {
            await createNotificationForUser(
              ticket.raised_by_name,
              'ticket_status_changed',
              'Ticket Status Changed',
              `${currentUser.full_name || currentUser.username} changed status of "${ticket.subject}" to ${newStatus}`,
              ticket.id
            );
          }
        }

        // Fetch updated ticket data
        const updatedTicketsResponse = await fetch('/api/helpdesk');
        const updatedTickets = await updatedTicketsResponse.json();
        const updatedTicket = updatedTickets.find((t: Ticket) => t.id === selectedTicket.id);

        if (updatedTicket) {
          setSelectedTicket(updatedTicket);
          setNewStatus(updatedTicket.status);
        }

        fetchTickets();
        setShowDetailModal(false);
      } else {
        loader.hideLoader();
        toast.error('Failed to update status');
      }
    } catch (error) {
      loader.hideLoader();
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAddRemark = async () => {
    if (!selectedTicket || !remarkText.trim()) return;

    try {
      loader.showLoader();
      const response = await fetch('/api/helpdesk/remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          userId: currentUser.id,
          userName: currentUser.full_name || currentUser.username,
          remark: remarkText
        })
      });

      if (response.ok) {
        loader.hideLoader();
        toast.success('Remark added successfully!');
        setRemarkText('');

        // Send notifications to assigned and accountable persons
        const ticket = selectedTicket;
        if (ticket) {
          if (ticket.assigned_to_name && ticket.assigned_to_name !== currentUser.username) {
            await createNotificationForUser(
              ticket.assigned_to_name,
              'ticket_remark_added',
              'New Ticket Remark',
              `${currentUser.full_name || currentUser.username} added a remark to "${ticket.subject}"`,
              ticket.id
            );
          }
          if (ticket.accountable_person_name && ticket.accountable_person_name !== currentUser.username && ticket.accountable_person_name !== ticket.assigned_to_name) {
            await createNotificationForUser(
              ticket.accountable_person_name,
              'ticket_remark_added',
              'New Ticket Remark',
              `${currentUser.full_name || currentUser.username} added a remark to "${ticket.subject}"`,
              ticket.id
            );
          }
          // Notify ticket raiser
          if (ticket.raised_by_name && ticket.raised_by_name !== currentUser.username && ticket.raised_by_name !== ticket.assigned_to_name && ticket.raised_by_name !== ticket.accountable_person_name) {
            await createNotificationForUser(
              ticket.raised_by_name,
              'ticket_remark_added',
              'New Ticket Remark',
              `${currentUser.full_name || currentUser.username} added a remark to "${ticket.subject}"`,
              ticket.id
            );
          }
        }

        fetchTicketRemarks(selectedTicket.id);
      } else {
        loader.hideLoader();
        toast.error('Failed to add remark');
      }
    } catch (error) {
      loader.hideLoader();
      console.error('Error adding remark:', error);
      toast.error('Failed to add remark');
    }
  };

  const openTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    fetchTicketRemarks(ticket.id);
    setShowDetailModal(true);
  };

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  // Filter handlers
  const handleFilterClick = () => {
    if (filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect();
      setFilterPos({ top: rect.bottom + 12, right: window.innerWidth - rect.right });
    }
    setShowFilterModal(true);
  };

  const clearAllFilters = () => {
    setFilters({
      categories: [],
      priorities: [],
      statuses: [],
      raisedBy: [],
      assignedTo: [],
      accountable: [],
      createdFrom: '',
      createdTo: '',
    });
    setCurrentPage(1);
  };

  const toggleFilter = (type: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      const arrayKey = type as 'categories' | 'priorities' | 'statuses' | 'raisedBy' | 'assignedTo' | 'accountable';
      const currentArray = prev[arrayKey];

      if (currentArray.includes(value)) {
        newFilters[arrayKey] = currentArray.filter(v => v !== value) as any;
      } else {
        newFilters[arrayKey] = [...currentArray, value] as any;
      }
      return newFilters;
    });
  };

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    count += filters.categories.length;
    count += filters.priorities.length;
    count += filters.statuses.length;
    count += filters.raisedBy.length;
    count += filters.assignedTo.length;
    count += filters.accountable.length;
    if (filters.createdFrom) count++;
    if (filters.createdTo) count++;
    return count;
  }, [filters]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdown]);

  // Get unique values for filters
  const uniqueCategories = React.useMemo(() => Array.from(new Set(tickets.map(t => t.category).filter(Boolean))).sort(), [tickets]);
  const uniqueRaisedBy = React.useMemo(() => Array.from(new Set(tickets.map(t => t.raised_by_name).filter(Boolean))).sort(), [tickets]);
  const uniqueAssignedTo = React.useMemo(() => Array.from(new Set(tickets.map(t => t.assigned_to_name).filter((name): name is string => Boolean(name)))).sort(), [tickets]);
  const uniqueAccountable = React.useMemo(() => Array.from(new Set(tickets.map(t => t.accountable_person_name).filter((name): name is string => Boolean(name)))).sort(), [tickets]);

  const filteredTickets = selectedStatus === 'all'
    ? tickets
    : tickets.filter(t => t.status === selectedStatus);

  // Apply advanced filters
  const advancedFilteredTickets = React.useMemo(() => {
    return filteredTickets.filter(ticket => {
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(ticket.category)) {
        return false;
      }

      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(ticket.priority)) {
        return false;
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(ticket.status)) {
        return false;
      }

      // Raised By filter
      if (filters.raisedBy.length > 0 && !filters.raisedBy.includes(ticket.raised_by_name)) {
        return false;
      }

      // Assigned To filter
      if (filters.assignedTo.length > 0 && ticket.assigned_to_name && !filters.assignedTo.includes(ticket.assigned_to_name)) {
        return false;
      }

      // Accountable filter
      if (filters.accountable.length > 0 && ticket.accountable_person_name && !filters.accountable.includes(ticket.accountable_person_name)) {
        return false;
      }

      // Created date range filter
      if (filters.createdFrom || filters.createdTo) {
        const createdDate = new Date(ticket.created_at);
        if (filters.createdFrom) {
          const fromDate = new Date(filters.createdFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (createdDate < fromDate) return false;
        }
        if (filters.createdTo) {
          const toDate = new Date(filters.createdTo);
          toDate.setHours(23, 59, 59, 999);
          if (createdDate > toDate) return false;
        }
      }

      return true;
    });
  }, [filteredTickets, filters]);

  // Sort tickets
  const sortedTickets = [...advancedFilteredTickets].sort((a, b) => {
    let aValue: any = a[sortColumn as keyof Ticket];
    let bValue: any = b[sortColumn as keyof Ticket];

    // Handle different data types
    if (sortColumn === 'created_at' || sortColumn === 'updated_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue?.toLowerCase() || '';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = sortedTickets.slice(startIndex, endIndex);

  // Use paginatedTickets in table view, sortedTickets in list view
  const displayTickets = viewMode === 'table' ? paginatedTickets : sortedTickets;

  const getTicketCountByStatus = (status: string) => {
    return tickets.filter(t => t.status === status).length;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getUserImage = (userId: number | null) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user?.image_url || null;
  };

  const getUserName = (userId: number | null) => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.id === userId);
    return user?.username || 'Unknown';
  };

  const getStatusStageIndex = (status: string) => {
    return statusConfig.findIndex(s => s.key === status);
  };

  const handleEditTicket = (ticket: Ticket, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTicket(ticket);
    setFormData({
      category: ticket.category,
      priority: ticket.priority,
      subject: ticket.subject,
      description: ticket.description,
      assignedTo: ticket.assigned_to?.toString() || '',
      accountablePerson: ticket.accountable_person?.toString() || '',
      desiredDate: ticket.desired_date || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateTicket = async () => {
    if (!editingTicket) return;

    if (!formData.category || !formData.subject || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      loader.showLoader();
      const assignedUser = users.find(u => u.id === parseInt(formData.assignedTo));
      const accountableUser = users.find(u => u.id === parseInt(formData.accountablePerson));

      const response = await fetch('/api/helpdesk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTicket.id,
          category: formData.category,
          priority: formData.priority,
          subject: formData.subject,
          description: formData.description,
          assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
          assignedToName: assignedUser?.username || null,
          accountablePerson: formData.accountablePerson ? parseInt(formData.accountablePerson) : null,
          accountablePersonName: accountableUser?.username || null,
          desiredDate: formData.desiredDate || null
        })
      });

      if (response.ok) {
        loader.hideLoader();
        toast.success('Ticket updated successfully!');

        // Send notifications to assigned and accountable persons
        if (assignedUser && assignedUser.username !== currentUser.username) {
          await createNotificationForUser(
            assignedUser.username,
            'ticket_updated',
            'Ticket Updated',
            `${currentUser.full_name || currentUser.username} updated ticket: "${formData.subject}"`,
            editingTicket.id
          );
        }
        if (accountableUser && accountableUser.username !== currentUser.username && accountableUser.username !== assignedUser?.username) {
          await createNotificationForUser(
            accountableUser.username,
            'ticket_updated',
            'Ticket Updated',
            `${currentUser.full_name || currentUser.username} updated ticket: "${formData.subject}"`,
            editingTicket.id
          );
        }

        setShowEditModal(false);
        setEditingTicket(null);
        setFormData({
          category: '',
          priority: 'Medium',
          subject: '',
          description: '',
          assignedTo: '',
          accountablePerson: '',
          desiredDate: ''
        });
        fetchTickets();
      } else {
        const errorData = await response.json();
        loader.hideLoader();
        toast.error(errorData.error || 'Failed to update ticket');
      }
    } catch (error) {
      loader.hideLoader();
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    }
  };

  const handleDeleteTicket = async () => {
    if (!deletingTicketId) return;

    try {
      loader.showLoader();
      const ticket = tickets.find(t => t.id === deletingTicketId);
      const response = await fetch(`/api/helpdesk?id=${deletingTicketId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loader.hideLoader();
        toast.success('Ticket deleted successfully!');

        // Send notifications to assigned and accountable persons
        if (ticket) {
          if (ticket.assigned_to_name && ticket.assigned_to_name !== currentUser.username) {
            await createNotificationForUser(
              ticket.assigned_to_name,
              'ticket_deleted',
              'Ticket Deleted',
              `${currentUser.full_name || currentUser.username} deleted ticket: "${ticket.subject}"`,
              ticket.id
            );
          }
          if (ticket.accountable_person_name && ticket.accountable_person_name !== currentUser.username && ticket.accountable_person_name !== ticket.assigned_to_name) {
            await createNotificationForUser(
              ticket.accountable_person_name,
              'ticket_deleted',
              'Ticket Deleted',
              `${currentUser.full_name || currentUser.username} deleted ticket: "${ticket.subject}"`,
              ticket.id
            );
          }
          // Notify ticket raiser
          if (ticket.raised_by_name && ticket.raised_by_name !== currentUser.username && ticket.raised_by_name !== ticket.assigned_to_name && ticket.raised_by_name !== ticket.accountable_person_name) {
            await createNotificationForUser(
              ticket.raised_by_name,
              'ticket_deleted',
              'Ticket Deleted',
              `${currentUser.full_name || currentUser.username} deleted ticket: "${ticket.subject}"`,
              ticket.id
            );
          }
        }

        setShowDeleteModal(false);
        setDeletingTicketId(null);
        fetchTickets();
      } else {
        loader.hideLoader();
        toast.error('Failed to delete ticket');
      }
    } catch (error) {
      loader.hideLoader();
      console.error('Error deleting ticket:', error);
      toast.error('Failed to delete ticket');
    }
  };

  return (
    <LayoutWrapper>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] bg-clip-text text-transparent mb-2">
                HelpDesk
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Manage and track support tickets</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0" style={{ scrollbarWidth: 'none' }}>
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1 flex-shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded transition ${viewMode === 'list'
                    ? 'bg-[var(--theme-primary)] text-gray-900 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded transition ${viewMode === 'table'
                    ? 'bg-[var(--theme-primary)] text-gray-900 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>

              {/* Filters Button with Count Badge */}
              <div className="relative">
                <button
                  ref={filterBtnRef}
                  onClick={handleFilterClick}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="hidden sm:inline">Filters</span>
                </button>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[var(--theme-primary)] text-gray-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow flex-shrink-0"
              >
                <Icon name="plus" size={20} />
                <span className="hidden sm:inline">Raise Ticket</span>
                <span className="sm:hidden">Raise</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Status Tiles */}
        <motion.div
          className="mb-8 overflow-x-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex gap-3 min-w-max pb-2">
            {/* All Tickets Tile */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedStatus('all')}
              className={`cursor-pointer rounded-xl p-3 border transition min-w-[180px] ${selectedStatus === 'all'
                ? 'bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] border-yellow-400 shadow-lg'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600 hover:shadow-md'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedStatus === 'all' ? 'bg-yellow-600' : 'bg-gray-500'
                  }`}>
                  <Icon name="list" size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${selectedStatus === 'all' ? 'text-gray-900' : 'text-gray-600 dark:text-gray-400'
                    }`}>All Tickets</p>
                  <p className={`text-2xl font-bold ${selectedStatus === 'all' ? 'text-gray-900' : 'text-gray-700 dark:text-gray-300'
                    }`}>{tickets.length}</p>
                </div>
              </div>
            </motion.div>

            {/* Status Tiles */}
            {statusConfig.map((status) => (
              <motion.div
                key={status.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStatus(status.key)}
                className={`cursor-pointer rounded-xl p-3 border transition min-w-[180px] ${selectedStatus === status.key
                  ? `bg-gradient-to-br ${status.color} border-opacity-50 shadow-lg`
                  : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600 hover:shadow-md'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedStatus === status.key ? 'bg-white/20' : 'bg-gray-500'
                    }`}>
                    <Icon name={status.icon as any} size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${selectedStatus === status.key ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                      }`}>{status.label}</p>
                    <p className={`text-2xl font-bold ${selectedStatus === status.key ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                      }`}>{getTicketCountByStatus(status.key)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tickets List/Table */}
        <div className="">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold mb-6">
              {selectedStatus === 'all' ? 'All Tickets' : `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Tickets`}
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--theme-primary)] mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="inbox" size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No tickets found</p>
              </div>
            ) : (
              <>
                {/* List View */}
                {viewMode === 'list' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <AnimatePresence>
                      {displayTickets.map((ticket, index) => (
                        <motion.div
                          key={ticket.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => openTicketDetail(ticket)}
                          className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg hover:border-[var(--theme-primary)] transition-all cursor-pointer bg-gradient-to-r from-transparent to-transparent hover:from-yellow-50 hover:to-transparent dark:hover:from-yellow-900/10"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-mono text-sm font-bold text-[var(--theme-primary)]">
                                  #{ticket.id}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                                  {ticket.priority}
                                </span>
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                  {ticket.category}
                                </span>
                              </div>
                              <h3 className="text-lg font-semibold mb-2">{ticket.subject}</h3>
                              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                                {ticket.description}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                  {getUserImage(ticket.raised_by) ? (
                                    <img src={`/api/image-proxy?url=${encodeURIComponent(getUserImage(ticket.raised_by)!)}`} alt={ticket.raised_by_name} className="w-6 h-6 rounded-full object-cover border-2 border-[var(--theme-primary)]" />
                                  ) : (
                                    <div className="w-6 h-6 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-full flex items-center justify-center text-xs font-bold text-gray-900">
                                      {ticket.raised_by_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                  )}
                                  <span>{ticket.raised_by_name}</span>
                                </div>
                                {ticket.assigned_to && (
                                  <div className="flex items-center gap-2">
                                    <Icon name="user-check" size={14} />
                                    {getUserImage(ticket.assigned_to) ? (
                                      <img src={`/api/image-proxy?url=${encodeURIComponent(getUserImage(ticket.assigned_to)!)}`} alt={getUserName(ticket.assigned_to)} className="w-6 h-6 rounded-full object-cover border-2 border-blue-400" />
                                    ) : (
                                      <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                        {getUserName(ticket.assigned_to)?.[0]?.toUpperCase() || '?'}
                                      </div>
                                    )}
                                    <span>{getUserName(ticket.assigned_to)}</span>
                                  </div>
                                )}
                                {ticket.accountable_person && (
                                  <div className="flex items-center gap-2">
                                    <Icon name="user-check" size={14} />
                                    {getUserImage(ticket.accountable_person) ? (
                                      <img src={`/api/image-proxy?url=${encodeURIComponent(getUserImage(ticket.accountable_person)!)}`} alt={getUserName(ticket.accountable_person)} className="w-6 h-6 rounded-full object-cover border-2 border-purple-400" />
                                    ) : (
                                      <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                        {getUserName(ticket.accountable_person)?.[0]?.toUpperCase() || '?'}
                                      </div>
                                    )}
                                    <span>{getUserName(ticket.accountable_person)}</span>
                                  </div>
                                )}
                                <span className="flex items-center gap-1">
                                  <Icon name="clock" size={14} />
                                  {formatDateToLocalTimezone(ticket.created_at)}
                                </span>
                              </div>
                              {/* Stage Roadmap */}
                              <div className="pt-6 mt-3 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                  {statusConfig.map((stage, idx) => {
                                    const currentIdx = getStatusStageIndex(ticket.status);
                                    const isCompleted = idx <= currentIdx;
                                    const isCurrent = idx === currentIdx;
                                    return (
                                      <div key={stage.key} className="flex items-center">
                                        <motion.div
                                          initial={{ scale: 0.8, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          transition={{ delay: idx * 0.1 }}
                                          className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${isCompleted
                                            ? 'bg-gradient-to-r ' + stage.color + ' border-transparent text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                                            } ${isCurrent ? 'ring-4 ring-yellow-200 dark:ring-yellow-900/50 scale-110' : ''}`}
                                          title={stage.label}
                                        >
                                          {isCompleted ? (
                                            <Icon name="check" size={16} />
                                          ) : (
                                            <span className="text-xs font-bold">{idx + 1}</span>
                                          )}
                                          {isCurrent && (
                                            <motion.div
                                              className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-semibold text-[var(--theme-primary)] whitespace-nowrap bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm"
                                              animate={{ y: [0, -2, 0] }}
                                              transition={{ duration: 1.5, repeat: Infinity }}
                                            >
                                              {stage.label}
                                            </motion.div>
                                          )}
                                        </motion.div>
                                        {idx < statusConfig.length - 1 && (
                                          <div className={`w-8 h-0.5 ${idx < currentIdx ? 'bg-gradient-to-r ' + stage.color : 'bg-gray-200 dark:bg-gray-700'
                                            }`} />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r ${statusConfig.find(s => s.key === ticket.status)?.color || 'from-gray-400 to-gray-600'} text-white`}>
                                {statusConfig.find(s => s.key === ticket.status)?.label || ticket.status}
                              </div>
                              <button
                                onClick={(e) => handleEditTicket(ticket, e)}
                                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition"
                                title="Edit ticket"
                              >
                                <Icon name="edit" size={18} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeletingTicketId(ticket.id); setShowDeleteModal(true); }}
                                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition"
                                title="Delete ticket"
                              >
                                <Icon name="trash" size={18} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--theme-lighter)] dark:bg-gray-700">
                        <tr>
                          <th onClick={() => handleSort('id')} className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-[#e5d5c8] dark:hover:bg-gray-600 transition">
                            <div className="flex items-center gap-2">
                              ID
                              {sortColumn === 'id' && (
                                <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={14} />
                              )}
                            </div>
                          </th>
                          <th onClick={() => handleSort('subject')} className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-[#e5d5c8] dark:hover:bg-gray-600 transition">
                            <div className="flex items-center gap-2">
                              Subject
                              {sortColumn === 'subject' && (
                                <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={14} />
                              )}
                            </div>
                          </th>
                          <th onClick={() => handleSort('category')} className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-[#e5d5c8] dark:hover:bg-gray-600 transition">
                            <div className="flex items-center gap-2">
                              Category
                              {sortColumn === 'category' && (
                                <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={14} />
                              )}
                            </div>
                          </th>
                          <th onClick={() => handleSort('priority')} className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-[#e5d5c8] dark:hover:bg-gray-600 transition">
                            <div className="flex items-center gap-2">
                              Priority
                              {sortColumn === 'priority' && (
                                <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={14} />
                              )}
                            </div>
                          </th>
                          <th onClick={() => handleSort('raised_by_name')} className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-[#e5d5c8] dark:hover:bg-gray-600 transition">
                            <div className="flex items-center gap-2">
                              Raised By
                              {sortColumn === 'raised_by_name' && (
                                <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={14} />
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Assigned To</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Accountable</th>
                          <th onClick={() => handleSort('status')} className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-[#e5d5c8] dark:hover:bg-gray-600 transition">
                            <div className="flex items-center gap-2">
                              Status
                              {sortColumn === 'status' && (
                                <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={14} />
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Stages</th>
                          <th onClick={() => handleSort('created_at')} className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-[#e5d5c8] dark:hover:bg-gray-600 transition">
                            <div className="flex items-center gap-2">
                              Created
                              {sortColumn === 'created_at' && (
                                <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={14} />
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {displayTickets.map((ticket) => (
                          <motion.tr
                            key={ticket.id}
                            className="hover:bg-[var(--theme-lighter)]/50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                            onClick={() => openTicketDetail(ticket)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <td className="px-6 py-4">
                              <span className="font-mono text-sm font-bold text-[var(--theme-primary)]">#{ticket.id}</span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-900 dark:text-white">{ticket.subject}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{ticket.description}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {ticket.category}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {getUserImage(ticket.raised_by) ? (
                                  <img src={`/api/image-proxy?url=${encodeURIComponent(getUserImage(ticket.raised_by)!)}`} alt={ticket.raised_by_name} className="w-8 h-8 rounded-full object-cover border-2 border-[var(--theme-primary)]" />
                                ) : (
                                  <div className="w-8 h-8 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-full flex items-center justify-center text-sm font-bold text-gray-900 shadow-md">
                                    {ticket.raised_by_name?.[0]?.toUpperCase() || '?'}
                                  </div>
                                )}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{ticket.raised_by_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {ticket.assigned_to ? (
                                <div className="flex items-center gap-2">
                                  {getUserImage(ticket.assigned_to) ? (
                                    <img src={`/api/image-proxy?url=${encodeURIComponent(getUserImage(ticket.assigned_to)!)}`} alt={getUserName(ticket.assigned_to)} className="w-8 h-8 rounded-full object-cover border-2 border-blue-400" />
                                  ) : (
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md">
                                      {getUserName(ticket.assigned_to)?.[0]?.toUpperCase() || '?'}
                                    </div>
                                  )}
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{getUserName(ticket.assigned_to)}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {ticket.accountable_person ? (
                                <div className="flex items-center gap-2">
                                  {getUserImage(ticket.accountable_person) ? (
                                    <img src={`/api/image-proxy?url=${encodeURIComponent(getUserImage(ticket.accountable_person)!)}`} alt={getUserName(ticket.accountable_person)} className="w-8 h-8 rounded-full object-cover border-2 border-purple-400" />
                                  ) : (
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md">
                                      {getUserName(ticket.accountable_person)?.[0]?.toUpperCase() || '?'}
                                    </div>
                                  )}
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{getUserName(ticket.accountable_person)}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r ${statusConfig.find(s => s.key === ticket.status)?.color || 'from-gray-400 to-gray-600'} text-white`}>
                                {statusConfig.find(s => s.key === ticket.status)?.label || ticket.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                {statusConfig.map((stage, idx) => {
                                  const currentIdx = getStatusStageIndex(ticket.status);
                                  const isCompleted = idx <= currentIdx;
                                  return (
                                    <div
                                      key={stage.key}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted
                                        ? 'bg-green-500 border-green-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                                        }`}
                                      title={stage.label}
                                    >
                                      {isCompleted && <Icon name="check" size={12} />}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm">
                                <p className="text-gray-900 dark:text-white font-medium">
                                  {new Date(ticket.created_at).toLocaleDateString('en-IN')}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">
                                  {new Date(ticket.created_at).toLocaleTimeString('en-IN', { hour12: true })}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleEditTicket(ticket, e)}
                                  className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition"
                                  title="Edit ticket"
                                >
                                  <Icon name="edit" size={16} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeletingTicketId(ticket.id); setShowDeleteModal(true); }}
                                  className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition"
                                  title="Delete ticket"
                                >
                                  <Icon name="trash" size={16} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          Showing {startIndex + 1} to {Math.min(endIndex, sortedTickets.length)} of {sortedTickets.length} tickets
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            <Icon name="chevron-left" size={16} />
                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                              // Show first page, last page, current page, and pages around current
                              return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                            })
                            .map((page, idx, arr) => (
                              <React.Fragment key={page}>
                                {idx > 0 && arr[idx - 1] !== page - 1 && (
                                  <span className="px-2 text-gray-400">...</span>
                                )}
                                <button
                                  onClick={() => setCurrentPage(page)}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${currentPage === page
                                    ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900'
                                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            ))}

                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            <Icon name="chevron-right" size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Filter Modal */}
        <AnimatePresence>
          {showFilterModal && (
            <>
              <motion.div
                className="fixed inset-0 bg-transparent z-[60]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilterModal(false)}
              />

              <motion.div
                className="fixed z-[70] w-full md:w-[600px] max-w-[95vw] md:max-w-none bottom-0 md:bottom-auto left-1/2 md:left-auto md:top-auto -translate-x-1/2 md:translate-x-0"
                style={{
                  top: typeof window !== 'undefined' && window.innerWidth >= 768 ? filterPos.top : undefined,
                  right: typeof window !== 'undefined' && window.innerWidth >= 768 ? filterPos.right : undefined
                }}
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-100px)] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Arrow pointing to filter button - Hide on mobile */}
                  <div className="hidden md:block absolute -top-2 right-8 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 transform rotate-45"></div>

                  {/* Filter Content */}
                  <div className="p-5 space-y-4">
                    {/* Date Range */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Created Date Range</label>
                      <DateRangePicker
                        fromDate={filters.createdFrom}
                        toDate={filters.createdTo}
                        onRangeChange={(from, to) => setFilters(prev => ({ ...prev, createdFrom: from, createdTo: to }))}
                      />
                    </div>

                    {/* Category & Raised By */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative filter-dropdown-container">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={filterSearches.category}
                          onChange={(e) => setFilterSearches(prev => ({ ...prev, category: e.target.value }))}
                          onFocus={() => setActiveDropdown('category')}
                          className="w-full px-3 py-2 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition"
                        />
                        {activeDropdown === 'category' && (
                          <div
                            className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto space-y-1 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {uniqueCategories
                              .filter(cat => !filterSearches.category || cat.toLowerCase().includes(filterSearches.category.toLowerCase()))
                              .map(cat => (
                                <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 p-1.5 rounded transition">
                                  <input
                                    type="checkbox"
                                    checked={filters.categories.includes(cat)}
                                    onChange={() => toggleFilter('categories', cat)}
                                    className="w-3.5 h-3.5 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] rounded"
                                  />
                                  <span className="text-xs text-gray-900 dark:text-white">{cat}</span>
                                </label>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="relative filter-dropdown-container">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Raised By</label>
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={filterSearches.raisedBy}
                          onChange={(e) => setFilterSearches(prev => ({ ...prev, raisedBy: e.target.value }))}
                          onFocus={() => setActiveDropdown('raisedBy')}
                          className="w-full px-3 py-2 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition"
                        />
                        {activeDropdown === 'raisedBy' && (
                          <div
                            className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto space-y-1 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {uniqueRaisedBy
                              .filter(name => !filterSearches.raisedBy || name.toLowerCase().includes(filterSearches.raisedBy.toLowerCase()))
                              .map(name => (
                                <label key={name} className="flex items-center gap-2 cursor-pointer hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 p-1.5 rounded transition">
                                  <input
                                    type="checkbox"
                                    checked={filters.raisedBy.includes(name)}
                                    onChange={() => toggleFilter('raisedBy', name)}
                                    className="w-3.5 h-3.5 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] rounded"
                                  />
                                  <span className="text-xs text-gray-900 dark:text-white">{name}</span>
                                </label>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned To & Accountable Person */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative filter-dropdown-container">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Assigned To</label>
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={filterSearches.assignedTo}
                          onChange={(e) => setFilterSearches(prev => ({ ...prev, assignedTo: e.target.value }))}
                          onFocus={() => setActiveDropdown('assignedTo')}
                          className="w-full px-3 py-2 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition"
                        />
                        {activeDropdown === 'assignedTo' && (
                          <div
                            className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto space-y-1 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {uniqueAssignedTo
                              .filter(name => !filterSearches.assignedTo || name?.toLowerCase().includes(filterSearches.assignedTo.toLowerCase()))
                              .map(name => name && (
                                <label key={name} className="flex items-center gap-2 cursor-pointer hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 p-1.5 rounded transition">
                                  <input
                                    type="checkbox"
                                    checked={filters.assignedTo.includes(name)}
                                    onChange={() => toggleFilter('assignedTo', name)}
                                    className="w-3.5 h-3.5 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] rounded"
                                  />
                                  <span className="text-xs text-gray-900 dark:text-white">{name}</span>
                                </label>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="relative filter-dropdown-container">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Accountable Person</label>
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={filterSearches.accountable}
                          onChange={(e) => setFilterSearches(prev => ({ ...prev, accountable: e.target.value }))}
                          onFocus={() => setActiveDropdown('accountable')}
                          className="w-full px-3 py-2 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition"
                        />
                        {activeDropdown === 'accountable' && (
                          <div
                            className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto space-y-1 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {uniqueAccountable
                              .filter(name => !filterSearches.accountable || name?.toLowerCase().includes(filterSearches.accountable.toLowerCase()))
                              .map(name => name && (
                                <label key={name} className="flex items-center gap-2 cursor-pointer hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 p-1.5 rounded transition">
                                  <input
                                    type="checkbox"
                                    checked={filters.accountable.includes(name)}
                                    onChange={() => toggleFilter('accountable', name)}
                                    className="w-3.5 h-3.5 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] rounded"
                                  />
                                  <span className="text-xs text-gray-900 dark:text-white">{name}</span>
                                </label>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Priority - Single Row */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                      <div className="flex gap-2">
                        {['High', 'Medium', 'Low'].map(priority => (
                          <button
                            key={priority}
                            onClick={() => toggleFilter('priorities', priority)}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${filters.priorities.includes(priority)
                              ? 'bg-[var(--theme-primary)] text-gray-900 shadow-md'
                              : 'bg-[var(--theme-lighter)] dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-[#e5d5c8] dark:hover:bg-gray-600'
                              }`}
                          >
                            {priority}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status - Single Row */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                      <div className="flex flex-wrap gap-1.5">
                        {statusConfig.map(status => (
                          <button
                            key={status.key}
                            onClick={() => toggleFilter('statuses', status.key)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${filters.statuses.includes(status.key)
                              ? 'bg-[var(--theme-primary)] text-gray-900 shadow-md'
                              : 'bg-[var(--theme-lighter)] dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-[#e5d5c8] dark:hover:bg-gray-600'
                              }`}
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={clearAllFilters}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                      >
                        Clear All
                      </button>
                      <button
                        onClick={() => setShowFilterModal(false)}
                        className="px-4 py-2 bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] text-gray-900 font-semibold rounded-lg transition"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Add Ticket Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] p-6 rounded-t-2xl z-10 shadow-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Raise New Ticket</h2>
                      <p className="text-sm text-gray-700 mt-1">Fill in the details below to create a support ticket</p>
                    </div>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <Icon name="close" size={24} />
                    </button>
                  </div>
                </div>

                <div className="p-8">
                  {/* Show loading indicator if user not loaded */}
                  {loadingUser && (
                    <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                      <span className="text-sm text-yellow-800 dark:text-yellow-200">Loading user session...</span>
                    </div>
                  )}
                  {!loadingUser && !currentUser && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                      <Icon name="warning" size={20} />
                      <span className="text-sm text-red-800 dark:text-red-200">Please log in to raise a ticket.</span>
                    </div>
                  )}

                  {/* Form Grid Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-5">
                      {/* Category */}
                      <div className="group">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] transition-all"
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Priority */}
                      <div className="group">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          Priority <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] transition-all"
                        >
                          {priorities.map(pri => (
                            <option key={pri} value={pri}>{pri}</option>
                          ))}
                        </select>
                      </div>

                      {/* Subject */}
                      <div className="group">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          Subject <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="Brief summary of the issue"
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] transition-all"
                        />
                      </div>

                      {/* Description */}
                      <div className="group">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Provide a detailed description of the problem..."
                          rows={6}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                      {/* Assigned To - Searchable Dropdown */}
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <SearchableDropdown
                          label="Assign To (Problem Solver)"
                          options={users.map(u => ({ id: u.id, name: u.username || u.name }))}
                          value={formData.assignedTo}
                          onChange={(val) => setFormData({ ...formData, assignedTo: val.toString() })}
                          placeholder="Search and select problem solver..."
                        />
                      </div>

                      {/* Accountable Person - Searchable Dropdown */}
                      <div className="p-5 bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30">
                        <SearchableDropdown
                          label="Accountable Person"
                          options={users.map(u => ({ id: u.id, name: u.username || u.name }))}
                          value={formData.accountablePerson}
                          onChange={(val) => setFormData({ ...formData, accountablePerson: val.toString() })}
                          placeholder="Search and select accountable person..."
                        />
                      </div>

                      {/* Desired Resolution Date & Time */}
                      <div className="p-5 bg-gradient-to-br from-yellow-50 to-transparent dark:from-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                        <CustomDateTimePicker
                          label="Desired Resolution Date & Time"
                          value={formData.desiredDate}
                          onChange={(val) => setFormData({ ...formData, desiredDate: val })}
                          placeholder="Select desired resolution date & time"
                        />
                      </div>

                      {/* Help Text */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                        <div className="flex items-start gap-3">
                          <Icon name="info" size={20} className="text-blue-500 mt-0.5" />
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <p className="font-semibold mb-1">Tips:</p>
                            <ul className="list-disc list-inside space-y-1">
                              <li>Be specific in your description</li>
                              <li>Include error messages if any</li>
                              <li>Mention steps to reproduce the issue</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowAddModal(false)}
                      className="px-8 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddTicket}
                      disabled={loadingUser || !currentUser}
                      className={`flex-1 px-8 py-4 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${loadingUser || !currentUser ? 'opacity-50 cursor-not-allowed' : 'hover:from-[var(--theme-secondary)] hover:to-[var(--theme-tertiary)]'
                        }`}
                    >
                      <Icon name="check" size={20} />
                      Raise Ticket
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ticket Detail Modal */}
        <AnimatePresence>
          {showDetailModal && selectedTicket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowDetailModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] p-6 rounded-t-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTicket.subject}</h2>
                      <p className="font-mono text-sm text-gray-700">{selectedTicket.ticket_number}</p>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <Icon name="close" size={24} />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Ticket Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 dark:bg-gray-700">
                        {selectedTicket.category}
                      </span>
                    </div>
                    <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                      Created: {formatDateToLocalTimezone(selectedTicket.created_at)}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <h3 className="font-semibold mb-1 text-sm">Raised By</h3>
                      <p className="text-gray-700 dark:text-gray-300">{selectedTicket.raised_by_name}</p>
                    </div>
                    {selectedTicket.assigned_to_name && (
                      <div>
                        <h3 className="font-semibold mb-1 text-sm">Assigned To</h3>
                        <p className="text-gray-700 dark:text-gray-300">{selectedTicket.assigned_to_name}</p>
                      </div>
                    )}
                    {selectedTicket.accountable_person_name && (
                      <div>
                        <h3 className="font-semibold mb-1 text-sm">Accountable Person</h3>
                        <p className="text-gray-700 dark:text-gray-300">{selectedTicket.accountable_person_name}</p>
                      </div>
                    )}
                    {selectedTicket.desired_date && (
                      <div>
                        <h3 className="font-semibold mb-1 text-sm">Desired Resolution</h3>
                        <p className="text-gray-700 dark:text-gray-300">{formatDateToLocalTimezone(selectedTicket.desired_date)}</p>
                      </div>
                    )}
                  </div>

                  {/* Status Update */}
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <h3 className="font-semibold mb-3">Update Status</h3>
                    <div className="flex gap-3">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                      >
                        {statusConfig.map(status => (
                          <option key={status.key} value={status.key}>{status.label}</option>
                        ))}
                      </select>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStatusChange}
                        disabled={newStatus === selectedTicket.status}
                        className="px-6 py-2 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Update
                      </motion.button>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <h3 className="font-semibold mb-3">Follow-up Notes</h3>
                    <div className="space-y-3 mb-4">
                      {ticketRemarks.map(remark => (
                        <div key={remark.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-sm">{remark.user_name}</span>
                            <span className="text-xs text-gray-500">{formatDateToLocalTimezone(remark.created_at)}</span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">{remark.remark}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={remarkText}
                        onChange={(e) => setRemarkText(e.target.value)}
                        placeholder="Add a follow-up note..."
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddRemark()}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddRemark}
                        className="px-6 py-2 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-xl font-semibold"
                      >
                        Add Note
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Ticket Modal */}
        <AnimatePresence>
          {showEditModal && editingTicket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-t-2xl z-10 shadow-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Edit Ticket</h2>
                      <p className="text-blue-100 mt-1">Update ticket information</p>
                    </div>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <Icon name="close" size={24} className="text-white" />
                    </button>
                  </div>
                </div>

                <div className="p-8">
                  {/* Form Grid Layout - Same as Add Modal */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-5">
                      {/* Category */}
                      <div className="group">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Priority */}
                      <div className="group">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          Priority <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                          {priorities.map(pri => (
                            <option key={pri} value={pri}>{pri}</option>
                          ))}
                        </select>
                      </div>

                      {/* Subject */}
                      <div className="group">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          Subject <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="Brief summary of the issue"
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      {/* Description */}
                      <div className="group">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Provide a detailed description of the problem..."
                          rows={6}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                      {/* Assigned To */}
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <SearchableDropdown
                          label="Assign To (Problem Solver)"
                          options={users.map(u => ({ id: u.id, name: u.username || u.name }))}
                          value={formData.assignedTo}
                          onChange={(val) => setFormData({ ...formData, assignedTo: val.toString() })}
                          placeholder="Search and select problem solver..."
                        />
                      </div>

                      {/* Accountable Person */}
                      <div className="p-5 bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30">
                        <SearchableDropdown
                          label="Accountable Person"
                          options={users.map(u => ({ id: u.id, name: u.username || u.name }))}
                          value={formData.accountablePerson}
                          onChange={(val) => setFormData({ ...formData, accountablePerson: val.toString() })}
                          placeholder="Search and select accountable person..."
                        />
                      </div>

                      {/* Desired Resolution Date */}
                      <div className="p-5 bg-gradient-to-br from-green-50 to-transparent dark:from-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                        <CustomDateTimePicker
                          label="Desired Resolution Date & Time"
                          value={formData.desiredDate}
                          onChange={(val) => setFormData({ ...formData, desiredDate: val })}
                          placeholder="Select desired resolution date & time"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowEditModal(false)}
                      className="px-8 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUpdateTicket}
                      className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Icon name="check" size={20} />
                      Update Ticket
                    </motion.button>
                  </div>
                </div>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <Icon name="warning" size={24} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Ticket</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  Are you sure you want to delete this ticket? All associated data including remarks will be permanently removed.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteTicket}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition shadow-lg"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutWrapper>
  );
}

