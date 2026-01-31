'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/LayoutWrapper';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';
import jsPDF from 'jspdf';

interface MeetingMinute {
  sno: number;
  minutesDiscussed: string;
  actionBy: string;
  plannedStart: string;
  plannedCompletion: string;
  actualCompletion: string;
  delayed: string;
  remarks: string;
}

interface MOM {
  id?: number;
  momNo?: string;
  projectName: string;
  date: string;
  time: string;
  location: string;
  raTeam: string[];
  clientTeam: string[];
  vendorTeam: string[];
  other: string[];
  meetingMinutes: MeetingMinute[];
  infoPoints?: number;
  pendingActions?: number;
  createdAt?: string;
  updatedAt?: string;
}

const MOMPage = () => {
  const router = useRouter();
  const toast = useToast();
  const loader = useLoader();

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [moms, setMoms] = useState<MOM[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [editingMOM, setEditingMOM] = useState<MOM | null>(null);

  // Date/Time Picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  // Form state
  const [formData, setFormData] = useState<MOM>({
    projectName: '',
    date: '',
    time: '',
    location: '',
    raTeam: [],
    clientTeam: [],
    vendorTeam: [],
    other: [],
    meetingMinutes: [
      {
        sno: 1,
        minutesDiscussed: '',
        actionBy: '',
        plannedStart: '',
        plannedCompletion: '',
        actualCompletion: '',
        delayed: '',
        remarks: ''
      }
    ]
  });

  // New member input states
  const [newRaMember, setNewRaMember] = useState('');
  const [newClientMember, setNewClientMember] = useState('');
  const [newVendorMember, setNewVendorMember] = useState('');
  const [newOtherMember, setNewOtherMember] = useState('');

  // Searchable dropdown states
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Date pickers for meeting minutes
  const [activeDatePicker, setActiveDatePicker] = useState<{ index: number; field: 'plannedStart' | 'plannedCompletion' } | null>(null);
  const [minuteDatePickerDate, setMinuteDatePickerDate] = useState(new Date());

  // Action By searchable dropdown states
  const [actionBySearch, setActionBySearch] = useState<{ [key: number]: string }>({});
  const [showActionByDropdown, setShowActionByDropdown] = useState<number | null>(null);

  // Fetch MOMs, projects, and users
  useEffect(() => {
    fetchMOMs();
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchMOMs = async () => {
    try {
      const response = await fetch('/api/mom');
      const data = await response.json();
      if (data.success) {
        setMoms(data.data);
      }
    } catch (error) {
      console.error('Error fetching MOMs:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/checklists');
      const data = await response.json();
      if (data.success) {
        const uniqueProjects = Array.from(
          new Set(data.data.map((item: any) => item.projectName))
        ).map(name => ({ label: name, value: name }));
        setProjects(uniqueProjects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.map((user: any) => ({
          label: user.username,
          value: user.username
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleDateTimeSet = () => {
    const hour24 = selectedPeriod === 'PM' && selectedHour !== 12
      ? selectedHour + 12
      : selectedPeriod === 'AM' && selectedHour === 12
        ? 0
        : selectedHour;

    const dateTime = new Date(selectedDate);
    dateTime.setHours(hour24, selectedMinute, 0, 0);

    // Format date and time separately
    const year = dateTime.getFullYear();
    const month = String(dateTime.getMonth() + 1).padStart(2, '0');
    const day = String(dateTime.getDate()).padStart(2, '0');
    const hours = String(dateTime.getHours()).padStart(2, '0');
    const minutes = String(dateTime.getMinutes()).padStart(2, '0');

    setFormData({
      ...formData,
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    });
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleAddDiscussionPoint = () => {
    setFormData({
      ...formData,
      meetingMinutes: [
        ...formData.meetingMinutes,
        {
          sno: formData.meetingMinutes.length + 1,
          minutesDiscussed: '',
          actionBy: '',
          plannedStart: '',
          plannedCompletion: '',
          actualCompletion: '',
          delayed: '',
          remarks: ''
        }
      ]
    });
  };

  const handleRemoveDiscussionPoint = (index: number) => {
    const newMinutes = formData.meetingMinutes.filter((_, i) => i !== index);
    const reindexedMinutes = newMinutes.map((minute, i) => ({ ...minute, sno: i + 1 }));
    setFormData({ ...formData, meetingMinutes: reindexedMinutes });
  };

  const handleMinuteChange = (index: number, field: keyof MeetingMinute, value: string) => {
    const newMinutes = [...formData.meetingMinutes];
    newMinutes[index] = { ...newMinutes[index], [field]: value };

    // Auto-calculate delayed days
    if (field === 'actualCompletion' || field === 'plannedCompletion') {
      const planned = field === 'plannedCompletion' ? value : newMinutes[index].plannedCompletion;
      const actual = field === 'actualCompletion' ? value : newMinutes[index].actualCompletion;
      
      if (planned && actual) {
        const plannedDate = new Date(planned);
        const actualDate = new Date(actual);
        const diffTime = actualDate.getTime() - plannedDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        newMinutes[index].delayed = diffDays > 0 ? diffDays.toString() : '0';
      }
    }

    setFormData({ ...formData, meetingMinutes: newMinutes });
  };

  const handleMinuteDateSet = (index: number, field: 'plannedStart' | 'plannedCompletion') => {
    const year = minuteDatePickerDate.getFullYear();
    const month = String(minuteDatePickerDate.getMonth() + 1).padStart(2, '0');
    const day = String(minuteDatePickerDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    handleMinuteChange(index, field, dateString);
    setActiveDatePicker(null);
  };

  const handleAddProject = () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }
    
    const trimmedName = newProjectName.trim();
    
    // Check if project already exists
    if (projects.some(p => p.label.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('Project already exists');
      return;
    }
    
    const newProject = { label: trimmedName, value: trimmedName };
    setProjects([...projects, newProject].sort((a, b) => a.label.localeCompare(b.label)));
    
    // Set the new project as selected
    setFormData({ ...formData, projectName: trimmedName });
    
    toast.success('Project added successfully!');
    setShowAddProjectModal(false);
    setNewProjectName('');
    setShowProjectDropdown(false);
  };

  const handleAddMember = (team: 'raTeam' | 'clientTeam' | 'vendorTeam' | 'other', memberName: string) => {
    if (memberName.trim()) {
      setFormData({
        ...formData,
        [team]: [...formData[team], memberName.trim()]
      });
      // Clear the input
      if (team === 'raTeam') setNewRaMember('');
      if (team === 'clientTeam') setNewClientMember('');
      if (team === 'vendorTeam') setNewVendorMember('');
      if (team === 'other') setNewOtherMember('');
    }
  };

  const handleRemoveMember = (team: 'raTeam' | 'clientTeam' | 'vendorTeam' | 'other', index: number) => {
    setFormData({
      ...formData,
      [team]: formData[team].filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loader.showLoader();

    try {
      const url = '/api/mom';
      const method = editingMOM ? 'PUT' : 'POST';
      const body = editingMOM ? { ...formData, id: editingMOM.id } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingMOM ? 'MOM updated successfully!' : 'MOM created successfully!');
        closeModal();
        fetchMOMs();
      } else {
        toast.error('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error submitting MOM:', error);
      toast.error('Error submitting MOM');
    } finally {
      loader.hideLoader();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMOM(null);
    setFormData({
      projectName: '',
      date: '',
      time: '',
      location: '',
      raTeam: [],
      clientTeam: [],
      vendorTeam: [],
      other: [],
      meetingMinutes: [
        {
          sno: 1,
          minutesDiscussed: '',
          actionBy: '',
          plannedStart: '',
          plannedCompletion: '',
          actualCompletion: '',
          delayed: '',
          remarks: ''
        }
      ]
    });
    setProjectSearch('');
    setShowProjectDropdown(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setNewRaMember('');
    setNewClientMember('');
    setNewVendorMember('');
    setNewOtherMember('');
    setShowAddProjectModal(false);
    setNewProjectName('');
    setActiveDatePicker(null);
    setActionBySearch({});
    setShowActionByDropdown(null);
  };

  const handleEdit = (mom: MOM) => {
    setEditingMOM(mom);
    setFormData({
      projectName: mom.projectName,
      date: mom.date,
      time: mom.time,
      location: mom.location,
      raTeam: mom.raTeam,
      clientTeam: mom.clientTeam,
      vendorTeam: mom.vendorTeam,
      other: mom.other,
      meetingMinutes: mom.meetingMinutes
    });
    setShowModal(true);
  };

  const handleView = (mom: MOM) => {
    setEditingMOM(mom);
    setFormData({
      projectName: mom.projectName,
      date: mom.date,
      time: mom.time,
      location: mom.location,
      raTeam: mom.raTeam,
      clientTeam: mom.clientTeam,
      vendorTeam: mom.vendorTeam,
      other: mom.other,
      meetingMinutes: mom.meetingMinutes
    });
    setShowModal(true);
  };

  const generatePDF = (mom: MOM) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header with gradient effect (simulated with rectangles)
    doc.setFillColor(234, 179, 8); // Yellow
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFillColor(202, 154, 4); // Darker yellow
    doc.rect(0, 30, pageWidth, 5, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Minutes of Meeting', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text(mom.momNo || '', pageWidth / 2, 27, { align: 'center' });

    yPos = 45;
    doc.setTextColor(0, 0, 0);

    // Meeting Details Box
    doc.setFillColor(254, 249, 195); // Light yellow
    doc.roundedRect(10, yPos, pageWidth - 20, 45, 3, 3, 'F');
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.5);
    doc.roundedRect(10, yPos, pageWidth - 20, 45, 3, 3, 'S');

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Project:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(mom.projectName, 40, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(mom.date, 40, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text('Time:', 100, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(mom.time, 120, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Location:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(mom.location, 40, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Info Points:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(String(mom.infoPoints || 0), 45, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text('Pending Actions:', 100, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(String(mom.pendingActions || 0), 135, yPos);

    yPos += 15;

    // Attendees Section
    const addAttendeeSection = (title: string, members: string[]) => {
      if (members && members.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(234, 179, 8);
        doc.text(title, 15, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        members.forEach(member => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`• ${member}`, 20, yPos);
          yPos += 5;
        });
        yPos += 3;
      }
    };

    addAttendeeSection('RA Team:', mom.raTeam || []);
    addAttendeeSection('Client Team:', mom.clientTeam || []);
    addAttendeeSection('Vendor Team:', mom.vendorTeam || []);
    addAttendeeSection('Others:', mom.other || []);

    yPos += 5;

    // Meeting Minutes Table
    if (mom.meetingMinutes && mom.meetingMinutes.length > 0) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(234, 179, 8);
      doc.text('Meeting Minutes', 15, yPos);
      yPos += 8;

      // Table header
      doc.setFillColor(234, 179, 8);
      doc.rect(10, yPos - 5, pageWidth - 20, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('S.No', 12, yPos);
      doc.text('Discussion', 25, yPos);
      doc.text('Action By', 110, yPos);
      doc.text('Planned Start', 140, yPos);
      doc.text('Planned End', 170, yPos);
      yPos += 8;

      // Table rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      mom.meetingMinutes.forEach((minute, index) => {
        if (yPos > pageHeight - 15) {
          doc.addPage();
          yPos = 20;
          // Re-add header on new page
          doc.setFillColor(234, 179, 8);
          doc.rect(10, yPos - 5, pageWidth - 20, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('S.No', 12, yPos);
          doc.text('Discussion', 25, yPos);
          doc.text('Action By', 110, yPos);
          doc.text('Planned Start', 140, yPos);
          doc.text('Planned End', 170, yPos);
          yPos += 8;
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(254, 252, 232);
          doc.rect(10, yPos - 4, pageWidth - 20, 7, 'F');
        }

        doc.text(String(minute.sno), 12, yPos);
        
        // Wrap long text
        const discussion = doc.splitTextToSize(minute.minutesDiscussed, 80);
        doc.text(discussion[0] || '', 25, yPos);
        
        const actionBy = users.find(u => u.value === minute.actionBy)?.label || minute.actionBy;
        doc.text(actionBy || '', 110, yPos);
        doc.text(minute.plannedStart || '', 140, yPos);
        doc.text(minute.plannedCompletion || '', 170, yPos);
        
        yPos += 7;
      });
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Download
    doc.save(`MOM_${mom.momNo || 'document'}.pdf`);
    toast.success('PDF downloaded successfully!');
  };

  return (
    <LayoutWrapper>
      <motion.div
        className="p-6 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Submitted MOMs</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your Minutes of Meeting records</p>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              setEditingMOM(null);
            }}
            className="px-6 py-3 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] hover:shadow-lg text-gray-900 font-semibold rounded-xl transition-all duration-200 shadow-md flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New MOM
          </button>
        </div>

        {/* MOMs Table */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">MOM NO.</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">PROJECT NAME</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">DATE</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">INFO POINTS</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">PENDING ACTIONS</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {moms.map((mom, index) => (
                  <motion.tr
                    key={mom.momNo}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleView(mom)}
                        className="text-[var(--theme-primary)] hover:text-[var(--theme-secondary)] font-semibold hover:underline"
                      >
                        {mom.momNo}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{mom.projectName}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{mom.date}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-semibold">
                        {mom.infoPoints}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        mom.pendingActions === 0 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : mom.pendingActions === 1 
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {mom.pendingActions}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(mom)}
                          className="p-2 text-[var(--theme-primary)] hover:text-[var(--theme-secondary)] hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 rounded-lg transition"
                          title="View Details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(mom)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => generatePDF(mom)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition"
                          title="Download PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {moms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No MOMs found</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Create your first MOM to get started</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-[9996]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />

            {/* Modal Content */}
            <motion.div
              className="fixed inset-0 z-[9997] flex items-center justify-center p-4 pointer-events-none"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] p-6 sticky top-0 z-10">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {editingMOM ? 'Update MOM' : 'Create New MOM'}
                    </h2>
                    <button
                      onClick={closeModal}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Form - Scrollable */}
                <div className="overflow-y-auto flex-1">
                  <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Project, Date, Time, Location */}
                    <motion.div
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {/* Project Searchable Dropdown */}
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Project <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.projectName || projectSearch}
                            onChange={(e) => {
                              setProjectSearch(e.target.value);
                              setFormData({ ...formData, projectName: '' });
                              setShowProjectDropdown(true);
                            }}
                            onFocus={() => setShowProjectDropdown(true)}
                            placeholder="Search project..."
                            className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                            required
                          />
                          <svg className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>

                        {showProjectDropdown && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowProjectDropdown(false)} />
                            <motion.div
                              className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {/* Add New Project Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddProjectModal(true);
                                  setShowProjectDropdown(false);
                                }}
                                className="w-full px-4 py-2.5 text-left bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] transition text-sm text-gray-900 font-semibold flex items-center gap-2 border-b-2 border-gray-300 dark:border-gray-600"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add New Project
                              </button>

                              {/* Project List */}
                              {projects
                                .filter(p => p.label.toLowerCase().includes(projectSearch.toLowerCase()))
                                .map(p => (
                                  <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, projectName: p.value });
                                      setProjectSearch('');
                                      setShowProjectDropdown(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 transition text-sm text-gray-900 dark:text-white"
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              {projects.filter(p => p.label.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                                  No projects found
                                </div>
                              )}
                            </motion.div>
                          </>
                        )}
                      </div>

                      {/* Date with Custom Picker */}
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDatePicker(!showDatePicker);
                            setShowTimePicker(false);
                          }}
                          className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm text-left flex items-center justify-between"
                        >
                          <span>{formData.date || 'Select date'}</span>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* Date Picker Dropdown */}
                        <AnimatePresence>
                          {showDatePicker && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowDatePicker(false)} />
                              <motion.div
                                className="absolute z-20 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                  </button>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
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
                                    const isSelected = selectedDate.getDate() === day;
                                    return (
                                      <button
                                        key={day}
                                        type="button"
                                        onClick={() => {
                                          const newDate = new Date(selectedDate);
                                          newDate.setDate(day);
                                          setSelectedDate(newDate);
                                        }}
                                        className={`p-2 rounded text-sm ${
                                          isSelected
                                            ? 'bg-[var(--theme-primary)] text-gray-900 font-bold'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                        }`}
                                      >
                                        {day}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <button
                                    type="button"
                                    onClick={() => setShowDatePicker(false)}
                                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-semibold"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleDateTimeSet}
                                    className="flex-1 px-3 py-2 bg-[var(--theme-primary)] text-gray-900 rounded-lg text-sm font-semibold"
                                  >
                                    Set
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Time with Custom Picker */}
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Time <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTimePicker(!showTimePicker);
                            setShowDatePicker(false);
                          }}
                          className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm text-left flex items-center justify-between"
                        >
                          <span>{formData.time || 'Select time'}</span>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>

                        {/* Time Picker Dropdown */}
                        <AnimatePresence>
                          {showTimePicker && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowTimePicker(false)} />
                              <motion.div
                                className="absolute z-20 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                              >
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                  {/* Hour */}
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Hour</label>
                                    <select
                                      value={selectedHour}
                                      onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                                      className="w-full px-2 py-1.5 bg-[var(--theme-lighter)] dark:bg-gray-700 rounded-lg text-sm"
                                    >
                                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                        <option key={h} value={h}>{h}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {/* Minute */}
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Min</label>
                                    <select
                                      value={selectedMinute}
                                      onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                                      className="w-full px-2 py-1.5 bg-[var(--theme-lighter)] dark:bg-gray-700 rounded-lg text-sm"
                                    >
                                      {Array.from({ length: 4 }, (_, i) => i * 15).map(m => (
                                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {/* AM/PM */}
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Period</label>
                                    <select
                                      value={selectedPeriod}
                                      onChange={(e) => setSelectedPeriod(e.target.value as 'AM' | 'PM')}
                                      className="w-full px-2 py-1.5 bg-[var(--theme-lighter)] dark:bg-gray-700 rounded-lg text-sm"
                                    >
                                      <option value="AM">AM</option>
                                      <option value="PM">PM</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowTimePicker(false)}
                                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-semibold"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleDateTimeSet}
                                    className="flex-1 px-3 py-2 bg-[var(--theme-primary)] text-gray-900 rounded-lg text-sm font-semibold"
                                  >
                                    Set
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Location / Meeting Link
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-sm"
                          placeholder="Enter location or link"
                        />
                      </div>
                    </motion.div>

                    {/* Attendees */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Attendees</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* RA Team */}
                        <div className="bg-[var(--theme-lighter)] dark:bg-gray-700/50 rounded-xl p-4">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            RA Team
                          </label>
                          <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                            {formData.raTeam.map((member, index) => (
                              <div key={index} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg">
                                <span className="flex-1 text-sm text-gray-900 dark:text-white">{member}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember('raTeam', index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newRaMember}
                              onChange={(e) => setNewRaMember(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddMember('raTeam', newRaMember);
                                }
                              }}
                              placeholder="Add member"
                              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border-0 rounded-lg text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddMember('raTeam', newRaMember)}
                              className="px-3 py-1.5 bg-[var(--theme-primary)] text-gray-900 rounded-lg text-sm font-semibold"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Client Team */}
                        <div className="bg-[var(--theme-lighter)] dark:bg-gray-700/50 rounded-xl p-4">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Client Team
                          </label>
                          <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                            {formData.clientTeam.map((member, index) => (
                              <div key={index} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg">
                                <span className="flex-1 text-sm text-gray-900 dark:text-white">{member}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember('clientTeam', index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newClientMember}
                              onChange={(e) => setNewClientMember(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddMember('clientTeam', newClientMember);
                                }
                              }}
                              placeholder="Add member"
                              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border-0 rounded-lg text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddMember('clientTeam', newClientMember)}
                              className="px-3 py-1.5 bg-[var(--theme-primary)] text-gray-900 rounded-lg text-sm font-semibold"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Vendor Team */}
                        <div className="bg-[var(--theme-lighter)] dark:bg-gray-700/50 rounded-xl p-4">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Vendor Team
                          </label>
                          <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                            {formData.vendorTeam.map((member, index) => (
                              <div key={index} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg">
                                <span className="flex-1 text-sm text-gray-900 dark:text-white">{member}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember('vendorTeam', index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newVendorMember}
                              onChange={(e) => setNewVendorMember(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddMember('vendorTeam', newVendorMember);
                                }
                              }}
                              placeholder="Add member"
                              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border-0 rounded-lg text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddMember('vendorTeam', newVendorMember)}
                              className="px-3 py-1.5 bg-[var(--theme-primary)] text-gray-900 rounded-lg text-sm font-semibold"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Other */}
                        <div className="bg-[var(--theme-lighter)] dark:bg-gray-700/50 rounded-xl p-4">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Other
                          </label>
                          <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                            {formData.other.map((member, index) => (
                              <div key={index} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg">
                                <span className="flex-1 text-sm text-gray-900 dark:text-white">{member}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember('other', index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newOtherMember}
                              onChange={(e) => setNewOtherMember(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddMember('other', newOtherMember);
                                }
                              }}
                              placeholder="Add member"
                              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border-0 rounded-lg text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddMember('other', newOtherMember)}
                              className="px-3 py-1.5 bg-[var(--theme-primary)] text-gray-900 rounded-lg text-sm font-semibold"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Meeting Minutes */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Meeting Minutes</h3>
                        <button
                          type="button"
                          onClick={handleAddDiscussionPoint}
                          className="px-4 py-2 bg-[var(--theme-primary)] text-gray-900 rounded-lg text-sm font-semibold flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Point
                        </button>
                      </div>
                      <div className="overflow-x-auto bg-[var(--theme-lighter)] dark:bg-gray-700/50 rounded-xl">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-200 dark:bg-gray-800">
                              <th className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 min-w-[50px]">S.No</th>
                              <th className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 min-w-[250px]">Minutes Discussed</th>
                              <th className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 min-w-[150px]">Action By</th>
                              <th className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 min-w-[140px]">Planned Start</th>
                              <th className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 min-w-[140px]">Planned Completion</th>
                              <th className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 min-w-[140px]">Actual Completion</th>
                              <th className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 min-w-[80px]">Delayed (Days)</th>
                              <th className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 min-w-[200px]">Remarks</th>
                              <th className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 min-w-[60px]">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.meetingMinutes.map((minute, index) => (
                              <tr key={index} className="hover:bg-white/50 dark:hover:bg-gray-800/50">
                                <td className="px-3 py-2 text-center border border-gray-300 dark:border-gray-600 font-semibold">
                                  {minute.sno}
                                </td>
                                <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">
                                  <textarea
                                    value={minute.minutesDiscussed}
                                    onChange={(e) => handleMinuteChange(index, 'minutesDiscussed', e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-gray-700 border-0 focus:ring-1 focus:ring-[var(--theme-primary)] text-gray-900 dark:text-white text-sm rounded"
                                    rows={2}
                                    required
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={minute.actionBy || actionBySearch[index] || ''}
                                      onChange={(e) => {
                                        setActionBySearch({ ...actionBySearch, [index]: e.target.value });
                                        handleMinuteChange(index, 'actionBy', '');
                                        setShowActionByDropdown(index);
                                      }}
                                      onFocus={() => setShowActionByDropdown(index)}
                                      placeholder="Search user..."
                                      className="w-full px-2 py-1 bg-white dark:bg-gray-700 border-0 focus:ring-1 focus:ring-[var(--theme-primary)] text-gray-900 dark:text-white text-sm rounded"
                                      required
                                    />
                                    <svg className="absolute right-2 top-2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>

                                    {showActionByDropdown === index && (
                                      <>
                                        <div className="fixed inset-0 z-30" onClick={() => setShowActionByDropdown(null)} />
                                        <motion.div
                                          className="absolute z-40 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto"
                                          initial={{ opacity: 0, y: -10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                        >
                                          {users
                                            .filter(u => u.label.toLowerCase().includes((actionBySearch[index] || '').toLowerCase()))
                                            .map(u => (
                                              <button
                                                key={u.value}
                                                type="button"
                                                onClick={() => {
                                                  handleMinuteChange(index, 'actionBy', u.value);
                                                  setActionBySearch({ ...actionBySearch, [index]: '' });
                                                  setShowActionByDropdown(null);
                                                }}
                                                className="w-full px-3 py-2 text-left hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 transition text-sm text-gray-900 dark:text-white"
                                              >
                                                {u.label}
                                              </button>
                                            ))}
                                          {users.filter(u => u.label.toLowerCase().includes((actionBySearch[index] || '').toLowerCase())).length === 0 && (
                                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                              No users found
                                            </div>
                                          )}
                                        </motion.div>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDatePicker({ index, field: 'plannedStart' });
                                        setMinuteDatePickerDate(minute.plannedStart ? new Date(minute.plannedStart) : new Date());
                                      }}
                                      className="w-full px-2 py-1 bg-white dark:bg-gray-700 border-0 focus:ring-1 focus:ring-[var(--theme-primary)] text-gray-900 dark:text-white text-sm rounded text-left flex items-center justify-between"
                                    >
                                      <span className="text-xs">{minute.plannedStart || 'Select'}</span>
                                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </button>

                                    {activeDatePicker?.index === index && activeDatePicker?.field === 'plannedStart' && (
                                      <>
                                        <div className="fixed inset-0 z-30" onClick={() => setActiveDatePicker(null)} />
                                        <motion.div
                                          className="fixed z-40 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
                                          style={{
                                            left: '50%',
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)'
                                          }}
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                        >
                                          <div className="flex items-center justify-between mb-3">
                                            <button
                                              type="button"
                                              onClick={() => setMinuteDatePickerDate(new Date(minuteDatePickerDate.getFullYear(), minuteDatePickerDate.getMonth() - 1))}
                                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            >
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                              </svg>
                                            </button>
                                            <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                              {minuteDatePickerDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setMinuteDatePickerDate(new Date(minuteDatePickerDate.getFullYear(), minuteDatePickerDate.getMonth() + 1))}
                                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
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
                                            {Array.from({ length: getFirstDayOfMonth(minuteDatePickerDate) }).map((_, i) => (
                                              <div key={`empty-${i}`} />
                                            ))}
                                            {Array.from({ length: getDaysInMonth(minuteDatePickerDate) }).map((_, i) => {
                                              const day = i + 1;
                                              const isSelected = minuteDatePickerDate.getDate() === day;
                                              return (
                                                <button
                                                  key={day}
                                                  type="button"
                                                  onClick={() => {
                                                    const newDate = new Date(minuteDatePickerDate);
                                                    newDate.setDate(day);
                                                    setMinuteDatePickerDate(newDate);
                                                  }}
                                                  className={`p-1.5 rounded text-xs ${
                                                    isSelected
                                                      ? 'bg-[var(--theme-primary)] text-gray-900 font-bold'
                                                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                                  }`}
                                                >
                                                  {day}
                                                </button>
                                              );
                                            })}
                                          </div>
                                          <div className="flex gap-2 mt-3">
                                            <button
                                              type="button"
                                              onClick={() => setActiveDatePicker(null)}
                                              className="flex-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs font-semibold"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleMinuteDateSet(index, 'plannedStart')}
                                              className="flex-1 px-3 py-1.5 bg-[var(--theme-primary)] text-gray-900 rounded-lg text-xs font-semibold"
                                            >
                                              Set
                                            </button>
                                          </div>
                                        </motion.div>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDatePicker({ index, field: 'plannedCompletion' });
                                        setMinuteDatePickerDate(minute.plannedCompletion ? new Date(minute.plannedCompletion) : new Date());
                                      }}
                                      className="w-full px-2 py-1 bg-white dark:bg-gray-700 border-0 focus:ring-1 focus:ring-[var(--theme-primary)] text-gray-900 dark:text-white text-sm rounded text-left flex items-center justify-between"
                                    >
                                      <span className="text-xs">{minute.plannedCompletion || 'Select'}</span>
                                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </button>

                                    {activeDatePicker?.index === index && activeDatePicker?.field === 'plannedCompletion' && (
                                      <>
                                        <div className="fixed inset-0 z-30" onClick={() => setActiveDatePicker(null)} />
                                        <motion.div
                                          className="fixed z-40 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
                                          style={{
                                            left: '50%',
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)'
                                          }}
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                        >
                                          <div className="flex items-center justify-between mb-3">
                                            <button
                                              type="button"
                                              onClick={() => setMinuteDatePickerDate(new Date(minuteDatePickerDate.getFullYear(), minuteDatePickerDate.getMonth() - 1))}
                                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            >
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                              </svg>
                                            </button>
                                            <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                              {minuteDatePickerDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setMinuteDatePickerDate(new Date(minuteDatePickerDate.getFullYear(), minuteDatePickerDate.getMonth() + 1))}
                                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
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
                                            {Array.from({ length: getFirstDayOfMonth(minuteDatePickerDate) }).map((_, i) => (
                                              <div key={`empty-${i}`} />
                                            ))}
                                            {Array.from({ length: getDaysInMonth(minuteDatePickerDate) }).map((_, i) => {
                                              const day = i + 1;
                                              const isSelected = minuteDatePickerDate.getDate() === day;
                                              return (
                                                <button
                                                  key={day}
                                                  type="button"
                                                  onClick={() => {
                                                    const newDate = new Date(minuteDatePickerDate);
                                                    newDate.setDate(day);
                                                    setMinuteDatePickerDate(newDate);
                                                  }}
                                                  className={`p-1.5 rounded text-xs ${
                                                    isSelected
                                                      ? 'bg-[var(--theme-primary)] text-gray-900 font-bold'
                                                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                                  }`}
                                                >
                                                  {day}
                                                </button>
                                              );
                                            })}
                                          </div>
                                          <div className="flex gap-2 mt-3">
                                            <button
                                              type="button"
                                              onClick={() => setActiveDatePicker(null)}
                                              className="flex-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs font-semibold"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleMinuteDateSet(index, 'plannedCompletion')}
                                              className="flex-1 px-3 py-1.5 bg-[var(--theme-primary)] text-gray-900 rounded-lg text-xs font-semibold"
                                            >
                                              Set
                                            </button>
                                          </div>
                                        </motion.div>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">
                                  <input
                                    type="date"
                                    value={minute.actualCompletion}
                                    onChange={(e) => handleMinuteChange(index, 'actualCompletion', e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-gray-700 border-0 focus:ring-1 focus:ring-[var(--theme-primary)] text-gray-900 dark:text-white text-sm rounded"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">
                                  <input
                                    type="text"
                                    value={minute.delayed}
                                    readOnly
                                    className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-600 border-0 text-gray-900 dark:text-white text-sm text-center rounded"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">
                                  <textarea
                                    value={minute.remarks}
                                    onChange={(e) => handleMinuteChange(index, 'remarks', e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-gray-700 border-0 focus:ring-1 focus:ring-[var(--theme-primary)] text-gray-900 dark:text-white text-sm rounded"
                                    rows={2}
                                  />
                                </td>
                                <td className="px-3 py-2 text-center border border-gray-300 dark:border-gray-600">
                                  {formData.meetingMinutes.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDiscussionPoint(index)}
                                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                      title="Remove"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div
                      className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Submitting...' : editingMOM ? 'Update MOM' : 'Submit MOM'}
                      </button>
                    </motion.div>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Project Modal */}
      <AnimatePresence>
        {showAddProjectModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-[9998]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProjectModal(false)}
            />

            {/* Modal Content */}
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] p-6 rounded-t-2xl">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Add New Project</h3>
                    <button
                      onClick={() => setShowAddProjectModal(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Form */}
                <div className="p-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddProject();
                      }
                    }}
                    placeholder="Enter project name"
                    className="w-full px-4 py-2.5 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition"
                    autoFocus
                  />
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddProjectModal(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddProject}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-xl font-semibold hover:shadow-lg transition"
                    >
                      Add Project
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </LayoutWrapper>
  );
};

export default MOMPage;
