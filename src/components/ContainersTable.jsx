"use client"

import { useNavigate } from "react-router-dom"
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"
import React from "react"

export default function ContainersTable({ containers, containerStats, containerAlerts = {} }) {
  const navigate = useNavigate()

  const mergedData = React.useMemo(() => {
    const statsList = containerStats?.containers || []
    const statsMap = new Map(statsList.map((stat) => [stat.container_name, stat]))
    return containers.map((container) => {
      const stats = statsMap.get(container.container_name) || {}
      return {
        ...container,
        ...stats,
      }
    })
  }, [containers, containerStats])

  const getStatusColor = (isExceeded) => {
    if (isExceeded) return "text-danger bg-danger/10"
    return "text-success bg-success/10"
  }

  const getStatusBg = (isExceeded) => {
    if (isExceeded) return "bg-danger/20"
    return "bg-success/20"
  }

  const isVersionMismatch = (container) => {
    return container.version && container.version_real && container.image + ":" + container.version !== container.version_real
  }

  const getContainerAlert = (containerName) => {
    return containerAlerts[containerName]?.has_alert || false
  }

  const handleContainerClick = (container) => {
    navigate(`/container/${container.container_name}`)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="px-6 py-3 text-left text-sm font-semibold">Container</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">CPU</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Memory</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Image</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Version</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Alert</th>
            </tr>
          </thead>
          <tbody>
            {containers.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No containers found
                </td>
              </tr>
            ) : (
              mergedData.map((container) => {
                const cpuExceeded = container.cpu_percent > (container.cpu_threshold || 100)
                const memMB = (container.mem_bytes || 0) / (1024 * 1024)
                const memThresholdMB = (container.memory_threshold_mb || 0)
                const memExceeded = memThresholdMB > 0 && memMB >= memThresholdMB
                const versionMismatch = isVersionMismatch(container)
                const hasAlert = getContainerAlert(container.container_name)
                const memLimit = container.mem_limit || 0


                return (
                  <tr
                    key={container.container_name}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => handleContainerClick(container)}
                  >
                    <td className="px-6 py-4 font-medium">{container.container_name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-medium ${container.running ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {container.running ? "Running" : "Stopped"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${container.running ? getStatusBg(cpuExceeded) : ""}`}
                      >
                        {container.running ? (
                        <span className={getStatusColor(cpuExceeded)}>{(container.cpu_percent || 0).toFixed(2)}%</span>
                        ) : (<span className="text-gray-500">-</span>)}
                        {cpuExceeded && <AlertCircle className="w-3 h-3 text-danger" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${container.running ? getStatusBg(memExceeded) : ""}`}
                      >
                        {container.running ? (
                        <span className={getStatusColor(memExceeded)}>
                          {memMB.toFixed(1)} / {memThresholdMB.toFixed(1)} MB / {(memLimit / (1024 * 1024 * 1024)).toFixed(1)} GB
                        </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                        
                        {memExceeded && <AlertCircle className="w-3 h-3 text-danger" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {container.image || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {container.version || "-"}
                        {versionMismatch && (
                          <AlertTriangle className="w-4 h-4 text-warning" title="Version mismatch detected" />
                        )}
                      </div>
                    </td>
                      
                    <td className="px-6 py-4">
                      {cpuExceeded || memExceeded || hasAlert ? (
                        <div className="inline-flex items-center gap-2 text-danger">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Threshold Exceeded</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 text-success">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Normal</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
