"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"

interface AuditLog {
  timestamp: string;
  event_type: string;
  actor: string | null;
  details: Record<string, any> | null;
}

interface EventDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: AuditLog | null;
}

export function EventDetailsModal({ open, onOpenChange, event }: EventDetailsModalProps) {
  if (!event) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-lg max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-6 focus:outline-none overflow-y-auto"
        >
          {/* ✅ Add Dialog.Title for accessibility */}
          <Dialog.Title className="sr-only">Event Details</Dialog.Title>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
            <Dialog.Close asChild>
              <button 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3 text-sm">
            <p>
              <span className="font-semibold text-gray-700">Actor:</span>{" "}
              <span className="text-gray-900">{event.actor || "System"}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-700">Timestamp:</span>{" "}
              <span className="text-gray-900">{new Date(event.timestamp).toLocaleString()}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-700">Event Type:</span>{" "}
              <span className="text-gray-900">{event.event_type}</span>
            </p>
            {event.details && Object.keys(event.details).length > 0 && (
              <div className="mt-4">
                <p className="font-semibold text-gray-700 mb-2">Metadata:</p>
                <pre className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs font-mono text-gray-800 overflow-x-auto">
{JSON.stringify(event.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

