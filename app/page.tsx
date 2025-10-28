"use client"

// This is a Vite React app, not a Next.js app
// The actual entry point is index.html -> src/main.jsx
// This file exists only to satisfy the build system requirements

import { useEffect } from "react"

export default function Page() {
  useEffect(() => {
    // Redirect to the Vite app
    if (typeof window !== "undefined") {
      window.location.href = "/index.html"
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">VQC System Monitor</h1>
        <p className="text-gray-600 dark:text-gray-400">
          This is a Vite React application. Please access it directly via the development server.
        </p>
        <div className="text-sm text-gray-500">
          <p>
            Run: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">npm run dev</code>
          </p>
          <p>
            Then open: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">http://localhost:3000</code>
          </p>
        </div>
      </div>
    </div>
  )
}
