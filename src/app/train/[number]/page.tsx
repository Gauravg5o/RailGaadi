'use client';

import React, { use } from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import TrainDashboard from '@/features/dashboard/TrainDashboard';

export default function TrainPage({ params }: { params: Promise<{ number: string }> }) {
  const resolvedParams = use(params);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-8">
      <Header />
      <main className="flex-1">
        <TrainDashboard trainNumber={resolvedParams.number} />
      </main>
      <BottomNavigation />
    </div>
  );
}
