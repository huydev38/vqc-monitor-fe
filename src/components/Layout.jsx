"use client"

import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { Moon, Sun, Activity, Server, Menu, X, RefreshCw, Monitor } from "lucide-react"
import HeaderNotification from "./HeaderNotification"
import { fetchApps } from "../utils/api"

export default function Layout({ children, darkMode, toggleDarkMode }) {
  const [services, setServices] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const location = useLocation()

  useEffect(() => {
    loadServices()
    const interval = setInterval(loadServices, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const loadServices = async () => {
    try {
      const data = await fetchApps()
      setServices(data)
    } catch (error) {
      console.error("Failed to load services:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadServices()
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            VQC System Monitor
          </h1>
        </div>

        <nav className="p-4 space-y-2">
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === "/" ? "bg-primary text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <Activity className="w-5 h-5" />
            System Overview
          </Link>

          <Link
            to="/service/system"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === "/service/system"
                ? "bg-primary text-white"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <Monitor className="w-5 h-5" />
            System
          </Link>

          <div className="pt-4 pb-2 px-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">SERVICES</span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="Refresh services"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
          ) : services.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No services found</div>
          ) : (
            services.map((service) => (
              <Link
                key={service.app_id}
                to={`/service/${service.app_id}`}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === `/service/${service.app_id}`
                    ? "bg-primary text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Server className="w-5 h-5" />
                <span className="flex-1 truncate">{service.app_id}</span>
                <span
                  className={`w-2 h-2 rounded-full ${service.running ? "bg-success" : "bg-danger"}`}
                  title={service.running ? "Running" : "Stopped"}
                />
              </Link>
            ))
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-4">
              <HeaderNotification />
              <button onClick={toggleDarkMode} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
