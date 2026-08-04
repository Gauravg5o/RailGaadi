import React from 'react';
import GlassCard from './GlassCard';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'info';
}

export default function MetricCard({ icon, label, value, subtext, badge, badgeType = 'info' }: MetricCardProps) {
  const badgeStyles =
    badgeType === 'success'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : badgeType === 'warning'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <GlassCard hoverable>
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">{icon}</div>
        {badge && (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyles}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
    </GlassCard>
  );
}
