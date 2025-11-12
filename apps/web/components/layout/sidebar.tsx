"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Server,
  ClipboardList,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { getMe } from "@/lib/api";

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await getMe();
        // API now returns { email, role } directly
        setUser({ email: data.email, role: data.role });
      } catch (err) {
        console.error("Failed to fetch user info:", err);
      }
    }
    fetchUser();
  }, []);

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/api-logs", label: "API Logs", icon: Server },
    { href: "/consents", label: "Consents", icon: ClipboardList },
    { href: "/data-rights", label: "Data Rights", icon: ShieldCheck },
    { href: "/activity", label: "Activity", icon: Activity },
  ];

  return (
    <div className="flex flex-col justify-between h-full bg-white text-gray-800">
      <div className="pt-6 px-4">
        <h1 className="text-lg font-semibold mb-6">ConsentVault</h1>
        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                pathname === href
                  ? "bg-gray-100 text-black font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="text-xs text-gray-400 px-4 pb-4">
        {user ? (
          <>
            Logged in as:{" "}
            <span className="text-gray-600">{user.email}</span> <br />
            Role: <span className="text-gray-600">{user.role}</span>
          </>
        ) : (
          "Loading user..."
        )}
      </div>
    </div>
  );
}
