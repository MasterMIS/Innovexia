'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomDateTimePickerProps {
    value: string; // ISO string
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
}

export default function CustomDateTimePicker({
    value,
    onChange,
    label,
    placeholder = 'Select date & time'
}: CustomDateTimePickerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());
    const [selectedHour, setSelectedHour] = useState(() => {
        const date = value ? new Date(value) : new Date();
        let hours = date.getHours();
        return hours % 12 || 12;
    });
    const [selectedMinute, setSelectedMinute] = useState(() => {
        const date = value ? new Date(value) : new Date();
        return Math.floor(date.getMinutes() / 15) * 15;
    });
    const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(() => {
        const date = value ? new Date(value) : new Date();
        return date.getHours() >= 12 ? 'PM' : 'AM';
    });

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handleDateTimeSet = () => {
        const hour24 = selectedPeriod === 'PM' && selectedHour !== 12
            ? selectedHour + 12
            : selectedPeriod === 'AM' && selectedHour === 12
                ? 0
                : selectedHour;

        const dateTime = new Date(selectedDate);
        dateTime.setHours(hour24, selectedMinute, 0, 0);

        onChange(dateTime.toISOString());
        setShowPicker(false);
    };

    const formatDateDisplay = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="relative">
            {label && <label className="block text-sm font-semibold mb-2">{label}</label>}
            <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-left text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4d24a] transition text-sm flex items-center justify-between"
            >
                <span>{value ? formatDateDisplay(value) : placeholder}</span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            <AnimatePresence>
                {showPicker && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-[60]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPicker(false)}
                        />

                        <motion.div
                            className="fixed top-1/2 left-1/2 z-[70] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto"
                            initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
                            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                            exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Calendar */}
                            <div className="w-80">
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                                        className="p-2 hover:bg-[#f4d24a]/10 dark:hover:bg-gray-700 rounded-lg transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                                        {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                                        className="p-2 hover:bg-[#f4d24a]/10 dark:hover:bg-gray-700 rounded-lg transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-500 uppercase mb-2">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                        <div key={day} className="py-2">{day}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: getFirstDayOfMonth(selectedDate) }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}
                                    {Array.from({ length: getDaysInMonth(selectedDate) }).map((_, i) => {
                                        const day = i + 1;
                                        const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                                        const isSelected = selectedDate.getDate() === day;
                                        const isToday = new Date().toDateString() === date.toDateString();

                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setDate(day);
                                                    setSelectedDate(newDate);
                                                }}
                                                className={`p-2.5 text-sm rounded-xl transition-all ${isSelected
                                                    ? 'bg-[#f4d24a] text-gray-900 font-bold shadow-lg'
                                                    : isToday
                                                        ? 'bg-[#f4d24a]/20 text-[#f4d24a] font-bold border border-[#f4d24a]'
                                                        : 'hover:bg-[#f4d24a]/10 text-gray-900 dark:text-white'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Clock Time Picker */}
                            <div className="w-80 md:border-l border-gray-200 dark:border-gray-700 md:pl-6 pt-6 md:pt-0">
                                <div className="text-center mb-6">
                                    <span className="text-3xl font-black text-gray-900 dark:text-white tracking-wider">
                                        {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
                                    </span>
                                </div>

                                <div className="flex gap-4 justify-center items-center mb-8">
                                    {/* Hour Selector */}
                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedHour(selectedHour === 12 ? 1 : selectedHour + 1)}
                                            className="p-2 hover:bg-[#f4d24a]/10 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-2xl shadow-inner">
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{selectedHour.toString().padStart(2, '0')}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedHour(selectedHour === 1 ? 12 : selectedHour - 1)}
                                            className="p-2 hover:bg-[#f4d24a]/10 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>

                                    <span className="text-4xl font-black text-gray-400 self-center">:</span>

                                    {/* Minute Selector */}
                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMinute((selectedMinute + 15) % 60)}
                                            className="p-2 hover:bg-[#f4d24a]/10 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-2xl shadow-inner">
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{selectedMinute.toString().padStart(2, '0')}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMinute(selectedMinute === 0 ? 45 : selectedMinute - 15)}
                                            className="p-2 hover:bg-[#f4d24a]/10 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* AM/PM Selector */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedPeriod('AM')}
                                            className={`px-4 py-3 rounded-xl font-bold shadow-sm transition ${selectedPeriod === 'AM'
                                                ? 'bg-[#f4d24a] text-gray-900'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            AM
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedPeriod('PM')}
                                            className={`px-4 py-3 rounded-xl font-bold shadow-sm transition ${selectedPeriod === 'PM'
                                                ? 'bg-[#f4d24a] text-gray-900'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            PM
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPicker(false)}
                                        className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-bold rounded-xl transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDateTimeSet}
                                        className="flex-[2] py-3 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] hover:from-[#e5c33a] hover:to-[#d4b22a] text-gray-900 font-black rounded-xl shadow-lg transition"
                                    >
                                        Set Date & Time
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
