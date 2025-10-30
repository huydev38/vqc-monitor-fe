"use client"

import { useState, useEffect } from "react"

export default function DateTimeInput({ value, onChange, label }) {
  const [displayValue, setDisplayValue] = useState("")

  useEffect(() => {
    if (value) {
      // Convert ISO format to 24-hour display format (YYYY-MM-DD HH:mm)
      const date = new Date(value)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      setDisplayValue(`${year}-${month}-${day} ${hours}:${minutes}`)
    }
  }, [value])

  const handleChange = (e) => {
    const inputValue = e.target.value
    setDisplayValue(inputValue)

    // Parse the input in format YYYY-MM-DD HH:mm
    const parts = inputValue.split(" ")
    if (parts.length === 2) {
      const dateParts = parts[0].split("-")
      const timeParts = parts[1].split(":")

      if (dateParts.length === 3 && timeParts.length === 2) {
        const date = new Date(
          Number.parseInt(dateParts[0]),
          Number.parseInt(dateParts[1]) - 1,
          Number.parseInt(dateParts[2]),
          Number.parseInt(timeParts[0]),
          Number.parseInt(timeParts[1]),
        )
        onChange(date.toISOString().slice(0, 16))
      }
    }
  }

  return (
    <div className="flex-1">
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        type="text"
        placeholder="YYYY-MM-DD HH:mm"
        value={displayValue}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
      />
    </div>
  )
}
