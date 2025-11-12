"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { logout } from "@/lib/logout";
import { getMe } from "@/lib/api";

function formatRole(role: string): string {
  // Convert "super admin" to "Super Admin", "compliance_officer" to "Compliance Officer", etc.
  return role
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="flex items-center justify-between px-4 h-full">
      <div className="text-sm text-gray-500">
        <kbd className="border rounded px-2 py-1 text-xs">⌘K</kbd> Command Palette
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 transition"
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          {user?.role && (
            <span className="hidden sm:inline text-sm font-medium text-gray-700">
              {formatRole(user.role)}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg text-sm z-50">
            {user?.role && (
              <div className="px-4 py-2 border-b text-gray-700 font-medium">
                {formatRole(user.role)}
              </div>
            )}
            <button className="block w-full text-left px-4 py-2 hover:bg-gray-50">
              Settings
            </button>
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-red-500"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
