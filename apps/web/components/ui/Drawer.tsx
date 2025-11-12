"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function Drawer({ 
  open, 
  onClose, 
  children 
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.div
            className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-xl border-l z-40 overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="flex justify-end p-4 border-b border-slate-200">
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

