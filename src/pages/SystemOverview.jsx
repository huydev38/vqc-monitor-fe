"use client"

import { useState, useEffect } from "react"
import { Cpu, HardDrive, Network, MemoryStick, Pause, Play } from "lucide-react"
import RealtimeChart from "../components/RealtimeChart"
import StatCard from "../components/StatCard"
import { useWebSocket } from "../hooks/useWebSocket.jsx"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL

export default function SystemOverview() {
  const [paused, setPaused] = useState(false)
  const [cpuData, setCpuData] = useState([])
  const [memData, setMemData] = useState([])
  const [diskData, setDiskData] = useState([])
  const [netData, setNetData] = useState([])
  const [currentStats, setCurrentStats] = useState(null)

  const wsUrl = `${WS_BASE_URL}/ws/live?mode=system&interval_ms=1000`
  const { data, error, isConnected } = useWebSocket(wsUrl, !paused)

  useEffect(() => {
    if (data && !paused) {
      const timestamp = new Date(data.ts_ms).toLocaleTimeString();
      setCurrentStats(data);

      setCpuData((prev) => {
        const newData = [...prev, { time: timestamp, value: data.cpu_percent }];
        return newData.slice(-60); // Keep last 60 points
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

      setNetData((prev) => {
        const newData = [
          ...prev,
          {
            time: timestamp,
            rx: (data.net_rx_Bps || 0) / 1024,
            tx: (data.net_tx_Bps || 0) / 1024,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Cpu className="w-6 h-6 text-primary" />}
            label="CPU Usage"
            value={`${currentStats.cpu_percent.toFixed(1)}%`}
            color="primary"
          />
          <StatCard
            icon={<MemoryStick className="w-6 h-6 text-error" />}
            label="Memory"
            value={`${(currentStats.mem_bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`}
            color="error"
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealtimeChart title="CPU Usage (%)" data={cpuData} dataKey="value" color="#3b82f6" unit="%" />
        <RealtimeChart title="Memory Usage (MB)" data={memData} dataKey="value" color="#8b5cf6" unit="MB" />
        <RealtimeChart
          title="Disk I/O (KB/s)"
          data={diskData}
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
    </div>
  )
}
