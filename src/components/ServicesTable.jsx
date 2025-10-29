import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function ServicesTable({ services, systemStats }) {
  const navigate = useNavigate()
  const getStatusColor = (isExceeded) => {
    if (isExceeded) return "text-danger bg-danger/10"
    return "text-success bg-success/10"
  }

  const getStatusBg = (isExceeded) => {
    if (isExceeded) return "bg-danger/20"
    return "bg-success/20"
  }

  const formatBytes = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(1)
  }

  const isVersionMismatch = (service) => {
    return service.version && service.version_real && service.version !== service.version_real
  }

  const handleRowClick = (service) => {
    navigate(`/service/${service.app_id}`)
    
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="px-6 py-3 text-left text-sm font-semibold">Service</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">CPU</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Memory</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Defined Version</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actual Version</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Uptime</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Alert</th>
            </tr>
          </thead>
          <tbody>
            {/* Services Rows */}
            {services.map((service) => {
              const cpuExceeded = service.cpu_percent >= service.cpu_threshold
              const memMB = service.mem_bytes / (1024 * 1024)
              const memExceeded = memMB >= service.memory_threshold_mb
              const versionMismatch = isVersionMismatch(service)

              return (
                <tr
                  key={service.app_id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => handleRowClick(service)}
                >
                  <td className="px-6 py-4 font-medium">{service.app_id}</td>

                  <td className="px-6 py-4">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusBg(cpuExceeded)}`}
                    >
                      <span className={getStatusColor(cpuExceeded)}>
                        {service.cpu_percent.toFixed(2)}% / {service.cpu_threshold}%
                      </span>
                      {cpuExceeded && <AlertCircle className="w-3 h-3 text-danger" />}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusBg(memExceeded)}`}
                    >
                      <span className={getStatusColor(memExceeded)}>
                        {memMB.toFixed(1)} / {service.memory_threshold_mb} MB
                      </span>
                      {memExceeded && <AlertCircle className="w-3 h-3 text-danger" />}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm">{service.version || "-"}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {service.version_real || "-"}
                      {versionMismatch && (
                        <AlertTriangle className="w-4 h-4 text-warning" title="Version mismatch detected" />
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm">{service.uptime || "-"}</td>

                  <td className="px-6 py-4">
                    {cpuExceeded || memExceeded ? (
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
