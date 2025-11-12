"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { logout } from "@/lib/logout";

export default function TopNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 h-full">
      <div className="text-sm text-gray-500">
        <kbd className="border rounded px-2 py-1 text-xs">⌘K</kbd> Command Palette
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
        >
          <User className="w-4 h-4 text-gray-600" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg text-sm z-50">
            <div className="px-4 py-2 border-b">Admin</div>
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
