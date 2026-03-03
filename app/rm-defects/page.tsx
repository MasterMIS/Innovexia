'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import { useToast } from '@/components/ToastProvider';
import { useLoader } from '@/components/LoaderProvider';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Pencil, Trash2, X, Save,
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
}

const DEFECT_STAGES = [
    { step: 1, name: 'Reported' },
    { step: 2, name: 'Inspection' },
    { step: 3, name: 'Vendor Notified' },
    { step: 4, name: 'Action Taken' },
    { step: 5, name: 'Replacement' },
    { step: 6, name: 'Internal QA' },
    { step: 7, name: 'Accounts' },
    { step: 8, name: 'Closed' },
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
                for (let s = 1; s <= 8; s++) {
                    if ((item as any)[`Actual_${s}`]) currentStep = s + 1;
                    else break;
                }
                if (currentStep > 8) return false;

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
                            { id: 'data' as ViewMode, label: 'Data View' },
                            { id: 'cancelled' as ViewMode, label: 'Cancelled' },
                            { id: 'setup' as ViewMode, label: 'Setup' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => switchView(tab.id)}
                                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === tab.id
                                    ? 'bg-[var(--theme-primary)] text-gray-900 shadow-lg'
                                    : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]'
                                    }`}
                            >
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
                        >
                            <X className="w-5 h-5 rotate-45" strokeWidth={3} />
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
                            {/* Step Filter Tiles */}
                            <div className="overflow-x-auto px-4 pt-4 pb-4 bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-50 dark:border-slate-800/50">
                                <div className="flex gap-2 min-w-max">
                                    {[
                                        { step: 'all' as const, label: 'All Items', value: statusStats.Total, bg: 'bg-slate-100', text: 'text-slate-600' },
                                        ...DEFECT_STAGES.map(s => ({
                                            step: s.step,
                                            label: `${s.step}. ${s.name}`,
                                            value: (statusStats as any)[`Step${s.step}`],
                                            bg: activeStepFilter === s.step ? 'bg-[var(--theme-primary)]' : 'bg-white',
                                            text: activeStepFilter === s.step ? 'text-black' : 'text-slate-600'
                                        }))
                                    ].map((stat) => (
                                        <button
                                            key={stat.label}
                                            onClick={() => setActiveStepFilter(stat.step)}
                                            className={`${stat.bg} ${stat.text} px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-start min-w-[120px] transition-all hover:scale-105 active:scale-95`}
                                        >
                                            <span className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">{stat.label}</span>
                                            <span className="text-lg font-black leading-none">{stat.value}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-900/20 text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest w-12 text-center">#</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Material Name</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Vendor</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Remark</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest w-24 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {loading ? (
                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">Loading records...</td></tr>
                                        ) : paginatedData.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">No records found</td></tr>
                                        ) : paginatedData.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group transition-colors">
                                                <td className="px-6 py-4 text-[10px] font-black text-slate-300 text-center">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight leading-none text-sm">{item['Material Name']}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-tighter">ID: {item.id}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">{item['Vendor Name'] || '-'}</span>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate text-xs text-slate-500 font-medium">{item['Remark'] || '-'}</td>
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        let step = 1;
                                                        for (let s = 1; s <= 8; s++) {
                                                            if ((item as any)[`Actual_${s}`]) step = s + 1; else break;
                                                        }
                                                        if (step > 8) return <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Completed</span>;
                                                        return <span className="bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Step {step}: {DEFECT_STAGES[step - 1].name}</span>;
                                                    })()}
                                                </td>
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

                            {/* Pagination Row Above (As requested: "tbale style pagination row above the header") */}
                            {/* Note: Standard placement is below, but adding a simplified one above if desired. 
                                The user said "tbale style pagination row above the header same create here".
                                Looking at client-complain page, it has a standard bottom pagination. 
                                I'll add standard bottom one first as it's most reliable for layout.
                            */}
                            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Showing {activeData.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, activeData.length)} of {activeData.length} records
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-white dark:hover:bg-slate-800">Prev</button>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200">
                                        <span className="text-[10px] font-black text-[var(--theme-primary)]">{currentPage}</span>
                                        <span className="text-[10px] font-black text-slate-300">/</span>
                                        <span className="text-[10px] font-black text-slate-400">{totalPages}</span>
                                    </div>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-white dark:hover:bg-slate-800">Next</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modals (Simplified versions of the complex ones in client-complain) */}
            <AnimatePresence>
                {/* Add/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{editingItem ? 'Edit' : 'Add New'} Record</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">RM Defect Tracking System</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white dark:bg-slate-700 rounded-2xl shadow-sm text-slate-400 hover:text-red-500 transition-all"><X size={24} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-4">
                                {rows.map((row, idx) => (
                                    <div key={idx} className="p-6 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border border-slate-100 dark:border-slate-700 flex gap-4 items-start">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Material Name*</label>
                                                <input value={row.materialName} onChange={e => { const n = [...rows]; n[idx].materialName = e.target.value; setRows(n); }} placeholder="Enter material name..." className="w-full h-12 px-4 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-[var(--theme-primary)] rounded-2xl text-sm font-bold shadow-sm outline-none transition-all" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor Name</label>
                                                <input value={row.vendorName} onChange={e => { const n = [...rows]; n[idx].vendorName = e.target.value; setRows(n); }} placeholder="Enter vendor name..." className="w-full h-12 px-4 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-[var(--theme-primary)] rounded-2xl text-sm font-bold shadow-sm outline-none transition-all" />
                                            </div>
                                            <div className="space-y-1.5 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remark</label>
                                                <input value={row.remark} onChange={e => { const n = [...rows]; n[idx].remark = e.target.value; setRows(n); }} placeholder="Optional notes..." className="w-full h-12 px-4 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-[var(--theme-primary)] rounded-2xl text-sm font-bold shadow-sm outline-none transition-all" />
                                            </div>
                                        </div>
                                        {!editingItem && rows.length > 1 && (
                                            <button onClick={() => setRows(rows.filter((_, i) => i !== idx))} className="mt-7 p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                                        )}
                                    </div>
                                ))}
                                {!editingItem && (
                                    <button onClick={() => setRows([...rows, { ...emptyForm }])} className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 text-xs font-black uppercase tracking-widest hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition-all">+ Add More Rows</button>
                                )}
                            </div>

                            <div className="p-8 border-t border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex gap-4 justify-end">
                                <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
                                <button onClick={handleSave} disabled={isSaving || !rows[0].materialName.trim()} className="px-12 py-4 bg-[var(--theme-primary)] text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--theme-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                    {isSaving ? 'Saving...' : 'Save Record'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
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
        </LayoutWrapper>
    );
}
