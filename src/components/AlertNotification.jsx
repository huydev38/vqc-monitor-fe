"use client"

import { AlertCircle, X } from "lucide-react"

export default function AlertNotification({ alerts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 space-y-2 z-50 max-w-md">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-danger text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{alert.title}</p>
            <p className="text-sm opacity-90">{alert.message}</p>
          </div>
          <button onClick={() => onDismiss(alert.id)} className="flex-shrink-0 hover:opacity-75 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
