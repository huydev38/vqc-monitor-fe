"use client"

import { useState, useEffect } from "react"
import { AlertCircle, ChevronDown } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function AlertsTable({
  appId = null,
  title = "Alerts",
  alerts,
  isConnected,
  error,
  limitAlerts,
  setLimitAlerts,
  isContainer = false,
}) {
  const [displayedAlerts, setDisplayedAlerts] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    setDisplayedAlerts(alerts)
  }, [alerts])

  const handleLoadMore = () => {
    setLimitAlerts()
  }

  const formatTime = (tsMs) => {
    return new Date(tsMs).toLocaleString()
  }

  const formatValue = (value, alertType) => {
    if (alertType === "memory") {
      return `${value.toFixed(2)} MB`
    } else if (alertType === "cpu") {
      return `${value.toFixed(1)}%`
    }
    return value.toFixed(2)
  }

  const handleSourceClick = (alert) => {
    if (isContainer) {
      navigate(`/container/${alert.container_name}`)
    } else if (alert.app_id === "__system__") {
      navigate("/service/system")
    } else {
      navigate(`/service/${alert.app_id}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-danger" />
          {title}
        </h2>
      </div>

      {displayedAlerts.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500">No alerts</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-semibold">Time</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Value</th>
                {!appId && (
                  <th className="text-left px-4 py-3 font-semibold">{isContainer ? "Container" : "Service"}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayedAlerts.map((alert, idx) => {
                const sourceId = isContainer ? alert.container_name : alert.app_id
                return (
                  <tr
                    key={`${sourceId}-${alert.ts_ms}-${idx}`}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3">{formatTime(alert.ts_ms)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          alert.alert_type === "cpu" ? "bg-danger/20 text-danger" : "bg-warning/20 text-warning"
                        }`}
                      >
                        {alert.alert_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{formatValue(alert.value, alert.alert_type)}</td>
                    {!appId && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSourceClick(alert)}
                          className="text-primary hover:underline font-medium"
                        >
                          {isContainer ? alert.container_name : alert.app_id === "__system__" ? "System" : alert.app_id}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {displayedAlerts.length > 0 && displayedAlerts.length >= limitAlerts - 10 && (
        <button
          onClick={handleLoadMore}
          className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2 text-sm font-medium"
        >
          <ChevronDown className="w-4 h-4" />
          Load More
        </button>
      )}
    </div>
  )
}
