'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Pencil, Trash2, X, Save, Loader2,
    AlertTriangle, MessageSquareWarning
} from 'lucide-react';

interface StepConfig {
    step: number;
    stepName: string;
    doerName: string;
    tatValue: number;
    tatUnit: 'hours' | 'days';
}

interface RMDefect {
    id: string;
    'Material Name': string;
    'Vendor Name': string;
    'Remark': string;
    'Timestamp'?: string;
    'Cancelled'?: string;
    _rowIndex: number;
    Planned_1?: string; Actual_1?: string; Status_1?: string;
    Planned_2?: string; Actual_2?: string; Status_2?: string;
    Planned_3?: string; Actual_3?: string; Status_3?: string;
    Planned_4?: string; Actual_4?: string; Status_4?: string;
    Planned_5?: string; Actual_5?: string; Status_5?: string;
    Planned_6?: string; Actual_6?: string; Status_6?: string;
    Planned_7?: string; Actual_7?: string; Status_7?: string;
    Planned_8?: string; Actual_8?: string; Status_8?: string;
    Planned_9?: string; Actual_9?: string; Status_9?: string;
}

const DEFECT_STAGES = [
    { step: 1, name: 'SEND THE PHOTO TO VENDOR GROUP' },
    { step: 2, name: 'TALK TO VENDOR' },
    { step: 3, name: 'SEND THE SAMPLE TO VENDOR' },
    { step: 4, name: 'TALK TO VENDOR FOR SOLUTION' },
    { step: 5, name: 'INFOR MD ABOUT THE SOLUTION AND GET THE APPROVAL' },
    { step: 6, name: 'ORDER THE NEW MATERIAL' },
    { step: 7, name: 'TAKE APPROVAL FROM NEERAJ ABOUT NEW STOCK' },
    { step: 8, name: 'RETURN THE DEFECTED MATERIAL' },
    { step: 9, name: 'RETURN THE DEFECTED MATERIAL' },
];

const ITEMS_PER_PAGE = 15;
const emptyForm = { materialName: '', vendorName: '', remark: '' };
type ViewMode = 'data' | 'cancelled' | 'setup';

const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

const getDelayInfo = (planned?: string, actual?: string) => {
    if (!planned) return null;
    const pDate = new Date(planned);
    const refDate = actual ? new Date(actual) : new Date();
    if (isNaN(pDate.getTime()) || isNaN(refDate.getTime())) return null;

    const diffMs = refDate.getTime() - pDate.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));

    if (diffMin > 0) {
        return { text: `${Math.floor(diffMin / 60)}h ${diffMin % 60}m Delay`, color: 'text-red-500 font-bold' };
    } else {
        const absMin = Math.abs(diffMin);
        return { text: `${Math.floor(absMin / 60)}h ${absMin % 60}m ${actual ? 'Ahead' : 'Left'}`, color: 'text-emerald-500 font-bold' };
    }
};

