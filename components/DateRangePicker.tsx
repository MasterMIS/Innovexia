'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DateRangePickerProps {
    fromDate: string;
    toDate: string;
    onRangeChange: (from: string, to: string) => void;
}

export default function DateRangePicker({ fromDate, toDate, onRangeChange }: DateRangePickerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(fromDate ? new Date(fromDate) : null);
    const [endDate, setEndDate] = useState<Date | null>(toDate ? new Date(toDate) : null);
    const [currentMonth1, setCurrentMonth1] = useState(new Date());
    const [currentMonth2, setCurrentMonth2] = useState(() => {
        const next = new Date();
        next.setMonth(next.getMonth() + 1);
        return next;
    });
    const [selectingStart, setSelectingStart] = useState(true);

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handleDateClick = (date: Date) => {
        // Normalize the date to midnight to avoid time comparison issues
        const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (selectingStart) {
            setStartDate(normalizedDate);
            setEndDate(null);
            setSelectingStart(false);
        } else {
            if (startDate && normalizedDate < startDate) {
                setStartDate(normalizedDate);
                setEndDate(null);
                setSelectingStart(false);
            } else {
                setEndDate(normalizedDate);
                setSelectingStart(true);
            }
        }
    };

    const handleApply = () => {
        if (startDate && endDate) {
            // Use local timezone to avoid UTC offset issues
            const formatLocalDate = (date: Date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            onRangeChange(
                formatLocalDate(startDate),
                formatLocalDate(endDate)
            );
            setShowPicker(false);
        }
    };

    const formatDisplayDate = () => {
        if (fromDate && toDate) {
            return `${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`;
        }
        return 'Select date range';
    };

    const renderCalendar = (currentMonth: Date, setCurrentMonth: (date: Date) => void, isFirst: boolean = true) => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);

        const handleMonthChange = (direction: 'prev' | 'next') => {
            const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
            setCurrentMonth(newDate);
            
            // Sync the other calendar to maintain 1-month gap
            if (isFirst) {
                const nextMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1);
                setCurrentMonth2(nextMonth);
            } else {
                const prevMonth = new Date(newDate.getFullYear(), newDate.getMonth() - 1);
                setCurrentMonth1(prevMonth);
            }
        };

        return (
            <div className="w-80">
                <div className="flex items-center justify-between mb-3">
                    <button
                        type="button"
                        onClick={() => handleMonthChange('prev')}
                        className="p-1 hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 rounded"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="font-semibold text-gray-900 dark:text-white">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        type="button"
                        onClick={() => handleMonthChange('next')}
                        className="p-1 hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 rounded"
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
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                        
                        // Create normalized dates for comparison (midnight with no time)
                        const dateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                        const startTime = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime() : null;
                        const endTime = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime() : null;
                        
                        const isStart = startTime && dateTime === startTime;
                        const isEnd = endTime && dateTime === endTime;
                        const isInRange = startTime && endTime && dateTime >= startTime && dateTime <= endTime && !isStart && !isEnd;
                        const isSelected = isStart || isEnd;

                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleDateClick(date)}
                                className={`p-2 text-sm rounded-lg transition ${
                                    isSelected
                                        ? 'bg-[var(--theme-primary)] text-gray-900 font-bold shadow-md'
                                        : isInRange
                                            ? 'bg-[var(--theme-primary)]/40 text-gray-900 dark:text-white font-semibold'
                                            : 'hover:bg-[var(--theme-lighter)] dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                    }`}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="w-full px-3 py-2 bg-[var(--theme-lighter)] dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] transition text-left flex items-center justify-between"
            >
                <span>{formatDisplayDate()}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {showPicker && (
                <div className="fixed inset-0 z-[9996] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowPicker(false)}
                    />

                    {/* Modal */}
                    <motion.div
                        className="relative z-[9997] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-[90vw]"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex gap-6 flex-wrap justify-center">
                            {renderCalendar(currentMonth1, setCurrentMonth1, true)}
                            {renderCalendar(currentMonth2, setCurrentMonth2, false)}
                        </div>

                        <div className="mt-4 flex gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setStartDate(null);
                                    setEndDate(null);
                                    setSelectingStart(true);
                                    onRangeChange('', '');
                                    setShowPicker(false);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-semibold rounded-lg transition"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={handleApply}
                                disabled={!startDate || !endDate}
                                className="flex-1 px-4 py-2 bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] text-gray-900 text-sm font-bold rounded-lg transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

