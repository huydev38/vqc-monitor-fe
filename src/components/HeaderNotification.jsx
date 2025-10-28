"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAlerts } from "../hooks/useAlerts"

export default function HeaderNotification() {
  const [showDropdown, setShowDropdown] = useState(false)
  const [recentAlerts, setRecentAlerts] = useState([])
  const navigate = useNavigate()
  const { alerts } = useAlerts(null, 10, true)

  useEffect(() => {
    setRecentAlerts(alerts.slice(0, 5))
  }, [alerts])

  const formatTime = (tsMs) => {
    const now = Date.now()
    const diff = now - tsMs
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(tsMs).toLocaleString()
  }

  const handleAlertClick = (alert) => {
    setShowDropdown(false)
    if (alert.app_id === "__system__") {
      navigate("/service/system")
    } else {
      navigate(`/service/${alert.app_id}`)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {recentAlerts.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse" />
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold">Recent Alerts</h3>
            <button
              onClick={() => setShowDropdown(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No recent alerts</div>
            ) : (
              recentAlerts.map((alert, idx) => (
                <button
                  key={`${alert.app_id}-${alert.ts_ms}-${idx}`}
                  onClick={() => handleAlertClick(alert)}
                  className="w-full p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        alert.alert_type === "cpu" ? "bg-danger" : "bg-warning"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {alert.app_id === "__system__" ? "System" : alert.app_id}{" "}
                        <span className="text-xs font-normal text-gray-500">{alert.alert_type.toUpperCase()}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{formatTime(alert.ts_ms)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
