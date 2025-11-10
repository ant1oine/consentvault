"use client";

import OrgSwitcher from "./OrgSwitcher";
import { useAuth } from "@/components/providers/AuthProvider";

export default function TopNav() {
  const { logout } = useAuth();

  return (
    <header className="flex justify-between items-center h-14 px-4 md:px-6 bg-white border-b border-gray-200 shadow-sm">
      <h1 className="font-semibold text-lg text-gray-800">ConsentVault</h1>
      <div className="flex items-center gap-2 md:gap-4">
        <OrgSwitcher />
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white px-3 md:px-4 py-1.5 rounded-md text-sm transition-colors"
        >
          Log Out
        </button>
      </div>
    </header>
  );
}

