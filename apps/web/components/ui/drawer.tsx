"use client"

import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export const Drawer = Dialog.Root
export const DrawerTrigger = Dialog.Trigger
export const DrawerClose = Dialog.Close

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content> & { title?: string }
>(({ className, children, title = "Details", ...props }, ref) => (
  <Dialog.Portal>
    <Dialog.Overlay
      className={cn(
        "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity",
        "data-[state=open]:animate-in data-[state=closed]:animate-out"
      )}
    />
    <Dialog.Content
      ref={ref}
      className={cn(
        "fixed right-0 top-0 z-50 h-full w-96 bg-white border-l border-gray-200 shadow-2xl outline-none",
        "data-[state=open]:animate-slide-in data-[state=closed]:animate-slide-out",
        className
      )}
      {...props}
    >
      <Dialog.Title className="sr-only">{title}</Dialog.Title>
      {children}
    </Dialog.Content>
  </Dialog.Portal>
))
DrawerContent.displayName = "DrawerContent"

export const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between border-b px-4 py-3", className)} {...props} />
)
DrawerHeader.displayName = "DrawerHeader"

export const DrawerTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold text-gray-900", className)} {...props} />
)
DrawerTitle.displayName = "DrawerTitle"

