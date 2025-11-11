'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLangChange = (newLang: 'en' | 'ar') => {
    setLang(newLang);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 rounded-md flex items-center justify-center text-slate-600 hover:text-[#1E3A8A] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 transition-all duration-[120ms] ease-in-out"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Change language"
        title="Change language"
      >
        <Globe className="w-4 h-4" />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-32 rounded-lg border border-slate-200/60 bg-white shadow-lg shadow-slate-200/60 z-50 overflow-hidden transition-all duration-[120ms] ease-in-out"
          role="menu"
          aria-label="Language options"
        >
          <button
            onClick={() => handleLangChange('en')}
            className={`block w-full text-left px-3 py-2 text-sm font-medium transition-all duration-[120ms] ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-inset ${
              lang === 'en' 
                ? 'bg-slate-100 text-[#1E3A8A]' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#1E3A8A]'
            }`}
            role="menuitem"
            tabIndex={0}
          >
            English
          </button>
          <button
            onClick={() => handleLangChange('ar')}
            className={`block w-full text-left px-3 py-2 text-sm font-medium transition-all duration-[120ms] ease-in-out focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-inset ${
              lang === 'ar' 
                ? 'bg-slate-100 text-[#1E3A8A]' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#1E3A8A]'
            }`}
            role="menuitem"
            tabIndex={0}
          >
            العربية
          </button>
        </div>
      )}
    </div>
  );
}

