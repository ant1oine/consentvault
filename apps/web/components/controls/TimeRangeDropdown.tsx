"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const OPTIONS = ["Today", "Last 7 Days", "Last 30 Days"] as const;

export function TimeRangeDropdown() {
  const [value, setValue] = useState<(typeof OPTIONS)[number]>("Last 7 Days");

  return (
    <div className="relative w-[130px]">
      <DropdownMenu>
        <DropdownMenuTrigger
          showChevron={false}
          className="w-full flex items-center justify-between border border-slate-200 rounded-md h-9 px-3 text-sm text-slate-700 hover:bg-slate-50"
        >
          {value} ▾
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {OPTIONS.map((option) => (
            <DropdownMenuItem key={option} onClick={() => setValue(option)}>
              {option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

