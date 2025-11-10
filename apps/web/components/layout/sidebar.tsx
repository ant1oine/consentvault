"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "API Dashboard", href: "/dashboard/api" },
    { name: "Consents", href: "/dashboard/consents" },
    { name: "Data Rights", href: "/dashboard/data-rights" },
  ];

  return (
    <aside className="hidden md:block w-64 bg-white border-r border-gray-200 p-4 space-y-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "block px-3 py-2 rounded-md transition-colors",
            pathname === item.href
              ? "bg-blue-100 text-blue-700 font-medium"
              : "text-gray-700 hover:bg-gray-100"
          )}
        >
          {item.name}
        </Link>
      ))}
    </aside>
  );
}
