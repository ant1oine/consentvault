"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Activity, FileCheck, UserCog, Building2, ChevronDown } from "lucide-react";
import { OrgDropdown } from "../controls/OrgDropdown";
import { CommandPalette } from "../controls/CommandPalette";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function PageShell({ children }: { children: React.ReactNode }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [cmdOpen, setCmdOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ⌘K or Ctrl+K opens palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
      // '/' focuses search if not typing in an input already
      if (
        e.key === "/" &&
        !(e.target as HTMLElement)?.closest("input,textarea,[contenteditable='true']")
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header searchRef={searchRef} />

      {/* main horizontal split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar anchored flush to left */}
        <aside className="w-[200px] bg-slate-50 border-r border-slate-200 flex flex-col overflow-visible">
          <Sidebar />
        </aside>

        {/* Main content area */}
        <main className="flex-1 bg-white overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-6">{children}</div>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}

function Header({ searchRef }: { searchRef: React.RefObject<HTMLInputElement> }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-6 w-full">
        {/* Left: brand - extreme left */}
        <div className="flex items-center flex-shrink-0">
          <Link href="/dashboard" className="font-semibold text-slate-900 tracking-tight">
            ConsentVault
          </Link>
        </div>

        {/* Center: search */}
        <div className="relative flex-1 max-w-xl mx-8">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search logs, consents, or users…  ( / to focus )"
            className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <kbd className="absolute right-2 top-[6px] text-[10px] text-slate-400">⌘K</kbd>
        </div>

        {/* Right: org dropdown - extreme right */}
        <div className="flex items-center flex-shrink-0">
          <OrgDropdown />
        </div>
      </div>
    </header>
  );
}

/** Sidebar with bottom-left user block */
function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const items = [
    { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/api-logs", label: "API Logs", Icon: Activity },
    { href: "/consents", label: "Consents", Icon: FileCheck },
    { href: "/data-rights", label: "Data Rights", Icon: UserCog },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-visible">
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-visible">
        <Section title="Monitoring" />
        {items.slice(0, 2).map((i) => (
          <NavLink key={i.href} {...i} active={pathname === i.href} />
        ))}
        <Section title="Governance" />
        {items.slice(2).map((i) => (
          <NavLink key={i.href} {...i} active={pathname === i.href} />
        ))}
      </nav>

      {/* bottom user menu */}
      <div className="border-t border-slate-200 p-3">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger
              showChevron={false}
              className="w-full flex items-center justify-between text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md px-3 py-2"
            >
              <span>{user?.email?.split("@")[0] || "Admin User"}</span>
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="!left-0 !right-auto !bottom-full !top-auto !mb-1 !mt-0 w-[calc(200px-24px)] rounded-md border border-slate-200 bg-white shadow-lg text-sm">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-red-600 hover:bg-red-50">
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
      {title}
    </div>
  );
}

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all ${
        active
          ? "bg-slate-100 text-slate-900 font-medium before:absolute before:left-0 before:w-[3px] before:h-full before:bg-blue-600"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-blue-600" : "text-slate-400"}`} />
      {label}
    </Link>
  );
}

