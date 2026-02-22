'use client';

import { useState, useEffect, Fragment } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import { ensureSessionId } from '@/utils/session';
import { motion, AnimatePresence } from 'framer-motion';
import DateRangePicker from '@/components/DateRangePicker';
import SingleDateInput from '@/components/SingleDateInput';
import TaskDetailModal from '@/components/TaskDetailModal';
import { parseDateString, parseSheetDate } from '@/lib/dateUtils';
import { CircularProgress } from '@/components/CircularProgress';

interface UserData {
    id: string;
    username: string;
    email: string;
    roleName: string;
    imageUrl?: string;
    image_url?: string;
}

interface DelegationData {
    id: string;
    delegation_name: string;
    description: string;
    status: string;
    doer_name: string;
    assigned_to: string;
    due_date?: string;
    updated_at?: string;
}

interface ChecklistData {
    id: string;
    question: string;
    status: string;
    assignee: string;
    doer_name?: string;
    due_date?: string;
    updated_at?: string;
}

interface UserScore {
    user: UserData;
    totalTasks: number;
    completedTasks: number;
    onTimeTasks: number;
    scorePercentage: number;
    onTimePercentage: number;
    delegationStats: {
        total: number;
        completed: number;
        onTime: number;
        items: DelegationData[];
    };
    checklistStats: {
        total: number;
        completed: number;
        onTime: number;
        items: ChecklistData[];
    };
    o2dStats: {
        total: number;
        completed: number;
        onTime: number;
        items: O2DTaskData[];
    };
    trendData: ChartDataPoint[];
}

interface ChartDataPoint {
    label: string;
    score: number;
    onTime: number;
}

interface O2DTaskData {
    id: number;
    party_name: string;
    step_number: number;
    step_name: string;
    planned_date: string | null;
    actual_date: string | null;
    status: 'Pending' | 'On Time' | 'Delayed';
    doer_name?: string;
}

interface StepConfig {
    step: number;
    stepName: string;
    doerName: string;
    tatValue: number;
    tatUnit: 'hours' | 'days';
}

