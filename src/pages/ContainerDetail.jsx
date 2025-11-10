"use client"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Cpu, HardDrive, MemoryStick, Activity, AlertCircle, Calendar, Play, Square, RotateCw } from "lucide-react"
import RealtimeChart from "../components/RealtimeChart"
import StatCard from "../components/StatCard"
import { useWebSocket } from "../hooks/useWebSocket"
import { fetchServiceStats, controlService, fetchContainers, fetchContainerStats } from "../utils/api"
import AlertsTable from "../components/AlertsTable"
import StateTimeline from "../components/StateTimeline"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { useContainerAlerts } from "../hooks/useContainerAlerts"

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL

export default function ServiceDetail() {
  const { container_name } = useParams()
  const [mode, setMode] = useState("live") // live | history
  const [cpuData, setCpuData] = useState([])
  const [memData, setMemData] = useState([])
  const [currentStats, setCurrentStats] = useState(null)
  const [timeRange, setTimeRange] = useState("1h")
  const [loading, setLoading] = useState(false)
  const [containerInfo, setContainerInfo] = useState(null)

  // Dùng Date | null cho react-datepicker
  const [customDateRange, setCustomDateRange] = useState(false)
  const [startDate, setStartDate] = useState(null) // Date | null
  const [endDate, setEndDate] = useState(null)     // Date | null

  const [hasData, setHasData] = useState(true)
  const [limitAlerts, setLimitAlerts] = useState(10)

  const [controlLoading, setControlLoading] = useState(false)
  const {
    alerts: containersAlerts,
    isAlertsWsConnected,
    alertsWsError,
  } = useContainerAlerts()
  const [hasActiveAlert, setHasActiveAlert] = useState({})

  useEffect(() => {
    const alertMap = {}
    containersAlerts.forEach((alert) => {
      if (Date.now() - alert.ts_ms > 900000) return
      const key = alert.alert_type
      alertMap[key] = true
    })
    setHasActiveAlert(alertMap)
  }, [containersAlerts])

  useEffect(() => {
    const loadContainerInfo = async () => {
      try {
        const containers = await fetchContainers()
        const container = containers.find((c) => c.container_name === container_name)
        if (container) {
          setContainerInfo(container)
        }
      } catch (error) {
        console.error("Failed to load container info:", error)
      }
    }
    loadContainerInfo()
  }, [container_name])

  const wsUrl = `${WS_BASE_URL}/ws/containers?&container=${container_name}&interval_ms=1000`
  const { data, error, isConnected } = useWebSocket(wsUrl, mode === "live")

  // Handle live data
  useEffect(() => {
    if (data && mode === "live") {
      const timestamp = new Date(data.ts_ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      setCurrentStats(data)

      setCpuData((prev) => {
        const newData = [...prev, { time: timestamp, value: data.cpu_percent }]
        return newData.slice(-60)
      })

      setMemData((prev) => {
        const newData = [...prev, { time: timestamp, value: data.mem_bytes / (1024 * 1024) }]
        return newData.slice(-60)
      })
    }
  }, [data, mode])

  // Load historical data
  useEffect(() => {
    if (mode === "history") {
      loadHistoricalData()
    }
  }, [mode, timeRange, container_name, customDateRange, startDate, endDate])

  useEffect(() => {
    if (mode === "history") {
      // Clear live data when switching to history
      setCpuData([])
      setMemData([])
      setCurrentStats(null)
      setHasData(true)
    } else if (mode === "live") {
      // Clear history data when switching to live
      setCpuData([])
      setMemData([])
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
        // startDate / endDate là Date objects
        start = startDate.getTime()
        end = endDate.getTime()
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

      const screenWidth = window.innerWidth
      const maxPoints = screenWidth < 640 ? 30 : screenWidth < 1024 ? 50 : 100

      const response = await fetchContainerStats(container_name, start, end, maxPoints)

      if (!response || !response.points || response.points.length === 0) {
        setHasData(false)
        setCpuData([])
        setMemData([])
        setCurrentStats(null)
      } else {
        setHasData(true)

        const totalDuration = end - start

        const formatTime = (timestamp) => {
          const date = new Date(timestamp)
          if (Number.isNaN(date.getTime())) return ""
          if (totalDuration > 24 * 60 * 60 * 1000) {
            return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
          } else if (totalDuration > 60 * 60 * 1000) {
            return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })
          } else {
            return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
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

        setCpuData(cpuHistory)
        setMemData(memHistory)

        // Set current stats to last point
        const lastPoint = response.points[response.points.length - 1]
        setCurrentStats({
          cpu_percent: lastPoint.cpu_avg,
          mem_bytes: lastPoint.mem_avg,
        })
      }
    } catch (error) {
      console.error("Failed to load historical data:", error)
      if (error?.message?.includes("24 hours")) {
        alert(error.message)
      }
      setHasData(false)
      setCpuData([])
      setMemData([])
    } finally {
      setLoading(false)
    }
  }

  const handleCustomDateToggle = () => {
    setCustomDateRange((prev) => {
      const next = !prev
      if (next) {
        // Set mặc định 1 giờ gần đây bằng Date objects
        const now = new Date()
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        setStartDate(oneHourAgo)
        setEndDate(now)
      } else {
        setStartDate(null)
        setEndDate(null)
      }
      return next
    })
  }

  const handleContainerControl = async (action) => {
    if (!confirm(`Are you sure you want to ${action} this container?`)) {
      return
    }

    setControlLoading(true)
    try {
      await controlService(container_name, action)
      // Reload container info after control action
      const containers = await fetchContainers()
      const container = containers.find((s) => s.container_name === container_name)
      if (container) {
        setContainerInfo(container)
      }
    } catch (error) {
      console.error(`Failed to ${action} container:`, error)
      alert(`Failed to ${action} container. Please try again.`)
    } finally {
      setControlLoading(false)
    }
  }

  const handle_load_more_alerts = () => {
    setLimitAlerts((prev) => prev + 10)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            {container_name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {containerInfo ? (
              <span>
                {containerInfo.version && `v${containerInfo.version} • `}
                <span className={containerInfo.running ? "text-success" : "text-danger"}>
                  {containerInfo.running ? "Running" : "Stopped"}
                </span>
              </span>
            ) : (
              "Container Monitoring"
            )}
          </p>
        </div>
        <div className="flex gap-2">

 
            <button onClick={() => setMode("live")} className={mode === "live" ? "btn-primary" : "btn-secondary"}>
              Live
            </button>

            <button onClick={() => setMode("history")} className={mode === "history" ? "btn-primary" : "btn-secondary"}>
              History
            </button>
        </div>
      </div>


        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleContainerControl("start")}
            disabled={controlLoading || containerInfo?.running}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
          <button
            onClick={() => handleContainerControl("stop")}
            disabled={controlLoading || !containerInfo?.running}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
          <button
            onClick={() => handleContainerControl("restart")}
            disabled={controlLoading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw className="w-4 h-4" />
            Restart
          </button>
        </div>

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
                    <DatePicker
                      selected={startDate}
                      onChange={(date) => setStartDate(date)}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="dd/MM/yyyy HH:mm"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholderText="Chọn ngày và giờ bắt đầu"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">End Date & Time</label>
                    <DatePicker
                      selected={endDate}
                      onChange={(date) => setEndDate(date)}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="dd/MM/yyyy HH:mm"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholderText="Chọn ngày và giờ kết thúc"
                      minDate={startDate || undefined}
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
            </div>
          )}

          {/* Charts */}
          {hasData && (cpuData.length > 0 || mode === "live") && (
            <div className="space-y-6">
              {mode === "history" && (
                <StateTimeline
                  appId={container_name}
                  startTime={
                    customDateRange && startDate
                      ? startDate.getTime()
                      : Date.now() - (timeRange === "1h" ? 3600000 : timeRange === "6h" ? 21600000 : 86400000)
                  }
                  endTime={customDateRange && endDate ? endDate.getTime() : Date.now()}
                  isContainer={true}
                />
              )}

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
            </div>
          )}

          {!loading && !hasData && mode === "history" && (
            <div className="bg-warning/10 border border-warning text-warning px-4 py-3 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span>No data available for the selected time range. Try a different time period.</span>
            </div>
          )}
        </>

      <AlertsTable
        appId={container_name}
        title="Container Alerts"
        alerts={containersAlerts}
        isConnected={isAlertsWsConnected}
        isContainer={true}
        setLimitAlerts={handle_load_more_alerts}
        limitAlerts={limitAlerts}
      />
    </div>
  )
}
