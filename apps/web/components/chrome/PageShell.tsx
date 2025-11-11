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
  const { user, activeOrgId, logout } = useAuth();
  const router = useRouter();

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

        {/* Right: org dropdown + user dropdown */}
        <div className="flex items-center flex-shrink-0 gap-6">
          <OrgDropdown />
          <UserDropdown user={user} activeOrgId={activeOrgId} logout={logout} router={router} />
        </div>
      </div>
    </header>
  );
}

function UserDropdown({
  user,
  activeOrgId,
  logout,
  router,
}: {
  user: any;
  activeOrgId: string | null;
  logout: () => void;
  router: any;
}) {
  const activeOrg = user?.orgs?.find((org) => org.org_id === activeOrgId);
  const userRole = activeOrg?.role === "admin" ? "Administrator" : "Member";
  const userName = user?.email?.split("@")[0] || "Admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        showChevron={false}
        className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-all"
      >
        <span>{userName}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="right-0 left-auto min-w-[200px] rounded-md border border-slate-200 bg-white shadow-lg text-sm py-2">
        {/* User info header */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="font-medium text-slate-900">{userName}</div>
          <div className="text-xs text-slate-500 mt-0.5">{userRole}</div>
        </div>
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
  );
}

/** Sidebar */
function Sidebar() {
  const pathname = usePathname();

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

