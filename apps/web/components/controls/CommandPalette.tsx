"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const actions = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "API Logs", href: "/api-logs" },
  { label: "Consents", href: "/consents" },
  { label: "Data Rights", href: "/data-rights" },
  { label: "Integration Guide", href: "/docs/integration" },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setIndex(0); // Reset index when opening
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => (i + 1) % actions.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => (i - 1 + actions.length) % actions.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        router.push(actions[index].href);
        onOpenChange(false);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, index, router, onOpenChange]);

  if (!open) return null;

  const handleSelect = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 flex items-start justify-center pt-24"
      onClick={() => onOpenChange(false)}
    >
      <div
        ref={containerRef}
        className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <ul className="max-h-72 overflow-auto">
          {actions.map((a, i) => (
            <li key={a.href}>
              <button
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  i === index ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-slate-50 text-slate-700"
                }`}
                onClick={() => handleSelect(a.href)}
              >
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

