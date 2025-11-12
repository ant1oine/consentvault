"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const PAGES = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "API Logs", href: "/api-logs" },
  { label: "Consents", href: "/consents" },
  { label: "Data Rights", href: "/data-rights" },
  { label: "Activity", href: "/activity" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const items = useMemo(() => PAGES, []);

  // Check if user is authenticated via token
  const isAuthenticated = typeof window !== "undefined" && !!localStorage.getItem("access_token");

  useEffect(() => {
    // Only enable CommandPalette when authenticated
    if (!isAuthenticated) return;

    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setIndex(0);
      }
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") setIndex((i) => Math.min(i + 1, items.length - 1));
      if (e.key === "ArrowUp") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Enter") {
        setOpen(false);
        router.push(items[index].href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, items, router, isAuthenticated]);

  // Don't show CommandPalette if not authenticated
  if (!isAuthenticated || !open) return null;

  // compute width by longest label
  const maxLabel = items.reduce((m, it) => (it.label.length > m.length ? it.label : m), "");
  const aproxWidth = Math.max(360, Math.min(720, maxLabel.length * 14 + 80)); // px heuristic

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

      {/* centered dialog */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white shadow-xl"
        style={{ width: aproxWidth }}
      >
        <div className="px-3 py-2 border-b text-sm text-slate-600">Jump to…</div>
        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {items.map((it, i) => {
            const active = i === index;
            const current = pathname === it.href;
            return (
              <li
                key={it.href}
                className={`px-3 py-2 text-[15px] ${
                  active ? "bg-slate-100" : ""
                } ${current ? "text-slate-900 font-medium" : "text-slate-700"}`}
              >
                {it.label}
                {current && <span className="ml-2 text-xs text-slate-500">(current)</span>}
              </li>
            );
          })}
        </ul>
        <div className="px-3 py-2 border-t text-xs text-slate-500">
          ↑/↓ to navigate • Enter to select • Esc to close
        </div>
      </div>
    </div>
  );
}
