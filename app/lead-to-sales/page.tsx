'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/LayoutWrapper';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';

interface Lead {
  id?: string;
  sourceOfLead: string;
  companyName: string;
  contactPerson: string;
  contactNo: string;
  address: string;
  requirements: string;
  divisions: string;
  leadAssignedTo: string;
  clientType: string;
  orderType: string;
  selectOEM: string;
  customerType: string;
  productType: string;
  qualifyingMeetDate: string;
  remarks: string;
  createdAt?: string;
  updatedAt?: string;
}

interface LeadStage {
  stageNumber: number;
  stageName: string;
  plannedDate?: string;
  actualDate?: string;
  timeDelay?: number; // in hours
  status: 'pending' | 'in-progress' | 'completed';
  details?: any;
  remarks?: string;
}

const LeadToSalesPage = () => {
  const toast = useToast();
  const loader = useLoader();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState(false);

  // Stages state
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<LeadStage | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);

  // Searchable dropdown states
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  const [formData, setFormData] = useState<Lead>({
    sourceOfLead: '',
    companyName: '',
    contactPerson: '',
    contactNo: '',
    address: '',
    requirements: '',
    divisions: '',
    leadAssignedTo: '',
    clientType: '',
    orderType: '',
    selectOEM: '',
    customerType: '',
    productType: '',
    qualifyingMeetDate: '',
    remarks: ''
  });

  // Dropdown options
  const sourceOptions = [
    'Website',
    'Referral',
    'Cold Call',
    'Email Campaign',
    'Social Media',
    'Trade Show',
    'Partner',
    'Other'
  ];

  const requirementOptions = [
    'Software Development',
    'Hardware',
    'Consulting',
    'Integration',
    'Support',
    'Training',
    'Custom Solution'
  ];

  const divisionOptions = [
    'IT',
    'Sales',
    'Marketing',
    'Operations',
    'Finance',
    'HR',
    'Engineering'
  ];

  const clientTypeOptions = [
    'Enterprise',
    'SMB',
    'Startup',
    'Government',
    'Non-Profit'
  ];

  const orderTypeOptions = [
    'New Business',
    'Renewal',
    'Upgrade',
    'Add-on'
  ];

  const oemOptions = [
    'OEM A',
    'OEM B',
    'OEM C',
    'OEM D',
    'Other'
  ];

  const customerTypeOptions = [
    'Direct',
    'Channel Partner',
    'Reseller',
    'Distributor'
  ];

  const productTypeOptions = [
    'Product A',
    'Product B',
    'Product C',
    'Service Package',
    'Custom Solution'
  ];

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, []);

  // Helper function to calculate next business day (skip Sundays)
  const getNextBusinessDay = (date: Date, daysToAdd: number = 1): Date => {
    const result = new Date(date);
    let addedDays = 0;
    
    while (addedDays < daysToAdd) {
      result.setDate(result.getDate() + 1);
      // Skip Sunday (0)
      if (result.getDay() !== 0) {
        addedDays++;
      }
    }
    
    return result;
  };

  // Initialize stages for a lead
  const initializeStages = (leadCreatedDate: string): LeadStage[] => {
    const stageNames = [
      'Select Assigned Language Person & CRM Person',
      'Lead Type',
      'Email Sent',
      'Customer & Company Details',
      'Call Done',
      'Enquiry Received',
      'Stage of Connection',
      'Meeting',
      'Priority of Lead',
      'Updated on ZOHO CRM',
      'Current Status',
      'Final Lead Status'
    ];

    const baseDate = new Date(leadCreatedDate);
    const initializedStages: LeadStage[] = [];

    stageNames.forEach((name, index) => {
      const plannedDate = getNextBusinessDay(baseDate, index + 1);
      initializedStages.push({
        stageNumber: index + 1,
        stageName: name,
        plannedDate: plannedDate.toISOString(),
        status: index === 0 ? 'in-progress' : 'pending',
        details: {},
        remarks: ''
      });
    });

    return initializedStages;
  };

  // Calculate time delay in hours
  const calculateTimeDelay = (plannedDate: string, actualDate?: string): number => {
    const planned = new Date(plannedDate);
    const actual = actualDate ? new Date(actualDate) : new Date();
    const diffMs = actual.getTime() - planned.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60)); // Convert to hours
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/lead-to-sales');
      const data = await response.json();
      if (data.success) {
        setLeads(data.data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.map((user: any) => ({
          value: user.username,
          label: user.username
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.contactPerson || !formData.contactNo) {
      toast.warning('Please fill in all required fields');
      return;
    }

    loader.showLoader();

    try {
      const endpoint = editingLead ? '/api/lead-to-sales' : '/api/lead-to-sales';
      const method = editingLead ? 'PUT' : 'POST';
      const body = editingLead ? { ...formData, id: editingLead.id } : formData;

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingLead ? 'Lead updated successfully!' : 'Lead created successfully!');
        fetchLeads();
        handleReset();
        setShowForm(false);
      } else {
        toast.error(data.error || 'Failed to save lead');
      }
    } catch (error) {
      toast.error('An error occurred while saving the lead');
      console.error('Error saving lead:', error);
    } finally {
      loader.hideLoader();
    }
  };

  const handleReset = () => {
    setFormData({
      sourceOfLead: '',
      companyName: '',
      contactPerson: '',
      contactNo: '',
      address: '',
      requirements: '',
      divisions: '',
      leadAssignedTo: '',
      clientType: '',
      orderType: '',
      selectOEM: '',
      customerType: '',
      productType: '',
      qualifyingMeetDate: '',
      remarks: ''
    });
    setEditingLead(null);
    setAssigneeSearch('');
    setShowAssigneeDropdown(false);
    setViewMode(false);
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      sourceOfLead: lead.sourceOfLead,
      companyName: lead.companyName,
      contactPerson: lead.contactPerson,
      contactNo: lead.contactNo,
      address: lead.address,
      requirements: lead.requirements,
      divisions: lead.divisions,
      leadAssignedTo: lead.leadAssignedTo,
      clientType: lead.clientType,
      orderType: lead.orderType,
      selectOEM: lead.selectOEM,
      customerType: lead.customerType,
      productType: lead.productType,
      qualifyingMeetDate: lead.qualifyingMeetDate,
      remarks: lead.remarks
    });
    setViewMode(false);
    setShowForm(true);
  };

  const handleView = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      sourceOfLead: lead.sourceOfLead,
      companyName: lead.companyName,
      contactPerson: lead.contactPerson,
      contactNo: lead.contactNo,
      address: lead.address,
      requirements: lead.requirements,
      divisions: lead.divisions,
      leadAssignedTo: lead.leadAssignedTo,
      clientType: lead.clientType,
      orderType: lead.orderType,
      selectOEM: lead.selectOEM,
      customerType: lead.customerType,
      productType: lead.productType,
      qualifyingMeetDate: lead.qualifyingMeetDate,
      remarks: lead.remarks
    });
    setViewMode(true);
    setShowForm(true);
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] bg-clip-text text-transparent">
              Lead to Sales
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your sales leads and track conversions</p>
          </div>
          <button
            onClick={() => {
              handleReset();
              setShowForm(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Lead
          </button>
        </div>

        {/* Leads Table */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Lead ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Company Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contact Person</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contact No.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Source</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Requirements</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Divisions</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Assigned To</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Client Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Order Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">OEM</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Customer Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {leads.map((lead, index) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(lead)}
                          className="p-2 text-[var(--theme-primary)] hover:text-[var(--theme-secondary)] hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 rounded-lg transition"
                          title="View Details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(lead)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleView(lead)}
                        className="text-[var(--theme-primary)] hover:text-[var(--theme-secondary)] font-semibold hover:underline"
                      >
                        #{lead.id}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{lead.companyName}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{lead.contactPerson}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{lead.contactNo}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-semibold">
                        {lead.sourceOfLead}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{lead.requirements}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{lead.divisions}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{lead.leadAssignedTo}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm font-semibold">
                        {lead.clientType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{lead.orderType}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{lead.selectOEM}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{lead.customerType}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{lead.productType}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowForm(false);
                  handleReset();
                }}
              />
              <motion.div
                className="fixed inset-0 flex items-center justify-center z-[9999] p-4 overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto my-8"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] px-8 py-6 rounded-t-2xl z-10">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {viewMode ? 'View Lead Details' : editingLead ? 'Edit Lead' : 'Add New Lead'}
                      </h2>
                      <button
                        onClick={() => {
                          setShowForm(false);
                          handleReset();
                        }}
                        className="p-2 hover:bg-white/20 rounded-lg transition"
                      >
                        <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Modal Body */}
                  {viewMode ? (
                    <div className="p-8 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                            Source of Lead
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.sourceOfLead || '-'}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                            </svg>
                            Company Name
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.companyName || '-'}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            Contact Person
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.contactPerson || '-'}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                            </svg>
                            Contact No.
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.contactNo || '-'}</p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          Address
                        </div>
                        <p className="text-base font-medium text-gray-900 dark:text-white">{formData.address || '-'}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            Requirements
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.requirements || '-'}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                            Divisions
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.divisions || '-'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                            Lead Assigned To
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.leadAssignedTo || '-'}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                            Client Type
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.clientType || '-'}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                            </svg>
                            Order Type
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.orderType || '-'}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                              <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                            </svg>
                            Select OEM
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.selectOEM || '-'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                            Customer Type
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.customerType || '-'}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                            </svg>
                            Product Type
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.productType || '-'}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            Qualifying Meet Date
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white">{formData.qualifyingMeetDate || '-'}</p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                          Remarks
                        </div>
                        <p className="text-base font-medium text-gray-900 dark:text-white">{formData.remarks || '-'}</p>
                      </div>

                      {/* Stages Flow Section */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
                            </svg>
                            Lead Stages Flow
                          </h3>
                          <button
                            onClick={() => {
                              if (editingLead?.createdAt) {
                                const initialStages = initializeStages(editingLead.createdAt);
                                setStages(initialStages);
                              }
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-lg font-semibold hover:shadow-lg transition"
                          >
                            Initialize Stages
                          </button>
                        </div>

                        {/* Stages Timeline */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 space-y-4">
                          {stages.length === 0 ? (
                            <div className="text-center py-12">
                              <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <p className="text-gray-600 dark:text-gray-400 text-lg">No stages initialized yet</p>
                              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Click "Initialize Stages" to start tracking</p>
                            </div>
                          ) : (
                            stages.map((stage, index) => (
                              <div
                                key={stage.stageNumber}
                                className="relative"
                              >
                                {/* Connector Line */}
                                {index < stages.length - 1 && (
                                  <div className="absolute left-6 top-16 w-0.5 h-12 bg-gradient-to-b from-[var(--theme-primary)] to-[var(--theme-secondary)]" />
                                )}

                                {/* Stage Card */}
                                <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all">
                                  <div className="flex items-start gap-4">
                                    {/* Stage Number Badge */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                      stage.status === 'completed' 
                                        ? 'bg-gradient-to-br from-green-400 to-green-600 text-white'
                                        : stage.status === 'in-progress'
                                        ? 'bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900'
                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                    }`}>
                                      {stage.status === 'completed' ? (
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      ) : stage.stageNumber}
                                    </div>

                                    {/* Stage Content */}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                                          {stage.stageName}
                                        </h4>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                          stage.status === 'completed'
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                            : stage.status === 'in-progress'
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                        }`}>
                                          {stage.status === 'completed' ? '✓ Completed' : stage.status === 'in-progress' ? '⟳ In Progress' : '○ Pending'}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400 font-semibold">Planned Date</p>
                                          <p className="text-gray-900 dark:text-white">
                                            {stage.plannedDate ? new Date(stage.plannedDate).toLocaleString() : '-'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400 font-semibold">Actual Date</p>
                                          <p className="text-gray-900 dark:text-white">
                                            {stage.actualDate ? new Date(stage.actualDate).toLocaleString() : '-'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400 font-semibold">Time Delay</p>
                                          <p className={`font-bold ${
                                            stage.plannedDate && calculateTimeDelay(stage.plannedDate, stage.actualDate) > 0
                                              ? 'text-red-600 dark:text-red-400'
                                              : 'text-green-600 dark:text-green-400'
                                          }`}>
                                            {stage.plannedDate ? `${calculateTimeDelay(stage.plannedDate, stage.actualDate)}h` : '-'}
                                          </p>
                                        </div>
                                      </div>

                                      {stage.remarks && (
                                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">Remarks:</p>
                                          <p className="text-sm text-gray-900 dark:text-white">{stage.remarks}</p>
                                        </div>
                                      )}

                                      <div className="flex gap-2 mt-3">
                                        <button
                                          onClick={() => {
                                            setSelectedStage(stage);
                                            setShowStageModal(true);
                                          }}
                                          className="px-4 py-2 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-lg font-semibold hover:shadow-lg transition text-sm"
                                        >
                                          {stage.status === 'completed' ? 'View Details' : 'Update Stage'}
                                        </button>
                                        {stage.status !== 'completed' && (
                                          <button
                                            onClick={() => {
                                              // Check if previous stage is completed (except for first stage)
                                              if (index > 0 && stages[index - 1].status !== 'completed') {
                                                toast.warning('Please complete the previous stage first!');
                                                return;
                                              }
                                              
                                              const updatedStages = [...stages];
                                              updatedStages[index] = {
                                                ...stage,
                                                status: 'completed',
                                                actualDate: new Date().toISOString()
                                              };
                                              if (index < stages.length - 1) {
                                                updatedStages[index + 1].status = 'in-progress';
                                              }
                                              setStages(updatedStages);
                                              toast.success('Stage marked as completed!');
                                            }}
                                            disabled={index > 0 && stages[index - 1].status !== 'completed'}
                                            className={`px-4 py-2 rounded-lg font-semibold transition text-sm flex items-center gap-2 ${
                                              index > 0 && stages[index - 1].status !== 'completed'
                                                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                                : 'bg-green-500 hover:bg-green-600 text-white'
                                            }`}
                                          >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Mark Complete
                                          </button>
                                        )}
                                        {stage.status === 'completed' && (
                                          <button
                                            onClick={() => {
                                              if (window.confirm('Are you sure you want to reset this stage? This will also reset all subsequent stages.')) {
                                                const updatedStages = [...stages];
                                                // Reset current and all subsequent stages
                                                for (let i = index; i < updatedStages.length; i++) {
                                                  updatedStages[i] = {
                                                    ...updatedStages[i],
                                                    status: i === index ? 'in-progress' : 'pending',
                                                    actualDate: undefined,
                                                    remarks: ''
                                                  };
                                                }
                                                setStages(updatedStages);
                                                toast.success('Stage reset successfully!');
                                              }
                                            }}
                                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition text-sm flex items-center gap-2"
                                            title="Reset this stage"
                                          >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Reset
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                  <form onSubmit={handleSubmit} className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Source of Lead */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                          </svg>
                          Source of Lead *
                        </label>
                        <select
                          value={formData.sourceOfLead}
                          onChange={(e) => setFormData({ ...formData, sourceOfLead: e.target.value })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white transition-all"
                          required
                          disabled={viewMode}
                        >
                          <option value="">Select source...</option>
                          {sourceOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Company Name */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                          </svg>
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="Enter company name"
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                          required
                          disabled={viewMode}
                        />
                      </div>

                      {/* Contact Person */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          Contact Person *
                        </label>
                        <input
                          type="text"
                          value={formData.contactPerson}
                          onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                          placeholder="Enter contact person name"
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                          required
                          disabled={viewMode}
                        />
                      </div>

                      {/* Contact No */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                          Contact No. *
                        </label>
                        <input
                          type="tel"
                          value={formData.contactNo}
                          onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                          placeholder="Enter contact number"
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                          required
                          disabled={viewMode}
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mt-6">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Address
                      </label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter complete address"
                        rows={3}
                        className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                        disabled={viewMode}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      {/* Requirements */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                          </svg>
                          Requirements *
                        </label>
                        <select
                          value={formData.requirements}
                          onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white transition-all"
                          required
                          disabled={viewMode}
                        >
                          <option value="">Select requirement...</option>
                          {requirementOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Divisions */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                          </svg>
                          Divisions *
                        </label>
                        <select
                          value={formData.divisions}
                          onChange={(e) => setFormData({ ...formData, divisions: e.target.value })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white transition-all"
                          required
                          disabled={viewMode}
                        >
                          <option value="">Select division...</option>
                          {divisionOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                      {/* Lead Assigned To */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                          Lead Assigned To *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.leadAssignedTo || assigneeSearch}
                            onChange={(e) => {
                              setAssigneeSearch(e.target.value);
                              setFormData({ ...formData, leadAssignedTo: '' });
                              setShowAssigneeDropdown(true);
                            }}
                            onFocus={() => setShowAssigneeDropdown(true)}
                            placeholder="Search user..."
                            className="w-full px-4 py-3 pr-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white transition-all"
                            required
                            disabled={viewMode}
                          />
                          <svg className="absolute right-3 top-3.5 w-5 h-5 text-[var(--theme-primary)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>

                          {showAssigneeDropdown && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setShowAssigneeDropdown(false)} />
                              <motion.div
                                className="absolute z-40 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-[var(--theme-primary)]/30 dark:border-[var(--theme-primary)]/50 max-h-64 overflow-y-auto"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                              >
                                {users
                                  .filter(u => u.label.toLowerCase().includes((assigneeSearch || '').toLowerCase()))
                                  .map(u => (
                                    <button
                                      key={u.value}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, leadAssignedTo: u.value });
                                        setAssigneeSearch('');
                                        setShowAssigneeDropdown(false);
                                      }}
                                      className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-[var(--theme-primary)]/20 hover:to-[var(--theme-secondary)]/20 dark:hover:from-[var(--theme-primary)]/30 dark:hover:to-[var(--theme-secondary)]/30 transition-all text-sm text-gray-900 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700 last:border-0"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-full flex items-center justify-center text-xs font-bold text-gray-900">
                                          {u.label[0]?.toUpperCase()}
                                        </div>
                                        {u.label}
                                      </div>
                                    </button>
                                  ))}
                                {users.filter(u => u.label.toLowerCase().includes((assigneeSearch || '').toLowerCase())).length === 0 && (
                                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                    No users found
                                  </div>
                                )}
                              </motion.div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Client Type */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                          </svg>
                          Client Type *
                        </label>
                        <select
                          value={formData.clientType}
                          onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white transition-all"
                          required
                          disabled={viewMode}
                        >
                          <option value="">Select client type...</option>
                          {clientTypeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Order Type */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                          </svg>
                          Order Type *
                        </label>
                        <select
                          value={formData.orderType}
                          onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white transition-all"
                          required
                          disabled={viewMode}
                        >
                          <option value="">Select order type...</option>
                          {orderTypeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select OEM */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                            <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                          </svg>
                          Select OEM *
                        </label>
                        <select
                          value={formData.selectOEM}
                          onChange={(e) => setFormData({ ...formData, selectOEM: e.target.value })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white transition-all"
                          required
                          disabled={viewMode}
                        >
                          <option value="">Select OEM...</option>
                          {oemOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                      {/* Customer Type */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                          Customer Type *
                        </label>
                        <select
                          value={formData.customerType}
                          onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white transition-all"
                          required
                          disabled={viewMode}
                        >
                          <option value="">Select customer type...</option>
                          {customerTypeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Product Type */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                          </svg>
                          Product Type *
                        </label>
                        <select
                          value={formData.productType}
                          onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white transition-all"
                          required
                          disabled={viewMode}
                        >
                          <option value="">Select product type...</option>
                          {productTypeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Qualifying Meet Date */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          Qualifying Meet Date
                        </label>
                        <input
                          type="date"
                          value={formData.qualifyingMeetDate}
                          onChange={(e) => setFormData({ ...formData, qualifyingMeetDate: e.target.value })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white transition-all"
                          disabled={viewMode}
                        />
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="mt-6">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <svg className="w-4 h-4 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        Remarks
                      </label>
                      <textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        placeholder="Enter remarks"
                        rows={3}
                        className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-[var(--theme-primary)]/20 dark:border-[var(--theme-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                        disabled={viewMode}
                      />
                    </div>

                    {/* Action Buttons */}
                    {!viewMode && (
                    <div className="flex gap-4 mt-8">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset Form
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {editingLead ? 'Update Lead' : 'Submit Lead'}
                      </button>
                    </div>
                    )}
                  </form>
                  )}
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </LayoutWrapper>
  );
};

export default LeadToSalesPage;