export default function RMDefectsPage() {
    const [data, setData] = useState<RMDefect[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<ViewMode>('data');
    const [activeStepFilter, setActiveStepFilter] = useState<number | 'all'>('all');
    const [activeTimeFilter, setActiveTimeFilter] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RMDefect | null>(null);
    const [deletingItem, setDeletingItem] = useState<RMDefect | null>(null);
    const [cancellingItem, setCancellingItem] = useState<RMDefect | null>(null);

    const toast = useToast();
    const loader = useLoader();

    const [rows, setRows] = useState([emptyForm]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [itemsToMarkDone, setItemsToMarkDone] = useState<Set<string>>(new Set());
    const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);

    const [stepConfigs, setStepConfigs] = useState<StepConfig[]>([]);
    const [systemUsers, setSystemUsers] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/rm-defects');
            const json = await res.json();
            if (json.data) {
                setData(json.data.filter((d: RMDefect) => d['Material Name']?.trim()));
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/rm-defects-config');
            if (res.ok) {
                const data = await res.json();
                if (data.config && data.config.length > 0) {
                    setStepConfigs(data.config);
                } else {
                    const defaultConfig = DEFECT_STAGES.map(s => ({
                        step: s.step,
                        stepName: s.name,
                        doerName: '',
                        tatValue: 24,
                        tatUnit: 'hours' as const
                    }));
                    setStepConfigs(defaultConfig);
                }
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setSystemUsers(data.users || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchConfig();
        fetchUsers();
    }, []);

    const activeData = useMemo(() => {
        let filtered = data.filter(d =>
            viewMode === 'cancelled'
                ? d['Cancelled']?.trim().toLowerCase() === 'yes'
                : !d['Cancelled'] || d['Cancelled'].trim().toLowerCase() !== 'yes'
        );

        if (viewMode === 'data' && activeStepFilter !== 'all') {
            filtered = filtered.filter(item => {
                const step = activeStepFilter;
                const isDone = !!(item as any)[`Actual_${step}`];
                const isPreviousDone = step === 1 || !!(item as any)[`Actual_${step - 1}`];
                return !isDone && isPreviousDone;
            });
        }

        if (viewMode === 'data' && activeTimeFilter) {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const oneDayMs = 24 * 60 * 60 * 1000;

            filtered = filtered.filter(item => {
                let currentStep = 1;
                for (let s = 1; s <= 9; s++) {
                    if ((item as any)[`Actual_${s}`]) currentStep = s + 1;
                    else break;
                }
                if (currentStep > 9) return false;

                const plannedStr = (item as any)[`Planned_${currentStep}`];
                if (!plannedStr) return false;

                const pDate = new Date(plannedStr);
                const pTime = pDate.getTime();
                const pDayStart = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate()).getTime();
                const diffDays = Math.round((pDayStart - todayStart) / oneDayMs);

                switch (activeTimeFilter) {
                    case 'Delayed': return pTime < now.getTime();
                    case 'Today': return diffDays === 0;
                    case 'Tomorrow': return diffDays === 1;
                    case 'Next 3': return diffDays >= 0 && diffDays <= 3;
                    case 'Next 7': return diffDays >= 0 && diffDays <= 7;
                    case 'Next 15': return diffDays >= 0 && diffDays <= 15;
                    default: return true;
                }
            });
        }

        return filtered;
    }, [data, viewMode, activeStepFilter, activeTimeFilter]);

    const statusStats = useMemo(() => {
        const active = data.filter(d => !d['Cancelled'] || d['Cancelled'].trim().toLowerCase() !== 'yes');
        return {
            Total: active.length,
            Step1: active.filter(r => !r.Actual_1).length,
            Step2: active.filter(r => r.Actual_1 && !r.Actual_2).length,
            Step3: active.filter(r => r.Actual_2 && !r.Actual_3).length,
            Step4: active.filter(r => r.Actual_3 && !r.Actual_4).length,
            Step5: active.filter(r => r.Actual_4 && !r.Actual_5).length,
            Step6: active.filter(r => r.Actual_5 && !r.Actual_6).length,
            Step7: active.filter(r => r.Actual_6 && !r.Actual_7).length,
            Step8: active.filter(r => r.Actual_7 && !r.Actual_8).length,
            Step9: active.filter(r => r.Actual_8 && !r.Actual_9).length,
        };
    }, [data]);

    const totalPages = Math.max(1, Math.ceil(activeData.length / ITEMS_PER_PAGE));
    const paginatedData = activeData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const switchView = (v: ViewMode) => {
        setViewMode(v);
        setCurrentPage(1);
        setSelectedItems(new Set());
    };

    const handleSave = async () => {
        const validRows = rows.filter(r => r.materialName.trim());
        if (validRows.length === 0) return;

        setIsSaving(true);
        try {
            const method = editingItem ? 'PUT' : 'POST';
            const payload = editingItem
                ? { id: editingItem.id, ...validRows[0] }
                : validRows;

            const res = await fetch('/api/rm-defects', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchData();
                toast.success(editingItem ? 'Updated successfully' : 'Added successfully');
            } else {
                toast.error('Failed to save');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error saving');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        setIsDeleting(true);
        try {
            const res = await fetch('/api/rm-defects', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: deletingItem.id })
            });
            if (res.ok) {
                setIsDeleteModalOpen(false);
                fetchData();
                toast.success('Deleted successfully');
            } else {
                toast.error('Failed to delete');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error deleting');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancel = async () => {
        if (!cancellingItem) return;
        setIsCancelling(true);
        const isCancelled = cancellingItem['Cancelled']?.toLowerCase() === 'yes';
        try {
            const res = await fetch('/api/rm-defects', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: cancellingItem.id, cancelled: !isCancelled }),
            });
            if (res.ok) {
                setIsCancelModalOpen(false);
                fetchData();
                toast.success(isCancelled ? 'Restored successfully' : 'Cancelled successfully');
            } else {
                toast.error('Operation failed');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error updating status');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleSaveConfig = async () => {
        try {
            loader.showLoader();
            const res = await fetch('/api/rm-defects-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: stepConfigs }),
            });
            if (res.ok) {
                toast.success('Configuration saved');
                setViewMode('data');
            } else {
                toast.error('Failed to save configuration');
            }
        } catch (error) {
            toast.error('Error saving configuration');
            console.error(error);
        } finally {
            loader.hideLoader();
        }
    };

    return (
        <LayoutWrapper>
            <div className="p-3 space-y-2">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[var(--theme-primary)]/15 rounded-xl">
                            <AlertTriangle size={22} className="text-[var(--theme-primary)]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wide leading-none">
                                RM DEFECTS
                            </h1>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                                RAW MATERIAL DEFECT PROBLEM TRACKING
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700">
                        {[
                            {
                                id: 'data' as ViewMode,
                                label: 'Data View',
                                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
                            },
                            {
                                id: 'cancelled' as ViewMode,
                                label: 'Cancelled View',
                                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                            },
                            {
                                id: 'setup' as ViewMode,
                                label: 'Setup',
                                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                            },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => switchView(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === tab.id
                                    ? 'bg-[var(--theme-primary)] text-gray-900 shadow-lg shadow-[var(--theme-primary)]/25 scale-[1.02]'
                                    : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/5'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                        <div className="w-px h-8 bg-slate-100 dark:bg-slate-700 mx-1" />
                        <button
                            onClick={() => {
                                setEditingItem(null);
                                setRows([{ ...emptyForm }]);
                                setIsModalOpen(true);
                            }}
                            className="bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] p-2.5 rounded-2xl hover:bg-[var(--theme-primary)] hover:text-white transition-all shadow-sm"
                            title="Add New"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-white dark:border-slate-700 overflow-hidden">
                    {viewMode === 'setup' ? (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Step Configuration</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure workflow steps and turnaround times</p>
                                </div>
                                <button
                                    onClick={handleSaveConfig}
                                    className="bg-[var(--theme-primary)] text-gray-900 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.05] transition-all"
                                >
                                    Save Configuration
                                </button>
                            </div>

                            <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-[2rem]">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Step</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Name</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Responsible</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">TAT</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                        {stepConfigs.map((config, index) => (
                                            <tr key={config.step}>
                                                <td className="px-6 py-4 font-black">#{config.step}</td>
                                                <td className="px-6 py-4 text-xs font-bold">{config.stepName}</td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={config.doerName}
                                                        onChange={(e) => {
                                                            const n = [...stepConfigs];
                                                            n[index].doerName = e.target.value;
                                                            setStepConfigs(n);
                                                        }}
                                                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                                                    >
                                                        <option value="">Select User</option>
                                                        {systemUsers.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 flex gap-2">
                                                    <input
                                                        type="number"
                                                        value={config.tatValue}
                                                        onChange={(e) => {
                                                            const n = [...stepConfigs];
                                                            n[index].tatValue = parseInt(e.target.value) || 0;
                                                            setStepConfigs(n);
                                                        }}
                                                        className="w-20 h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                                                    />
                                                    <select
                                                        value={config.tatUnit}
                                                        onChange={(e) => {
                                                            const n = [...stepConfigs];
                                                            n[index].tatUnit = e.target.value as any;
                                                            setStepConfigs(n);
                                                        }}
                                                        className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold uppercase"
                                                    >
                                                        <option value="hours">H</option>
                                                        <option value="days">D</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Pagination row above header */}
                            <div className="flex bg-[var(--theme-lighter)]/50 dark:bg-slate-900/50 p-2 border-b border-slate-100 dark:border-slate-800 backdrop-blur-md sticky top-0 z-[20]">
                                <div className="flex-1 flex items-center justify-between px-3">
                                    <div className="flex items-center gap-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                            Showing{' '}
                                            <span className="text-slate-900 dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                                            {' – '}
                                            <span className="text-slate-900 dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, activeData.length)}</span>
                                            {' of '}
                                            <span className="text-slate-900 dark:text-white">{activeData.length}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-1 px-3 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-all text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Prev
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-black text-[var(--theme-primary)]">{currentPage}</span>
                                            <span className="text-[10px] font-black text-slate-300">/</span>
                                            <span className="text-[10px] font-black text-slate-400">{totalPages}</span>
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-1 px-3 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-all text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className={`text-[10px] font-bold text-gray-900 uppercase tracking-wider ${viewMode === 'cancelled' ? 'bg-red-400' : 'bg-[var(--theme-primary)]'}`}>
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest w-12 text-center">#</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">Material & Vendor</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">Remark</th>
                                            {DEFECT_STAGES.map(s => (
                                                <th key={s.step} className="px-3 py-2 text-left border-l border-white/10 min-w-[120px]">
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="text-[9px] opacity-70 font-black">STEP {s.step}</span>
                                                        <span className="text-[10px] font-black uppercase whitespace-nowrap">{s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest w-24 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-xs">
                                        {loading ? (
                                            <tr><td colSpan={13} className="px-6 py-12 text-center text-slate-400 font-bold">Loading records...</td></tr>
                                        ) : paginatedData.length === 0 ? (
                                            <tr><td colSpan={13} className="px-6 py-12 text-center text-slate-400 font-bold">No records found</td></tr>
                                        ) : paginatedData.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group transition-colors">
                                                <td className="px-6 py-4 text-[10px] font-black text-slate-300 text-center">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight leading-none text-sm">{item['Material Name']}</div>
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-black text-slate-500 uppercase">{item['Vendor Name'] || 'No Vendor'}</span>
                                                        <span className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">ID: {item.id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate text-[11px] text-slate-500 font-medium">{item['Remark'] || '-'}</td>
                                                {DEFECT_STAGES.map(s => {
                                                    const planned = item[`Planned_${s.step}` as keyof RMDefect] as string;
                                                    const actual = item[`Actual_${s.step}` as keyof RMDefect] as string;
                                                    const delay = getDelayInfo(planned, actual);

                                                    return (
                                                        <td key={s.step} className="px-3 py-2 border-l border-slate-50 dark:border-slate-800/50">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">P:</span>
                                                                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                                                                        {planned ? formatDateTime(planned) : '-'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">A:</span>
                                                                    {actual ? (
                                                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                                                            {formatDateTime(actual)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-slate-200 dark:text-slate-700">-</span>
                                                                    )}
                                                                </div>
                                                                {delay && (
                                                                    <div className={`text-[9px] text-right italic ${delay.color}`}>
                                                                        {delay.text}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => { setEditingItem(item); setRows([{ materialName: item['Material Name'], vendorName: item['Vendor Name'], remark: item['Remark'] }]); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"><Pencil size={16} /></button>
                                                        <button onClick={() => { setDeletingItem(item); setIsDeleteModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                                        <button onClick={() => { setCancellingItem(item); setIsCancelModalOpen(true); }} className={`p-2 rounded-xl transition-all ${item['Cancelled'] === 'Yes' ? 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100' : 'text-orange-400 hover:text-orange-500 hover:bg-orange-50'}`}><X size={16} className={item['Cancelled'] === 'Yes' ? '' : 'rotate-45'} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </>
                    )}
                </div>
            </div>

            {/* Modals (Simplified versions of the complex ones in client-complain) */}
            <AnimatePresence>
                {/* Add/Edit Modal */}
                {isModalOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[9998]" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl border border-gray-100 dark:border-gray-800 overflow-hidden text-gray-900 dark:text-gray-100">
                                <div className="p-5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 bg-white/20 rounded-lg">
                                            <MessageSquareWarning size={18} />
                                        </div>
                                        <h2 className="text-base font-black uppercase tracking-tight">{editingItem ? 'Edit Record' : 'Add New Record'}</h2>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={16} /></button>
                                </div>
                                <div className="p-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                                    {!editingItem && (
                                        <div className="hidden md:grid grid-cols-[40px_1fr_1fr_1.2fr_40px] gap-4 px-3 mb-3">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">#</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Material Name <span className="text-red-500">*</span></span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendor Name</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Remark</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Action</span>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {rows.map((row, index) => (
                                            <div key={index} className="grid grid-cols-1 md:grid-cols-[40px_1fr_1fr_1.2fr_40px] items-start gap-3 md:gap-4 p-3 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border border-transparent hover:border-gray-100 dark:hover:border-gray-700/50 transition-all group relative">
                                                <div className="flex md:items-center justify-center md:pt-2.5">
                                                    <span className="w-5 h-5 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center text-[10px] font-black">
                                                        {index + 1}
                                                    </span>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="md:hidden text-[9px] font-black text-gray-400 uppercase tracking-widest">Material Name</label>
                                                    <input
                                                        value={row.materialName}
                                                        onChange={e => { const n = [...rows]; n[index].materialName = e.target.value; setRows(n); }}
                                                        placeholder="Material..."
                                                        autoFocus={index === 0}
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] outline-none text-sm transition-all"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="md:hidden text-[9px] font-black text-gray-400 uppercase tracking-widest">Vendor Name</label>
                                                    <input
                                                        value={row.vendorName}
                                                        onChange={e => { const n = [...rows]; n[index].vendorName = e.target.value; setRows(n); }}
                                                        placeholder="Vendor..."
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] outline-none text-sm transition-all"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="md:hidden text-[9px] font-black text-gray-400 uppercase tracking-widest">Remark</label>
                                                    <textarea
                                                        value={row.remark}
                                                        onChange={e => { const n = [...rows]; n[index].remark = e.target.value; setRows(n); }}
                                                        placeholder="Remark..."
                                                        rows={1}
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] outline-none text-sm resize-none transition-all"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-center md:pt-1">
                                                    {(rows.length > 1 || editingItem) && (
                                                        <button
                                                            onClick={() => editingItem ? setIsModalOpen(false) : setRows(rows.filter((_, i) => i !== index))}
                                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                            title={editingItem ? "Cancel" : "Remove Row"}
                                                        >
                                                            {editingItem ? <X size={16} /> : <Trash2 size={16} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {!editingItem && (
                                        <div className="px-1">
                                            <button
                                                onClick={() => setRows([...rows, { ...emptyForm }])}
                                                className="w-full mt-4 py-3 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/5 transition-all flex items-center justify-center gap-2 group"
                                            >
                                                <div className="w-5 h-5 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-[var(--theme-primary)]/20 group-hover:text-[var(--theme-primary)] transition-all">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </div>
                                                Add Another Row
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-6 sticky bottom-0 bg-white dark:bg-gray-900 mt-2 border-t border-gray-50 dark:border-gray-800/50">
                                        <button onClick={() => setIsModalOpen(false)}
                                            className="flex-1 py-3 border border-gray-100 dark:border-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                                            Close
                                        </button>
                                        <motion.button
                                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                                            onClick={handleSave}
                                            disabled={isSaving || !rows.some(r => r.materialName.trim())}
                                            className="flex-[2] py-3 bg-[var(--theme-primary)] text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-[var(--theme-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={14} />}
                                            {editingItem ? 'Update Record' : `Save ${rows.filter(r => r.materialName.trim()).length} Record${rows.filter(r => r.materialName.trim()).length !== 1 ? 's' : ''}`}
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}

                {/* Confirm Delete Modal */}
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><Trash2 size={40} /></div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Are you sure?</h3>
                            <p className="text-sm text-slate-400 font-bold mb-8">This action will permanently delete this record. This cannot be undone.</p>
                            <div className="flex gap-4">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
                                <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] transition-all disabled:opacity-50">{isDeleting ? 'Deleting...' : 'Confirm Delete'}</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Confirm Cancel Modal */}
                {isCancelModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center">
                            <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} /></div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Toggle Status?</h3>
                            <p className="text-sm text-slate-400 font-bold mb-8">{cancellingItem?.Cancelled === 'Yes' ? 'Do you want to restore this record?' : 'Do you want to move this record to cancelled?'}</p>
                            <div className="flex gap-4">
                                <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Go Back</button>
                                <button onClick={handleCancel} disabled={isCancelling} className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-all disabled:opacity-50">{isCancelling ? 'Updating...' : 'Confirm'}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </LayoutWrapper >
    );
}
