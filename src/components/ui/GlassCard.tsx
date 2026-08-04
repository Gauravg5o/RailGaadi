import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', hoverable = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={onClick}
      className={`glass-panel rounded-2xl p-5 ${hoverable ? 'glass-panel-hover cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
