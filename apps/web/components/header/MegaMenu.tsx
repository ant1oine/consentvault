'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

type Item = { title: string; desc?: string; href: string; };
type Menu = { label: string; items: Item[] };

export function MegaMenu({ menus }: { menus: Menu[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [menuPositions, setMenuPositions] = useState<Record<string, { left?: number; right?: number }>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOpen(label);
    // Calculate position after menu opens
    setTimeout(() => {
      calculatePosition(label);
    }, 0);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(null);
    }, 150);
  };

  const calculatePosition = (label: string) => {
    const button = buttonRefs.current[label];
    const menu = menuRefs.current[label];
    if (!button || !menu) return;

    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const padding = 16;

    // Default: align left edge of menu with left edge of button
    let left = 0;
    let right: number | undefined = undefined;

    // Check if menu would overflow on the right
    if (buttonRect.left + menuRect.width > viewportWidth - padding) {
      // Check if menu would overflow on the left
      if (buttonRect.right - menuRect.width < padding) {
        // If menu is wider than viewport, align to left edge with padding
        left = padding - buttonRect.left;
      } else {
        // Align right edge of menu with right edge of button
        right = 0;
        left = undefined;
      }
    }

    setMenuPositions(prev => ({
      ...prev,
      [label]: { left, right },
    }));
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(null);
      }
    };
    const handleResize = () => {
      if (open) {
        Object.keys(menuRefs.current).forEach(label => {
          if (menuRefs.current[label]) {
            calculatePosition(label);
          }
        });
      }
    };
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  return (
    <nav className="hidden md:flex items-center gap-0" role="navigation" aria-label="Main navigation">
      {menus.map((m, index) => (
        <div key={m.label} className="flex items-center">
          <div
            onMouseEnter={() => handleMouseEnter(m.label)}
            onMouseLeave={handleMouseLeave}
            className="relative"
          >
            <button
              ref={el => buttonRefs.current[m.label] = el}
              className="text-sm font-medium text-slate-700 hover:text-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 rounded px-3 py-2 -mx-1 transition-all duration-[120ms] ease-in-out relative group"
              aria-expanded={open === m.label}
              aria-haspopup="true"
              aria-label={`${m.label} menu`}
            >
              <span className="relative">
                {m.label}
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E3A8A] scale-x-0 group-hover:scale-x-100 transition-transform duration-[120ms] ease-in-out origin-left" />
              </span>
            </button>
          {open === m.label && (
            <div
              ref={el => menuRefs.current[m.label] = el}
              onMouseEnter={() => handleMouseEnter(m.label)}
              onMouseLeave={handleMouseLeave}
              className={`absolute top-full mt-1 w-[640px] max-w-[640px] rounded-lg border border-slate-200/60 bg-white shadow-lg shadow-slate-200/60 p-4 z-50 transition-all duration-[120ms] ease-in-out ${
                menuPositions[m.label]?.right !== undefined ? 'right-0' : 'left-0'
              }`}
              style={{
                left: menuPositions[m.label]?.left !== undefined ? `${menuPositions[m.label]!.left}px` : undefined,
                right: menuPositions[m.label]?.right !== undefined ? `${menuPositions[m.label]!.right}px` : undefined,
              }}
              role="menu"
              aria-label={`${m.label} submenu`}
            >
              <div className="grid grid-cols-2 gap-3">
                {m.items.map((it, idx) => (
                  <Link
                    key={it.title}
                    href={it.href}
                    className="rounded-lg p-3 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 transition-all duration-[120ms] ease-in-out group/item"
                    role="menuitem"
                    tabIndex={0}
                  >
                    <div className="text-sm font-medium text-slate-700 group-hover/item:text-[#1E3A8A] transition-colors duration-[120ms] ease-in-out">{it.title}</div>
                    {it.desc && <div className="text-xs text-slate-500 mt-1">{it.desc}</div>}
                  </Link>
                ))}
              </div>
            </div>
          )}
          </div>
          {index < menus.length - 1 && (
            <div className="h-6 w-px bg-slate-200/60 mx-2 group-hover:bg-slate-300/60 transition-colors" />
          )}
        </div>
      ))}
    </nav>
  );
}

