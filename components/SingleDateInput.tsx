'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SingleDateInputProps {
    date: Date | null;
    onChange: (date: Date) => void;
    placeholder?: string;
}

export default function SingleDateInput({ date, onChange, placeholder = 'Select date' }: SingleDateInputProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(date || new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync current month when date changes externally
    useEffect(() => {
        if (date) {
            setCurrentMonth(date);
        }
    }, [date]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + (direction === 'next' ? 1 : -1)));
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        // Set to noon to avoid timezone issues when converting to string only Date
        newDate.setHours(12, 0, 0, 0);
        onChange(newDate);
        setShowPicker(false);
    };

    const formatDateDisplay = (date: Date | null) => {
        if (!date) return '';
        // Format as DD/MM/YYYY
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);

        return (
            <div className="w-64 p-4">
                <div className="flex items-center justify-between mb-4">
                    <button
                        type="button"
                        onClick={() => handleMonthChange('prev')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="font-semibold text-gray-900 dark:text-white">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        type="button"
                        onClick={() => handleMonthChange('next')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const currentDayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

                        const isSelected = date &&
                            date.getDate() === day &&
                            date.getMonth() === currentMonth.getMonth() &&
                            date.getFullYear() === currentMonth.getFullYear();

                        const isToday = new Date().toDateString() === currentDayDate.toDateString();

                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleDateClick(day)}
                                className={`
                                    h-8 w-8 rounded-full text-sm flex items-center justify-center transition-all
                                    ${isSelected
                                        ? 'bg-[var(--theme-primary)] text-gray-900 font-bold shadow-sm'
                                        : isToday
                                            ? 'bg-gray-100 dark:bg-gray-700 text-[var(--theme-primary)] font-bold'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }
                                `}
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
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent min-w-[140px]"
            >
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className={`text-gray-700 dark:text-gray-200 ${!date ? 'text-gray-400' : ''}`}>
                    {date ? formatDateDisplay(date) : placeholder}
                </span>
            </button>

            <AnimatePresence>
                {showPicker && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                    >
                        {renderCalendar()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
