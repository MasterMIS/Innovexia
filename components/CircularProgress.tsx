import React from 'react';
import { motion } from 'framer-motion';

interface CircularProgressProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color?: string; // Optional: manual color
    trackColor?: string;
    fontSize?: string;
    showText?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
    percentage,
    size = 60,
    strokeWidth = 6,
    color,
    trackColor = '#F3F4F6',
    fontSize = '0.75rem',
    showText = true
}) => {
    // Default color logic based on user request:
    // < 34: red, 34-75: yellow, > 75: green
    const getAutoColor = (val: number) => {
        if (val < 34) return '#EF4444'; // Red-500
        if (val < 76) return '#F59E0B'; // Yellow-500
        return '#10B981'; // Green-500
    };

    const finalColor = color || getAutoColor(percentage);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Track Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={finalColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    strokeLinecap="round"
                />
            </svg>
            {showText && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-bold text-gray-900" style={{ fontSize }}>
                        {percentage}%
                    </span>
                </div>
            )}
        </div>
    );
};
