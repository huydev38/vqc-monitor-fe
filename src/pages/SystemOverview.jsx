"use client"

import { useState, useEffect } from "react"
import { Cpu, HardDrive, Network, MemoryStick, Pause, Play, Database } from "lucide-react"
import RealtimeChart from "../components/RealtimeChart"
import StatCard from "../components/StatCard"
import ServicesTable from "../components/ServicesTable"
import AlertsTable from "../components/AlertsTable"
import { useWebSocket } from "../hooks/useWebSocket"
import { useAlerts } from "../hooks/useAlerts" // Import the useAlerts hook
import { fetchApps } from "../utils/api"

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
  const [appsInfo, setAppsInfo] = useState({})
  const [hasActiveAlert, setHasActiveAlert] = useState({})

  const wsUrl = `${WS_BASE_URL}/ws/live?mode=combined&interval_ms=1000`
  const { data, error, isConnected } = useWebSocket(wsUrl, !paused)
  const { alerts: systemAlerts } = useAlerts("__system__", 50, true)

  useEffect(() => {
    const loadAppsInfo = async () => {
      try {
        const apps = await fetchApps()
        const appsMap = {}
        apps.forEach((app) => {
          appsMap[app.app_id] = app
        })
        setAppsInfo(appsMap)
      } catch (error) {
        console.error("Failed to load apps info:", error)
      }
    }
    loadAppsInfo()
  }, [])

  useEffect(() => {
    const alertMap = {}
    systemAlerts.forEach((alert) => {
      const key = alert.alert_type
      alertMap[key] = true
    })
    setHasActiveAlert(alertMap)
  }, [systemAlerts])

  useEffect(() => {
    if (data && !paused) {
      const timestamp = new Date(data.ts_ms).toLocaleTimeString()

      setCurrentStats(data.system)
      if (data.services) {
        const servicesWithVersion = data.services.map((service) => ({
          ...service,
          version: appsInfo[service.app_id]?.version,
          actual_version: appsInfo[service.app_id]?.actual_version,
        }))
        setServices(servicesWithVersion)
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
  }, [data, paused, appsInfo])

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
            isAlert={hasActiveAlert.cpu}
          />
          <StatCard
            icon={<MemoryStick className="w-6 h-6 text-primary" />}
            label="Memory"
            value={`${(currentStats.mem_bytes / (1024 * 1024 * 1024)).toFixed(1)} / ${(currentStats.total_ram / (1024 * 1024 * 1024)).toFixed(1)} GB`}
            isAlert={hasActiveAlert.memory}
          />
          <StatCard
            icon={<Database className="w-6 h-6 text-primary" />}
            label="Disk Usage"
            value={`${currentStats.disk_used_percent?.toFixed(1) || 0}%`}
          />
          <StatCard
            icon={<HardDrive className="w-6 h-6 text-primary" />}
            label="Disk I/O"
            value={`${((currentStats.read_Bps + currentStats.write_Bps) / 1024).toFixed(1)} KB/s`}
          />
          <StatCard
            icon={<Network className="w-6 h-6 text-primary" />}
            label="Network"
            value={`${(((currentStats.net_rx_Bps || 0) + (currentStats.net_tx_Bps || 0)) / 1024).toFixed(1)} KB/s`}
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

      <AlertsTable appId="__system__" title="System Alerts" />
    </div>
  )
}
