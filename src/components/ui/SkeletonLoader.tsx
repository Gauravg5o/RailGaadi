import React from 'react';

export default function SkeletonLoader({ className = 'h-24 w-full' }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-2xl ${className}`} />;
}
