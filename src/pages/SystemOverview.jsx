"use client"

import { useState, useEffect, useRef } from "react"
import { Cpu, HardDrive, Network, MemoryStick, Pause, Play, Database } from "lucide-react"
import RealtimeChart from "../components/RealtimeChart"
import StatCard from "../components/StatCard"
import ServicesTable from "../components/ServicesTable"
import AlertNotification from "../components/AlertNotification"
import { useWebSocket } from "../hooks/useWebSocket"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL
const ALERT_DURATION_MS = 10000 // 10 seconds

export default function SystemOverview() {
  const [paused, setPaused] = useState(false)
  const [cpuData, setCpuData] = useState([])
  const [memData, setMemData] = useState([])
  const [diskIOData, setDiskIOData] = useState([])
  const [diskUsageData, setDiskUsageData] = useState([])
  const [netData, setNetData] = useState([])
  const [currentStats, setCurrentStats] = useState(null)
  const [services, setServices] = useState([])
  const [alerts, setAlerts] = useState([])
  const thresholdExceededRef = useRef({})

  const wsUrl = `${WS_BASE_URL}/ws/live?mode=combined&interval_ms=1000`
  const { data, error, isConnected } = useWebSocket(wsUrl, !paused)

  const addAlert = (key, title, message) => {
    const alertId = `${key}-${Date.now()}`
    setAlerts((prev) => [...prev, { id: alertId, title, message }])
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
    }, 5000)
  }

  const dismissAlert = (alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId))
  }

  const checkThreshold = (key, value, label, threshold, isPercentage = true) => {
    const thresholdValue = isPercentage ? threshold * 100 : threshold
    if (value >= thresholdValue) {
      if (!thresholdExceededRef.current[key]) {
        thresholdExceededRef.current[key] = Date.now()
      } else if (Date.now() - thresholdExceededRef.current[key] >= ALERT_DURATION_MS) {
        addAlert(key, `${label} Alert`, `${label} has exceeded ${thresholdValue.toFixed(0)}% for more than 10 seconds`)
        thresholdExceededRef.current[key] = Date.now()
      }
    } else {
      thresholdExceededRef.current[key] = null
    }
  }

  useEffect(() => {
    if (data && !paused) {
      const timestamp = new Date(data.ts_ms).toLocaleTimeString()

      setCurrentStats(data.system)
      if (data.services) {
        setServices(data.services)
      }

      checkThreshold("system-cpu", data.system.cpu_percent, "System CPU", data.system.cpu_threshold)
      const memPercent = (data.system.mem_bytes / data.system.total_ram) * 100
      checkThreshold("system-mem", memPercent, "System Memory", data.system.memory_threshold)

      if (data.services) {
        data.services.forEach((service) => {
          const serviceCpuKey = `service-cpu-${service.app_id}`
          const serviceMemKey = `service-mem-${service.app_id}`
          const serviceMemMB = service.mem_bytes / (1024 * 1024)

          checkThreshold(serviceCpuKey, service.cpu_percent, `${service.app_id} CPU`, service.cpu_threshold / 100)
          checkThreshold(serviceMemKey, serviceMemMB, `${service.app_id} Memory`, service.memory_threshold_mb, false)
        })
      }

      setCpuData((prev) => {
        const newData = [...prev, { time: timestamp, value: data.system.cpu_percent }]
        return newData.slice(-60)
      })

      setMemData((prev) => {
        const newData = [...prev, { time: timestamp, value: data.system.mem_bytes / (1024 * 1024) }]
        return newData.slice(-60)
      })

      setDiskIOData((prev) => {
        const newData = [
          ...prev,
          {
            time: timestamp,
            read: data.system.read_Bps / 1024,
            write: data.system.write_Bps / 1024,
          },
        ]
        return newData.slice(-60)
      })

      setDiskUsageData((prev) => {
        const newData = [
          ...prev,
          {
            time: timestamp,
            value: data.system.disk_used_percent || 0,
          },
        ]
        return newData.slice(-60)
      })

      setNetData((prev) => {
        const newData = [
          ...prev,
          {
            time: timestamp,
            rx: (data.system.net_rx_Bps || 0) / 1024,
            tx: (data.system.net_tx_Bps || 0) / 1024,
          },
        ]
        return newData.slice(-60)
      })
    }
  }, [data, paused])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Overview</h1>
        <button
          onClick={() => setPaused(!paused)}
          className={`flex items-center gap-2 ${paused ? "btn-primary" : "btn-secondary"}`}
        >
          {paused ? (
            <>
              <Play className="w-4 h-4" /> Resume
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" /> Pause
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg">
          Connection error: {error}
        </div>
      )}

      {!isConnected && !error && (
        <div className="bg-warning/10 border border-warning text-warning px-4 py-3 rounded-lg">
          Connecting to WebSocket...
        </div>
      )}

      {/* Current Stats */}
      {currentStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={<Cpu className="w-6 h-6 text-primary" />}
            label="CPU Usage"
            value={`${currentStats.cpu_percent?.toFixed(1)}%`}
            color="primary"
          />
          <StatCard
            icon={<MemoryStick className="w-6 h-6 text-error" />}
            label="Memory"
            value={`${(currentStats.mem_bytes / (1024 * 1024 * 1024)).toFixed(1)} / ${(currentStats.total_ram / (1024 * 1024 * 1024)).toFixed(1)} GB`}
            color="error"
          />
          <StatCard
            icon={<Database className="w-6 h-6 text-info" />}
            label="Disk Usage"
            value={`${currentStats.disk_used_percent?.toFixed(1) || 0}%`}
            color="info"
          />
          <StatCard
            icon={<HardDrive className="w-6 h-6 text-success" />}
            label="Disk I/O"
            value={`${((currentStats.read_Bps + currentStats.write_Bps) / 1024).toFixed(1)} KB/s`}
            color="success"
          />
          <StatCard
            icon={<Network className="w-6 h-6 text-warning" />}
            label="Network"
            value={`${(((currentStats.net_rx_Bps || 0) + (currentStats.net_tx_Bps || 0)) / 1024).toFixed(1)} KB/s`}
            color="warning"
          />
        </div>
      )}

      <ServicesTable services={services} systemStats={currentStats} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealtimeChart title="CPU Usage (%)" data={cpuData} dataKey="value" color="#3b82f6" unit="%" />
        <RealtimeChart title="Memory Usage (MB)" data={memData} dataKey="value" color="#8b5cf6" unit="MB" />
        <RealtimeChart title="Disk Usage (%)" data={diskUsageData} dataKey="value" color="#06b6d4" unit="%" />
        <RealtimeChart
          title="Disk I/O (KB/s)"
          data={diskIOData}
          dataKeys={["read", "write"]}
          colors={["#10b981", "#ef4444"]}
          unit="KB/s"
          legend={["Read", "Write"]}
        />
        <RealtimeChart
          title="Network (KB/s)"
          data={netData}
          dataKeys={["rx", "tx"]}
          colors={["#f59e0b", "#06b6d4"]}
          unit="KB/s"
          legend={["Receive", "Transmit"]}
        />
      </div>

      <AlertNotification alerts={alerts} onDismiss={dismissAlert} />
    </div>
  )
}
