'use client';

import React, { useState } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';
import GlassCard from './GlassCard';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainNumber: string;
  trainName: string;
}

export default function ShareModal({ isOpen, onClose, trainNumber, trainName }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/train/${trainNumber}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <GlassCard className="w-full max-w-md bg-white p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Share Live Journey</h3>
            <p className="text-xs text-slate-500">{trainNumber} - {trainName}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mt-4">
          Share this public link with friends or family so they can track live journey location, delays, and arrival times in real time.
        </p>

        <div className="mt-4 flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-transparent text-xs font-mono text-slate-700 px-2 focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy
              </>
            )}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
