"use client"

import { useEffect, useRef } from "react"
import { Terminal } from "lucide-react"

export default function LogViewer({ logs }) {
  console.log("Rendering LogViewer with logs:", logs)
  // const logEndRef = useRef(null)
  // useEffect(() => {
  //   logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  // }, [logs])

  return (
    <div className="bg-gray-900 dark:bg-gray-950 rounded-lg border border-gray-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
        <Terminal className="w-4 h-4 text-success" />
        <span className="text-sm font-medium text-gray-200">Service Logs</span>
      </div>
      <div className="h-64 overflow-y-auto p-4 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No logs available</div>
        ) : (
          logs.map((log, index) => (
            
            <div key={index} className="text-gray-300 hover:bg-gray-800 px-2 py-1 rounded">
              {log}
            </div>
          ))
        )}
        {/* <div ref={logEndRef} /> */}
      </div>
    </div>
  )
}
