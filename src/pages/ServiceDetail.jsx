"use client"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Cpu, HardDrive, MemoryStick, Activity, AlertCircle, Calendar, Play, Square, RotateCw } from "lucide-react"
import RealtimeChart from "../components/RealtimeChart"
import StatCard from "../components/StatCard"
import LogViewer from "../components/LogViewer"
import { useWebSocket } from "../hooks/useWebSocket"
import { fetchServiceStats, fetchApps, controlService } from "../utils/api"
import AlertsTable from "../components/AlertsTable"
import { useAlerts } from "../hooks/useAlerts"

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL

export default function ServiceDetail() {
  const { appId } = useParams()
  const [mode, setMode] = useState("history")
  const [cpuData, setCpuData] = useState([])
  const [memData, setMemData] = useState([])
  const [diskData, setDiskData] = useState([])
  const [currentStats, setCurrentStats] = useState(null)
  const [timeRange, setTimeRange] = useState("1h")
  const [loading, setLoading] = useState(false)
  const [trackable, setTrackable] = useState(true)
  const [serviceInfo, setServiceInfo] = useState(null)

  const [customDateRange, setCustomDateRange] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [hasData, setHasData] = useState(true)

  const [logs, setLogs] = useState([])
  const logsWsUrl = `${WS_BASE_URL}/ws/logs?service=${appId}`
  const { data: logData } = useWebSocket(logsWsUrl, mode === "live" && appId !== "system")

  const [controlLoading, setControlLoading] = useState(false)
  const { alerts: serviceAlerts } = useAlerts(appId, 50, appId !== "system")
  const [hasActiveAlert, setHasActiveAlert] = useState({})

  useEffect(() => {
    const alertMap = {}
    serviceAlerts.forEach((alert) => {
      const key = alert.alert_type
      alertMap[key] = true
    })
    setHasActiveAlert(alertMap)
  }, [serviceAlerts])

  useEffect(() => {
    const loadServiceInfo = async () => {
      try {
        const services = await fetchApps()
        const service = services.find((s) => s.app_id === appId)
        if (service) {
          setServiceInfo(service)
          setTrackable(service.trackable)
        }
      } catch (error) {
        console.error("Failed to load service info:", error)
      }
    }
    loadServiceInfo()
  }, [appId])

  const wsUrl = `${WS_BASE_URL}/ws/live?mode=service&app_id=${appId}&interval_ms=1000`
  const { data, error, isConnected } = useWebSocket(wsUrl, mode === "live" && trackable)

  // Handle live data
  useEffect(() => {
    if (data && mode === "live") {
      const timestamp = new Date(data.ts_ms).toLocaleTimeString()

      setCurrentStats(data)

      setCpuData((prev) => {
        const newData = [...prev, { time: timestamp, value: data.cpu_percent }]
        return newData.slice(-60)
      })

      setMemData((prev) => {
        const newData = [...prev, { time: timestamp, value: data.mem_bytes / (1024 * 1024) }]
        return newData.slice(-60)
      })

      setDiskData((prev) => {
        const newData = [
          ...prev,
          {
            time: timestamp,
            read: data.read_Bps / 1024,
            write: data.write_Bps / 1024,
          },
        ]
        return newData.slice(-60)
      })
    }
  }, [data, mode])

  // Load historical data
  useEffect(() => {
    if (mode === "history" && trackable) {
      loadHistoricalData()
    }
  }, [mode, timeRange, appId, trackable, customDateRange, startDate, endDate])

  useEffect(() => {
    if (mode === "history") {
      // Clear live data when switching to history
      setCpuData([])
      setMemData([])
      setDiskData([])
      setCurrentStats(null)
      setHasData(true)
    } else if (mode === "live") {
      // Clear history data when switching to live
      setCpuData([])
      setMemData([])
      setDiskData([])
      setCurrentStats(null)
      setHasData(true)
    }
  }, [mode])

  const loadHistoricalData = async () => {
    setLoading(true)
    setHasData(true)
    try {
      let start, end

      if (customDateRange && startDate && endDate) {
        start = new Date(startDate).getTime()
        end = new Date(endDate).getTime()
      } else {
        const now = Date.now()
        const ranges = {
          "1h": 60 * 60 * 1000,
          "6h": 6 * 60 * 60 * 1000,
          "24h": 24 * 60 * 60 * 1000,
        }
        start = now - ranges[timeRange]
        end = now
      }

      const duration = end - start
      const maxDuration = 24 * 60 * 60 * 1000

      if (duration > maxDuration) {
        alert("Time range cannot exceed 24 hours. Please select a shorter period.")
        setLoading(false)
        return
      }

      const screenWidth = window.innerWidth
      const maxPoints = screenWidth < 640 ? 30 : screenWidth < 1024 ? 50 : 100

      const response = await fetchServiceStats(appId, start, end, maxPoints)

      if (!response || !response.points || response.points.length === 0) {
        setHasData(false)
        setCpuData([])
        setMemData([])
        setDiskData([])
        setCurrentStats(null)
      } else {
        setHasData(true)

        const totalDuration = end - start

        const formatTime = (timestamp) => {
          const date = new Date(timestamp)
          if (totalDuration > 24 * 60 * 60 * 1000) {
            return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
          } else if (totalDuration > 60 * 60 * 1000) {
            return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          } else {
            return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          }
        }

        const cpuHistory = response.points.map((point) => ({
          time: formatTime(point.t),
          value: point.cpu_avg,
          min: point.cpu_min,
          max: point.cpu_max,
          timestamp: point.t,
        }))

        const memHistory = response.points.map((point) => ({
          time: formatTime(point.t),
          value: point.mem_avg / (1024 * 1024),
          min: point.mem_min / (1024 * 1024),
          max: point.mem_max / (1024 * 1024),
          timestamp: point.t,
        }))

        const diskHistory = response.points.map((point) => ({
          time: formatTime(point.t),
          read: point.io_r_avg / 1024,
          write: point.io_w_avg / 1024,
          timestamp: point.t,
        }))

        setCpuData(cpuHistory)
        setMemData(memHistory)
        setDiskData(diskHistory)

        // Set current stats to last point
        const lastPoint = response.points[response.points.length - 1]
        setCurrentStats({
          cpu_percent: lastPoint.cpu_avg,
          mem_bytes: lastPoint.mem_avg,
          read_Bps: lastPoint.io_r_avg,
          write_Bps: lastPoint.io_w_avg,
        })
      }
    } catch (error) {
      console.error("Failed to load historical data:", error)
      if (error.message.includes("24 hours")) {
        alert(error.message)
      }
      setHasData(false)
      setCpuData([])
      setMemData([])
      setDiskData([])
    } finally {
      setLoading(false)
    }
  }

  const handleCustomDateToggle = () => {
    setCustomDateRange(!customDateRange)
    if (!customDateRange) {
      // Set default values when enabling custom date range
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      setStartDate(oneHourAgo.toISOString().slice(0, 16))
      setEndDate(now.toISOString().slice(0, 16))
    }
  }

  const handleServiceControl = async (action) => {
    if (!confirm(`Are you sure you want to ${action} this service?`)) {
      return
    }

    setControlLoading(true)
    try {
      await controlService(appId, action)
      // Reload service info after control action
      const services = await fetchApps()
      const service = services.find((s) => s.app_id === appId)
      if (service) {
        setServiceInfo(service)
      }
    } catch (error) {
      console.error(`Failed to ${action} service:`, error)
      alert(`Failed to ${action} service. Please try again.`)
    } finally {
      setControlLoading(false)
    }
  }

  useEffect(() => {
    if (logData) {
      setLogs((prev) => {
        const newLogs = [...prev, logData.message || JSON.stringify(logData)]
        return newLogs.slice(-100) // Keep last 100 logs
      })
    }
  }, [logData])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            {appId}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {serviceInfo ? (
              <span>
                {serviceInfo.version && `v${serviceInfo.version} • `}
                <span className={serviceInfo.running ? "text-success" : "text-danger"}>
                  {serviceInfo.running ? "Running" : "Stopped"}
                </span>
              </span>
            ) : (
              "Service Monitoring"
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {appId == "system"
            ? null
            : trackable && (
                <button onClick={() => setMode("live")} className={mode === "live" ? "btn-primary" : "btn-secondary"}>
                  Live
                </button>
              )}
          {trackable && (
            <button onClick={() => setMode("history")} className={mode === "history" ? "btn-primary" : "btn-secondary"}>
              History
            </button>
          )}
        </div>
      </div>

      {appId !== "system" && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleServiceControl("start")}
            disabled={controlLoading || serviceInfo?.running}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
          <button
            onClick={() => handleServiceControl("stop")}
            disabled={controlLoading || !serviceInfo?.running}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
          <button
            onClick={() => handleServiceControl("restart")}
            disabled={controlLoading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw className="w-4 h-4" />
            Restart
          </button>
        </div>
      )}

      {!trackable && (
        <div className="bg-warning/10 border border-warning text-warning px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>This service is not trackable. Monitoring data is not available.</span>
        </div>
      )}

      {appId !== "system" && mode === "live" && <LogViewer logs={logs} />}

      {trackable && (
        <>
          {mode === "history" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={handleCustomDateToggle} className={customDateRange ? "btn-primary" : "btn-secondary"}>
                  <Calendar className="w-4 h-4 mr-2 inline" />
                  Custom Range
                </button>
              </div>

              {!customDateRange ? (
                <div className="flex gap-2">
                  {["1h", "6h", "24h"].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={timeRange === range ? "btn-primary" : "btn-secondary"}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <button
                    onClick={loadHistoricalData}
                    disabled={!startDate || !endDate}
                    className="btn-primary whitespace-nowrap"
                  >
                    Load Data
                  </button>
                </div>
              )}
            </div>
          )}

          {error && mode === "live" && (
            <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg">
              Connection error: {error}
            </div>
          )}

          {!isConnected && !error && mode === "live" && (
            <div className="bg-warning/10 border border-warning text-warning px-4 py-3 rounded-lg">
              Connecting to WebSocket...
            </div>
          )}

          {loading && (
            <div className="bg-primary/10 border border-primary text-primary px-4 py-3 rounded-lg">
              Loading historical data...
            </div>
          )}

          {/* Current Stats */}
          {currentStats && mode === "live" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                icon={<Cpu className="w-6 h-6 text-primary" />}
                label="CPU Usage"
                value={`${currentStats.cpu_percent.toFixed(1)}%`}
                isAlert={hasActiveAlert.cpu}
              />
              <StatCard
                icon={<MemoryStick className="w-6 h-6 text-primary" />}
                label="Memory"
                value={`${(currentStats.mem_bytes / (1024 * 1024)).toFixed(1)} MB`}
                isAlert={hasActiveAlert.memory}
              />
              <StatCard
                icon={<HardDrive className="w-6 h-6 text-primary" />}
                label="Disk I/O"
                value={`${((currentStats.read_Bps + currentStats.write_Bps) / 1024).toFixed(1)} KB/s`}
              />
            </div>
          )}

          {/* Charts */}
          {hasData && (cpuData.length > 0 || mode === "live") && (
            <div className="space-y-6">
              <RealtimeChart
                title="CPU Usage (%)"
                data={cpuData}
                dataKey="value"
                color="#3b82f6"
                unit="%"
                showMinMax={mode === "history"}
              />
              <RealtimeChart
                title="Memory Usage (MB)"
                data={memData}
                dataKey="value"
                color="#8b5cf6"
                unit="MB"
                showMinMax={mode === "history"}
              />
              <RealtimeChart
                title="Disk I/O (KB/s)"
                data={diskData}
                dataKeys={["read", "write"]}
                colors={["#10b981", "#ef4444"]}
                unit="KB/s"
                legend={["Read", "Write"]}
              />
            </div>
          )}

          {!loading && !hasData && mode === "history" && (
            <div className="bg-warning/10 border border-warning text-warning px-4 py-3 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span>No data available for the selected time range. Try a different time period.</span>
            </div>
          )}
        </>
      )}

      {appId !== "system" && <AlertsTable appId={appId} title={`${appId} Alerts`} />}
      {appId === "system" && <AlertsTable appId="__system__" title="System Alerts" />}
    </div>
  )
}
