'use client';

import { motion } from 'framer-motion';

export default function TrustLock() {
  return (
    <motion.div 
      className="relative w-[520px] h-[520px] flex items-center justify-center select-none"
      whileHover={{ rotateY: 8 }} 
      transition={{ type: 'spring', stiffness: 50 }}
      style={{ perspective: '1000px' }}
    >
      {/* Background Glow */}
      <motion.div
        className="absolute w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-[#E0F2FE] to-[#EEF2FF] blur-3xl opacity-60"
        animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.8, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Lock Body */}
      <svg
        viewBox="0 0 200 280"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[240px] h-[320px] drop-shadow-xl"
      >
        <defs>
          <linearGradient id="lockBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#F1F5F9" />
          </linearGradient>
          <radialGradient id="highlight" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Lock Shackle */}
        <motion.path
          d="M50,100 C50,40 150,40 150,100"
          fill="none"
          stroke="url(#metal)"
          strokeWidth="20"
          strokeLinecap="round"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Lock Body */}
        <rect
          x="35"
          y="100"
          width="130"
          height="150"
          rx="12"
          fill="url(#lockBody)"
        />
        
        {/* Subtle reflection animation */}
        <motion.rect
          x="35"
          y="100"
          width="130"
          height="150"
          rx="12"
          fill="url(#highlight)"
          animate={{ opacity: [0.2, 0.5, 0.2], x: [-5, 5, -5] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Keyhole */}
        <motion.circle
          cx="100"
          cy="170"
          r="14"
          fill="#FFFFFF"
          stroke="#1E3A8A"
          strokeWidth="3"
          animate={{ scale: [1, 1.1, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.rect
          x="95"
          y="180"
          width="10"
          height="25"
          rx="3"
          fill="#1E3A8A"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </motion.div>
  );
}