export default function ScorePage() {
    const [activeTab, setActiveTab] = useState<'scoring' | 'appraisal'>('scoring');
    const [users, setUsers] = useState<UserData[]>([]);
    const [userScores, setUserScores] = useState<UserScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'table' | 'dashboard'>('grid');

    const [filterType, setFilterType] = useState<'week' | 'month' | 'custom' | 'tillDate'>('month');
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [allDelegations, setAllDelegations] = useState<DelegationData[]>([]);
    const [allChecklists, setAllChecklists] = useState<ChecklistData[]>([]);
    const [allO2DOrders, setAllO2DOrders] = useState<any[]>([]);
    const [o2dConfig, setO2dConfig] = useState<StepConfig[]>([]);

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        tasks: any[];
        type: 'delegation' | 'checklist' | 'o2d';
    }>({
        isOpen: false,
        title: '',
        tasks: [],
        type: 'delegation'
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const sessionId = ensureSessionId();
            const headers = { 'x-session-id': sessionId };

            const [usersRes, delRes, checkRes, o2dRes, configRes] = await Promise.all([
                fetch('/api/users', { headers }),
                fetch('/api/delegations', { headers }),
                fetch('/api/checklists', { headers }),
                fetch('/api/o2d', { headers }),
                fetch('/api/o2d-config', { headers })
            ]);

            const usersData = await usersRes.json();
            const delData = await delRes.json();
            const checkData = await checkRes.json();
            const o2dData = await o2dRes.json();
            const configData = await configRes.json();

            setUsers(usersData.users || []);
            setAllDelegations(delData.delegations || []);
            setAllChecklists(checkData.checklists || []);
            setAllO2DOrders(Array.isArray(o2dData) ? o2dData : []);
            setO2dConfig(configData.config && Array.isArray(configData.config) ? configData.config : []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching score data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const formatDateLocal = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (filterType === 'week') {
            const today = new Date();
            const first = today.getDate() - today.getDay();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), first);
            setDateRange({ from: formatDateLocal(firstDay), to: formatDateLocal(today) });
        } else if (filterType === 'month') {
            const date = new Date();
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            setDateRange({ from: formatDateLocal(firstDay), to: formatDateLocal(lastDay) });
        } else if (filterType === 'tillDate') {
            setDateRange({ from: '2000-01-01', to: formatDateLocal(new Date()) });
        }
    }, [filterType]);

    useEffect(() => {
        if (users.length > 0) {
            calculateScores(users, allDelegations, allChecklists, allO2DOrders, o2dConfig);
        }
    }, [users, allDelegations, allChecklists, allO2DOrders, o2dConfig, dateRange, searchQuery]);



    const isTaskInRange = (due_date?: string, updated_at?: string, customFrom?: Date, customTo?: Date) => {
        if ((!dateRange.from || !dateRange.to) && !customFrom) return true;
        const fromDate = customFrom || new Date(dateRange.from);
        const toDate = customTo || new Date(dateRange.to);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        if (due_date) {
            const dDate = parseDateString(due_date);
            if (dDate && dDate >= fromDate && dDate <= toDate) return true;
        }
        if (updated_at) {
            const uDate = parseDateString(updated_at);
            if (uDate && uDate >= fromDate && uDate <= toDate) return true;
        }
        return false;
    };

    const getChartPeriods = (fType: string, dRange: { from: string, to: string }) => {
        if (!dRange.from || !dRange.to) return [];
        const from = new Date(dRange.from);
        const to = new Date(dRange.to);
        const periods: { from: Date, to: Date, label: string }[] = [];

        if (fType === 'week') {
            for (let i = 0; i < 7; i++) {
                const start = new Date(from);
                start.setDate(from.getDate() + i);
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setHours(23, 59, 59, 999);
                periods.push({ from: start, to: end, label: start.toLocaleDateString('en-US', { weekday: 'short' }) });
            }
        } else if (fType === 'month') {
            let current = new Date(from);
            let weekNum = 1;
            while (current <= to) {
                const start = new Date(current);
                const end = new Date(current);
                end.setDate(current.getDate() + 6);
                if (end > to) end.setTime(to.getTime());
                end.setHours(23, 59, 59, 999);

                periods.push({
                    from: start,
                    to: end,
                    label: `W${weekNum}`
                });
                current.setDate(current.getDate() + 7);
                weekNum++;
            }
        } else {
            const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 45) {
                let current = new Date(from.getFullYear(), from.getMonth(), 1);
                while (current <= to) {
                    const start = new Date(current);
                    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                    end.setHours(23, 59, 59, 999);
                    periods.push({ from: start, to: end, label: start.toLocaleDateString('en-US', { month: 'short' }) });
                    current.setMonth(current.getMonth() + 1);
                }
            } else {
                let current = new Date(from);
                while (current <= to) {
                    const start = new Date(current);
                    const end = new Date(current);
                    end.setDate(current.getDate() + 6);
                    if (end > to) end.setTime(to.getTime());
                    end.setHours(23, 59, 59, 999);
                    periods.push({ from: start, to: end, label: `${start.getDate()}/${start.getMonth() + 1}` });
                    current.setDate(current.getDate() + 7);
                }
            }
        }
        return periods;
    };

    const isOnTime = (due_date?: string, updated_at?: string) => {
        if (!due_date || !updated_at) return false;
        const dDate = parseDateString(due_date);
        const uDate = parseDateString(updated_at);
        if (!dDate || !uDate) return false;
        // Allow completion on the due date itself as on-time (set due date to end of day)
        dDate.setHours(23, 59, 59, 999);
        return uDate.getTime() <= dDate.getTime();
    };

    const calculateScores = (usersList: UserData[], delegationsList: DelegationData[], checklistsList: ChecklistData[], o2dOrdersList: any[], configList: StepConfig[]) => {
        const filteredUsers = usersList.filter(user => user.username.toLowerCase().includes(searchQuery.toLowerCase()));

        // Helper to check if a date string is in range
        const isDateInRange = (dateStr: string | null) => {
            if (!dateStr) return false;
            if (!dateRange.from || !dateRange.to) return true;
            const date = new Date(dateStr);
            const from = new Date(dateRange.from);
            const to = new Date(dateRange.to);
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);
            return date >= from && date <= to;
        };

        const scores: UserScore[] = filteredUsers.map(user => {
            const userDelegations = delegationsList.filter(d => {
                const isAssigned = (d.doer_name?.toLowerCase() === user.username.toLowerCase()) ||
                    (!d.doer_name && d.assigned_to?.toLowerCase() === user.username.toLowerCase());
                return isAssigned && isTaskInRange(d.due_date, d.updated_at);
            });

            const userChecklists = checklistsList.filter(c => {
                const isAssigned = (c.assignee?.toLowerCase() === user.username.toLowerCase()) ||
                    (c.doer_name?.toLowerCase() === user.username.toLowerCase());
                return isAssigned && isTaskInRange(c.due_date, c.updated_at);
            });

            const completedDelegations = userDelegations.filter(d => d.status.toLowerCase() === 'completed');
            const onTimeDelegations = userDelegations.filter(d => isOnTime(d.due_date, d.updated_at));

            const completedChecklists = userChecklists.filter(c => c.status.toLowerCase() === 'completed');
            const onTimeChecklists = userChecklists.filter(c => isOnTime(c.due_date, c.updated_at));

            // Calculate O2D Stats
            const userO2DItems: O2DTaskData[] = [];

            o2dOrdersList.forEach(order => {
                // Iterate through items in the order
                const itemsToProcess = Array.isArray(order.items) ? order.items : [];

                itemsToProcess.forEach((item: any) => {
                    // Iterate steps 1 to 8
                    for (let i = 1; i <= 8; i++) {
                        const stepConfig = configList.find(c => c.step === i);
                        // Check if this user is the doer for this step (case-insensitive, trimmed)
                        if (stepConfig && stepConfig.doerName.trim().toLowerCase() === user.username.trim().toLowerCase()) {

                            // Robust key lookup (case-insensitive)
                            const itemKeys = Object.keys(item);
                            const plannedKey = itemKeys.find(k => k.toLowerCase() === `planned_${i}`);
                            const actualKey = itemKeys.find(k => k.toLowerCase() === `actual_${i}`);

                            const plannedRaw = plannedKey ? item[plannedKey] : undefined;
                            const actualRaw = actualKey ? item[actualKey] : undefined;

                            // Parse dates using helper
                            const plannedDate = parseSheetDate(plannedRaw);
                            const actualDate = parseSheetDate(actualRaw);

                            // Check if this task falls in date range
                            if ((plannedDate && isDateInRange(plannedDate)) || (actualDate && isDateInRange(actualDate))) {
                                let status: 'Pending' | 'On Time' | 'Delayed' = 'Pending';

                                if (!actualDate) {
                                    status = 'Pending';
                                } else {
                                    if (plannedDate) {
                                        const plannedEnd = new Date(plannedDate); plannedEnd.setHours(23, 59, 59, 999);
                                        status = new Date(actualDate).getTime() <= plannedEnd.getTime() ? 'On Time' : 'Delayed';
                                    } else {
                                        status = 'On Time';
                                    }
                                }

                                if (plannedDate || actualDate) {
                                    userO2DItems.push({
                                        id: item.id || order.id,
                                        party_name: order.party_name,
                                        step_number: i,
                                        step_name: stepConfig.stepName,
                                        planned_date: plannedDate,
                                        actual_date: actualDate,
                                        status: status,
                                        doer_name: stepConfig.doerName
                                    });
                                }
                            }
                        }
                    }
                });
            });

            const completedO2D = userO2DItems.filter(item => item.actual_date);
            const onTimeO2D = userO2DItems.filter(item => item.status === 'On Time');

            const totalTasks = userDelegations.length + userChecklists.length + userO2DItems.length;
            const completedTasks = completedDelegations.length + completedChecklists.length + completedO2D.length;
            const onTimeTotal = onTimeDelegations.length + onTimeChecklists.length + onTimeO2D.length;

            // Trend calculation
            const periods = getChartPeriods(filterType, dateRange);
            const trendData = periods.map(p => {
                const pDels = userDelegations.filter(d => isTaskInRange(d.due_date, d.updated_at, p.from, p.to));
                const pDelTotal = pDels.length;
                const pDelOnTime = pDels.filter(d => isOnTime(d.due_date, d.updated_at)).length;

                const pChecks = userChecklists.filter(c => isTaskInRange(c.due_date, c.updated_at, p.from, p.to));
                const pCheckTotal = pChecks.length;
                const pCheckOnTime = pChecks.filter(c => isOnTime(c.due_date, c.updated_at)).length;

                const pO2D = completedO2D.filter(o => isTaskInRange(o.planned_date || '', o.actual_date || '', p.from, p.to));
                const pO2DTotal = userO2DItems.filter(o => isTaskInRange(o.planned_date || '', o.actual_date || '', p.from, p.to)).length;
                const pO2DOnTime = pO2D.filter(o => o.status === 'On Time').length;

                const pTotal = pDelTotal + pCheckTotal + pO2DTotal;
                const pCompleted = pDels.filter(d => d.status.toLowerCase() === 'completed').length + pChecks.filter(c => c.status.toLowerCase() === 'completed').length + pO2D.length;
                const pOnTime = pDelOnTime + pCheckOnTime + pO2DOnTime;

                return {
                    label: p.label,
                    score: pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0,
                    onTime: pCompleted > 0 ? Math.round((pOnTime / pCompleted) * 100) : 0
                };
            });

            return {
                user,
                totalTasks,
                completedTasks,
                onTimeTasks: onTimeTotal,
                scorePercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                onTimePercentage: completedTasks > 0 ? Math.round((onTimeTotal / completedTasks) * 100) : 0,
                delegationStats: {
                    total: userDelegations.length,
                    completed: completedDelegations.length,
                    onTime: onTimeDelegations.length,
                    items: userDelegations
                },
                checklistStats: {
                    total: userChecklists.length,
                    completed: completedChecklists.length,
                    onTime: onTimeChecklists.length,
                    items: userChecklists
                },
                o2dStats: {
                    total: userO2DItems.length,
                    completed: completedO2D.length,
                    onTime: onTimeO2D.length,
                    items: userO2DItems
                },
                trendData
            };
        });

        scores.sort((a, b) => b.scorePercentage - a.scorePercentage);
        setUserScores(scores);
    };

    const getColorForScore = (score: number) => {
        if (score < 34) return 'text-red-500';
        if (score < 76) return 'text-yellow-500';
        return 'text-green-500';
    };

    const ScoreRow = ({ formulaLabel, completed, total, percentage }: { formulaLabel: string; completed: number; total: number; percentage: number }) => (
        <div className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
            <div className="flex-1">
                <p className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 mb-0">{formulaLabel}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{completed}</span>
                    <span className="text-gray-400 text-xs">/</span>
                    <span className="text-sm font-medium text-gray-400">{total}</span>
                    <span className="text-gray-400 text-xs"> = </span>
                    <span className={`text-sm font-bold ${getColorForScore(percentage)}`}>{percentage}%</span>
                </div>
            </div>
            <CircularProgress percentage={percentage} size={36} strokeWidth={3.5} fontSize="0.55rem" />
        </div>
    );

    const VerticalBarChart = ({ data, color, valueKey }: { data: ChartDataPoint[], color: string, valueKey: 'score' | 'onTime' }) => {
        return (
            <div className="h-28 flex items-end gap-1.5 px-1 border-b border-gray-100 dark:border-gray-700 pb-1 mt-6">
                {data.map((point, i) => {
                    const val = point[valueKey];
                    // Dynamic color based on value
                    const barColor = val >= 90 ? '#22c55e' : val >= 70 ? '#3b82f6' : val >= 50 ? '#f97316' : '#ef4444';

                    return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {val}%
                            </div>
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max(val, 5)}%` }} // Minimum height for visibility
                                transition={{ duration: 0.5, delay: i * 0.03 }}
                                style={{ backgroundColor: color || barColor }}
                                className="w-full rounded-t-[2px] opacity-80 group-hover:opacity-100 transition-all cursor-crosshair"
                            />
                            <span className="absolute -bottom-5 text-[8px] text-gray-400 font-bold uppercase tracking-tight w-full text-center overflow-hidden h-3">
                                {point.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const [expandedTiles, setExpandedTiles] = useState<Set<string>>(new Set());

    const toggleTile = (userId: string) => {
        setExpandedTiles(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    const handleOpenModal = (type: 'delegation' | 'checklist' | 'o2d', tasks: any[], userName: string) => {
        setModalConfig({
            isOpen: true,
            title: `${userName}'s ${type === 'delegation' ? 'Delegations' : type === 'checklist' ? 'Checklists' : 'O2D Tasks'}`,
            tasks,
            type
        });
    };

    return (
        <LayoutWrapper>
            <div className="p-4 sm:p-6 space-y-6 min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Score</h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                        {activeTab === 'scoring' && (
                            <div className="flex flex-col sm:flex-row gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Filter by name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2 w-full sm:w-48 text-sm bg-gray-50 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)]"
                                    />
                                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                    {(['week', 'month', 'custom', 'tillDate'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setFilterType(type);
                                                if (type === 'custom') setShowDatePicker(true);
                                            }}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${filterType === type ? 'bg-white dark:bg-gray-600 text-gray-900 shadow-sm' : 'text-gray-500'}`}
                                        >
                                            {type === 'tillDate' ? 'Till Date' : type}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    {filterType === 'tillDate' ? (
                                        <div className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <span className="text-gray-500 dark:text-gray-400 text-xs">Till:</span>
                                            <SingleDateInput
                                                date={dateRange.to ? new Date(dateRange.to) : null}
                                                onChange={(date) => setDateRange(prev => ({ ...prev, to: date.toISOString().split('T')[0] }))}
                                                placeholder="Select till date"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => filterType === 'custom' && setShowDatePicker(!showDatePicker)} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 transition text-gray-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span className="whitespace-nowrap">{dateRange.from && dateRange.to ? `${new Date(dateRange.from).toLocaleDateString()} - ${new Date(dateRange.to).toLocaleDateString()}` : 'Select Dates'}</span>
                                            </button>
                                            {showDatePicker && filterType === 'custom' && (
                                                <div className="absolute top-12 right-0 z-50">
                                                    <DateRangePicker fromDate={dateRange.from} toDate={dateRange.to} onRangeChange={(from, to) => { setDateRange({ from, to }); setShowDatePicker(false); }} />
                                                    <div className="fixed inset-0 z-[-1]" onClick={() => setShowDatePicker(false)} />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 gap-1 h-fit">
                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[var(--theme-primary)] text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Grid View">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            </button>
                            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[var(--theme-primary)] text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Table View">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                            <button onClick={() => setViewMode('dashboard')} className={`p-2 rounded-lg transition-all ${viewMode === 'dashboard' ? 'bg-[var(--theme-primary)] text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Dashboard View">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-1 h-fit">
                            <button onClick={() => setActiveTab('scoring')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'scoring' ? 'bg-[var(--theme-primary)] text-gray-900' : 'text-gray-600'}`}>Scoring</button>
                            <button onClick={() => setActiveTab('appraisal')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'appraisal' ? 'bg-[var(--theme-primary)] text-gray-900' : 'text-gray-600'}`}>Appraisal</button>
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'scoring' ? (
                        <>
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border animate-pulse h-64" />)}
                                </div>
                            ) : userScores.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-gray-500">No users found.</div>
                            ) : (
                                <>
                                    {viewMode === 'dashboard' && (
                                        <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {userScores.map((score, index) => {
                                                const delayedPercentage = score.completedTasks > 0 ? 100 - score.onTimePercentage : 0;
                                                return (
                                                    <motion.div
                                                        key={score.user.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-[var(--theme-primary)] transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-4 mb-6">
                                                            {score.user.image_url || score.user.imageUrl ? (
                                                                <img
                                                                    src={score.user.image_url || score.user.imageUrl}
                                                                    alt={score.user.username}
                                                                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700 shadow-sm"
                                                                />
                                                            ) : (
                                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                                                    {score.user.username.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{score.user.username}</h3>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 font-medium">{score.user.roleName}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-10">
                                                            {/* Score % Chart */}
                                                            <div>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Score % Trend</h4>
                                                                    <span className={`text-sm font-black ${getColorForScore(score.scorePercentage)}`}>{score.scorePercentage}%</span>
                                                                </div>
                                                                <VerticalBarChart data={score.trendData} valueKey="score" color="var(--theme-primary)" />
                                                            </div>

                                                            {/* On Time % Chart */}
                                                            <div>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">On Time % Trend</h4>
                                                                    <span className={`text-sm font-black ${getColorForScore(score.onTimePercentage)}`}>{score.onTimePercentage}%</span>
                                                                </div>
                                                                <VerticalBarChart data={score.trendData} valueKey="onTime" color="#3b82f6" />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                    {viewMode === 'grid' && (
                                        <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {userScores.map((score, index) => {
                                                const isExpanded = expandedTiles.has(score.user.id);
                                                return (
                                                    <motion.div
                                                        key={score.user.id}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-fit"
                                                    >
                                                        <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/50">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative">
                                                                        {score.user.image_url || score.user.imageUrl ? (
                                                                            <img src={score.user.image_url || score.user.imageUrl} alt={score.user.username} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm" />
                                                                        ) : (
                                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-yellow-500 flex items-center justify-center text-gray-900 font-bold text-base border-2 border-white shadow-sm">{score.user.username.charAt(0).toUpperCase()}</div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <h3 className="font-bold text-gray-900 dark:text-white text-xs line-clamp-1">{score.user.username}</h3>
                                                                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{score.user.roleName}</span>
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    onClick={() => toggleTile(score.user.id)}
                                                                    className={`relative w-8 h-5 flex items-center rounded-full transition-colors duration-300 focus:outline-none ${isExpanded ? 'bg-[var(--theme-primary)]' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                                    title={isExpanded ? "Hide Details" : "Show Details"}
                                                                >
                                                                    <motion.div
                                                                        animate={{ x: isExpanded ? 14 : 2 }}
                                                                        className="w-3 h-3 bg-white rounded-full shadow-sm"
                                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                                    />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="p-3 space-y-3">
                                                            <section>
                                                                <h4 className="text-[9px] font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Overall</h4>
                                                                <div className="space-y-0.5">
                                                                    <ScoreRow formulaLabel="Completed / Total Task" completed={score.completedTasks} total={score.totalTasks} percentage={score.scorePercentage} />
                                                                    <ScoreRow formulaLabel="On Time / Total Completed" completed={score.onTimeTasks} total={score.completedTasks} percentage={score.onTimePercentage} />
                                                                </div>
                                                            </section>

                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: "auto", opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                                                        className="overflow-hidden space-y-3 pt-3 border-t border-gray-50 dark:border-gray-700/50"
                                                                    >
                                                                        <section className="cursor-pointer group/sec hover:bg-gray-50 dark:hover:bg-gray-700/30 p-1.5 -mx-1.5 rounded-xl transition-colors" onClick={() => handleOpenModal('delegation', score.delegationStats.items, score.user.username)}>
                                                                            <h4 className="text-[9px] font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                                                Delegations
                                                                            </h4>
                                                                            <div className="space-y-0.5">
                                                                                <ScoreRow formulaLabel="Completed / Total" completed={score.delegationStats.completed} total={score.delegationStats.total} percentage={score.delegationStats.total > 0 ? Math.round((score.delegationStats.completed / score.delegationStats.total) * 100) : 0} />
                                                                                <ScoreRow formulaLabel="On Time / Completed" completed={score.delegationStats.onTime} total={score.delegationStats.completed} percentage={score.delegationStats.completed > 0 ? Math.round((score.delegationStats.onTime / score.delegationStats.completed) * 100) : 0} />
                                                                            </div>
                                                                        </section>

                                                                        <section className="cursor-pointer group/sec hover:bg-gray-50 dark:hover:bg-gray-700/30 p-1.5 -mx-1.5 rounded-xl transition-colors" onClick={() => handleOpenModal('checklist', score.checklistStats.items, score.user.username)}>
                                                                            <h4 className="text-[9px] font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                                Checklists
                                                                            </h4>
                                                                            <div className="space-y-0.5">
                                                                                <ScoreRow formulaLabel="Completed / Total" completed={score.checklistStats.completed} total={score.checklistStats.total} percentage={score.checklistStats.total > 0 ? Math.round((score.checklistStats.completed / score.checklistStats.total) * 100) : 0} />
                                                                                <ScoreRow formulaLabel="On Time / Completed" completed={score.checklistStats.onTime} total={score.checklistStats.completed} percentage={score.checklistStats.completed > 0 ? Math.round((score.checklistStats.onTime / score.checklistStats.completed) * 100) : 0} />
                                                                            </div>
                                                                        </section>

                                                                        <section className="cursor-pointer group/sec hover:bg-gray-50 dark:hover:bg-gray-700/30 p-1.5 -mx-1.5 rounded-xl transition-colors" onClick={() => handleOpenModal('o2d', score.o2dStats.items, score.user.username)}>
                                                                            <h4 className="text-[9px] font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                                                O2D Tasks
                                                                            </h4>
                                                                            <div className="space-y-0.5">
                                                                                <ScoreRow formulaLabel="Completed / Total" completed={score.o2dStats.completed} total={score.o2dStats.total} percentage={score.o2dStats.total > 0 ? Math.round((score.o2dStats.completed / score.o2dStats.total) * 100) : 0} />
                                                                                <ScoreRow formulaLabel="On Time / Completed" completed={score.o2dStats.onTime} total={score.o2dStats.completed} percentage={score.o2dStats.completed > 0 ? Math.round((score.o2dStats.onTime / score.o2dStats.completed) * 100) : 0} />
                                                                            </div>
                                                                        </section>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                    {viewMode === 'table' && (
                                        <motion.div key="table" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50/50 dark:bg-gray-700/50 text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                                                        <tr>
                                                            <th className="px-6 py-4">User</th>
                                                            <th className="px-6 py-4">Completed / Total</th>
                                                            <th className="px-6 py-4 text-center">Score %</th>
                                                            <th className="px-6 py-4">On Time / Completed</th>
                                                            <th className="px-6 py-4 text-center">On Time %</th>
                                                            <th className="px-6 py-4 text-right">Details</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                                        {userScores.map((score) => {
                                                            const isExpanded = expandedTiles.has(score.user.id);
                                                            return (
                                                                <Fragment key={score.user.id}>
                                                                    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer" onClick={() => toggleTile(score.user.id)}>
                                                                        <td className="px-6 py-3">
                                                                            <div className="flex items-center gap-3">
                                                                                {score.user.image_url || score.user.imageUrl ? (
                                                                                    <img src={score.user.image_url || score.user.imageUrl} alt={score.user.username} className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-sm" />
                                                                                ) : (
                                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-yellow-500 flex items-center justify-center text-gray-900 font-bold text-xs border border-gray-100 shadow-sm">{score.user.username.charAt(0).toUpperCase()}</div>
                                                                                )}
                                                                                <div>
                                                                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">{score.user.username}</h3>
                                                                                    <span className="text-[10px] text-gray-500">{score.user.roleName}</span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{score.completedTasks}</span>
                                                                                <span className="text-gray-400">/</span>
                                                                                <span className="text-sm font-medium text-gray-500">{score.totalTasks}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center">
                                                                            <span className={`text-sm font-bold ${getColorForScore(score.scorePercentage)}`}>{score.scorePercentage}%</span>
                                                                        </td>
                                                                        <td className="px-6 py-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{score.onTimeTasks}</span>
                                                                                <span className="text-gray-400">/</span>
                                                                                <span className="text-sm font-medium text-gray-500">{score.completedTasks}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center">
                                                                            <span className={`text-sm font-bold ${getColorForScore(score.onTimePercentage)}`}>{score.onTimePercentage}%</span>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-right">
                                                                            <button
                                                                                className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-[var(--theme-primary)] text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-gray-600'}`}
                                                                            >
                                                                                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                                </svg>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                    {isExpanded && (
                                                                        <>
                                                                            {/* Delegations Breakdown Row */}
                                                                            {(() => {
                                                                                const delPercentage = score.delegationStats.total > 0 ? Math.round((score.delegationStats.completed / score.delegationStats.total) * 100) : 0;
                                                                                const delOnTimePercentage = score.delegationStats.completed > 0 ? Math.round((score.delegationStats.onTime / score.delegationStats.completed) * 100) : 0;
                                                                                return (
                                                                                    <tr>
                                                                                        <td className="px-6 py-3 pl-10 bg-gray-50 dark:bg-gray-800/60 rounded-l-xl border-l-[4px] border-l-orange-400">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="text-gray-300 text-lg">↳</span>
                                                                                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Delegations</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60">
                                                                                            <div className="flex items-center gap-1.5 opacity-90">
                                                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{score.delegationStats.completed}</span>
                                                                                                <span className="text-gray-400">/</span>
                                                                                                <span className="text-xs font-medium text-gray-400">{score.delegationStats.total}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 text-center bg-gray-50 dark:bg-gray-800/60">
                                                                                            <span className={`text-xs font-bold ${getColorForScore(delPercentage)}`}>{delPercentage}%</span>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60">
                                                                                            <div className="flex items-center gap-1.5 opacity-90">
                                                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{score.delegationStats.onTime}</span>
                                                                                                <span className="text-gray-400">/</span>
                                                                                                <span className="text-xs font-medium text-gray-400">{score.delegationStats.completed}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 text-center bg-gray-50 dark:bg-gray-800/60">
                                                                                            <span className={`text-xs font-bold ${getColorForScore(delOnTimePercentage)}`}>{delOnTimePercentage}%</span>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 text-right bg-gray-50 dark:bg-gray-800/60 rounded-r-xl">
                                                                                            <div className="flex items-center justify-end">
                                                                                                <button
                                                                                                    onClick={(e) => { e.stopPropagation(); handleOpenModal('delegation', score.delegationStats.items, score.user.username); }}
                                                                                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-700 text-gray-400 hover:text-orange-500 transition-colors shadow-sm"
                                                                                                    title="View Details"
                                                                                                >
                                                                                                    <span className="text-[10px] font-medium pr-1">View</span>
                                                                                                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                                    </svg>
                                                                                                </button>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })()}

                                                                            {/* Checklists Breakdown Row */}
                                                                            {(() => {
                                                                                const chklPercentage = score.checklistStats.total > 0 ? Math.round((score.checklistStats.completed / score.checklistStats.total) * 100) : 0;
                                                                                const chklOnTimePercentage = score.checklistStats.completed > 0 ? Math.round((score.checklistStats.onTime / score.checklistStats.completed) * 100) : 0;
                                                                                return (
                                                                                    <tr>
                                                                                        <td className="px-6 py-3 pl-10 bg-gray-50 dark:bg-gray-800/60 rounded-l-xl border-l-[4px] border-l-green-400">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="text-gray-300 text-lg">↳</span>
                                                                                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Checklists</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60">
                                                                                            <div className="flex items-center gap-1.5 opacity-90">
                                                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{score.checklistStats.completed}</span>
                                                                                                <span className="text-gray-400">/</span>
                                                                                                <span className="text-xs font-medium text-gray-400">{score.checklistStats.total}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 text-center bg-gray-50 dark:bg-gray-800/60">
                                                                                            <span className={`text-xs font-bold ${getColorForScore(chklPercentage)}`}>{chklPercentage}%</span>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60">
                                                                                            <div className="flex items-center gap-1.5 opacity-90">
                                                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{score.checklistStats.onTime}</span>
                                                                                                <span className="text-gray-400">/</span>
                                                                                                <span className="text-xs font-medium text-gray-400">{score.checklistStats.completed}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 text-center bg-gray-50 dark:bg-gray-800/60">
                                                                                            <span className={`text-xs font-bold ${getColorForScore(chklOnTimePercentage)}`}>{chklOnTimePercentage}%</span>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 text-right bg-gray-50 dark:bg-gray-800/60 rounded-r-xl">
                                                                                            <div className="flex items-center justify-end">
                                                                                                <button
                                                                                                    onClick={(e) => { e.stopPropagation(); handleOpenModal('checklist', score.checklistStats.items, score.user.username); }}
                                                                                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-700 text-gray-400 hover:text-green-500 transition-colors shadow-sm"
                                                                                                    title="View Details"
                                                                                                >
                                                                                                    <span className="text-[10px] font-medium pr-1">View</span>
                                                                                                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                                    </svg>
                                                                                                </button>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })()}

                                                                            {/* O2D Breakdown Row */}
                                                                            {(() => {
                                                                                const o2dPercentage = score.o2dStats.total > 0 ? Math.round((score.o2dStats.completed / score.o2dStats.total) * 100) : 0;
                                                                                const o2dOnTimePercentage = score.o2dStats.completed > 0 ? Math.round((score.o2dStats.onTime / score.o2dStats.completed) * 100) : 0;
                                                                                return (
                                                                                    <tr>
                                                                                        <td className="px-6 py-3 pl-10 bg-gray-50 dark:bg-gray-800/60 rounded-l-xl border-l-[4px] border-l-blue-400">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="text-gray-300 text-lg">↳</span>
                                                                                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">O2D Tasks</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60">
                                                                                            <div className="flex items-center gap-1.5 opacity-90">
                                                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{score.o2dStats.completed}</span>
                                                                                                <span className="text-gray-400">/</span>
                                                                                                <span className="text-xs font-medium text-gray-400">{score.o2dStats.total}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 text-center bg-gray-50 dark:bg-gray-800/60">
                                                                                            <span className={`text-xs font-bold ${getColorForScore(o2dPercentage)}`}>{o2dPercentage}%</span>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60">
                                                                                            <div className="flex items-center gap-1.5 opacity-90">
                                                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{score.o2dStats.onTime}</span>
                                                                                                <span className="text-gray-400">/</span>
                                                                                                <span className="text-xs font-medium text-gray-400">{score.o2dStats.completed}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 text-center bg-gray-50 dark:bg-gray-800/60">
                                                                                            <span className={`text-xs font-bold ${getColorForScore(o2dOnTimePercentage)}`}>{o2dOnTimePercentage}%</span>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 text-right bg-gray-50 dark:bg-gray-800/60 rounded-r-xl">
                                                                                            <div className="flex items-center justify-end">
                                                                                                <button
                                                                                                    onClick={(e) => { e.stopPropagation(); handleOpenModal('o2d', score.o2dStats.items, score.user.username); }}
                                                                                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors shadow-sm"
                                                                                                    title="View Details"
                                                                                                >
                                                                                                    <span className="text-[10px] font-medium pr-1">View</span>
                                                                                                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                                    </svg>
                                                                                                </button>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })()}
                                                                            {/* Add a transparent spacer row for better separation */}
                                                                            <tr className="h-1 bg-transparent"></tr>
                                                                        </>
                                                                    )}
                                                                </Fragment>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <motion.div key="appraisal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                            <div className="max-w-md mx-auto">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📈</div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Appraisal System</h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">This module is currently under development.</p>
                                <button className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium">Coming Soon</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <TaskDetailModal
                    isOpen={modalConfig.isOpen}
                    onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                    title={modalConfig.title}
                    tasks={modalConfig.tasks}
                    type={modalConfig.type}
                />

                {searchQuery.toLowerCase() === 'debug' && (
                    <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto max-h-96 text-xs font-mono">
                        <h3 className="font-bold mb-2">Debug Info</h3>
                        <p>Total Users: {users.length}</p>
                        <p>Total O2D Orders: {allO2DOrders.length}</p>
                        <p>O2D Config Steps: {o2dConfig.length}</p>
                        <pre>{JSON.stringify(o2dConfig, null, 2)}</pre>
                        <hr className="my-2" />
                        <p>First 1 Orders Sample:</p>
                        <pre>{JSON.stringify(allO2DOrders.slice(0, 1), null, 2)}</pre>
                    </div>
                )}
            </div>
        </LayoutWrapper>
    );
}
