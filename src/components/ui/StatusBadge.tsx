import React from 'react';
import { formatDelay } from '@/utils';

interface StatusBadgeProps {
  delayMinutes: number;
  status: string; // 'On Time' | 'Delayed' | 'Cancelled' | 'Completed' | 'Not Started' | API values
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ delayMinutes, status, size = 'md' }: StatusBadgeProps) {
  if (status === 'Cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        Cancelled
      </span>
    );
  }

  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
        Journey Completed
      </span>
    );
  }

  const { text, color, bg } = formatDelay(delayMinutes);

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-4 py-1.5 text-sm font-semibold'
      : 'px-3 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${bg} ${color} ${sizeClasses}`}>
      <span
        className={`w-2 h-2 rounded-full ${
          delayMinutes <= 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
        }`}
      />
      {text}
    </span>
  );
}
