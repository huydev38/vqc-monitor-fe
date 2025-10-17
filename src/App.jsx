"use client"

import { Routes, Route } from "react-router-dom"
import { useState, useEffect } from "react"
import Layout from "./components/Layout"
import SystemOverview from "./pages/SystemOverview"
import ServiceDetail from "./pages/ServiceDetail"

function App() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const isDark = localStorage.getItem("darkMode") === "true"
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem("darkMode", newMode.toString())
    if (newMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return (
    <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <Routes>
        <Route path="/" element={<SystemOverview />} />
        <Route path="/service/:appId" element={<ServiceDetail />} />
      </Routes>
    </Layout>
  )
}

export default App
