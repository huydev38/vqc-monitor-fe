"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle } from "lucide-react"
import { fetchStateTimeline, fetchContainerStateTimeline } from "../utils/api"

export default function StateTimeline({ appId, startTime, endTime, isContainer = false }) {
  const [timelineData, setTimelineData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const requestInProgressRef = useRef(false)
  const previousParamsRef = useRef(null)

  useEffect(() => {
    if (!appId || startTime === undefined || endTime === undefined) return

    const currentParams = { appId, startTime, endTime, isContainer }
    const paramsChanged = JSON.stringify(previousParamsRef.current) !== JSON.stringify(currentParams)

    if (requestInProgressRef.current || !paramsChanged) {
      return
    }

    loadTimelineData()
  }, [appId, startTime, endTime, isContainer])

  const loadTimelineData = async () => {
    if (requestInProgressRef.current) return

    requestInProgressRef.current = true
    setLoading(true)
    setError(null)

    try {
      const data = isContainer
        ? await fetchContainerStateTimeline(appId, startTime, endTime)
        : await fetchStateTimeline(appId, startTime, endTime)

      setTimelineData(data)
      previousParamsRef.current = { appId, startTime, endTime, isContainer }
    } catch (err) {
      console.error("Failed to fetch state timeline:", err)
      setError(err.message)
    } finally {
      setLoading(false)
      requestInProgressRef.current = false
    }
  }

  const getStateColor = (state) => {
    if (state === "running") return "bg-success"
    if (state === "stopped") return "bg-danger"
    return "bg-warning"
  }

  const getStateLabel = (state) => {
    if (state === "running") return "Running"
    if (state === "stopped") return "Stopped"
    return state
  }

  const calculateWidth = (startTime, endTime, totalStart, totalEnd) => {
    const totalDuration = totalEnd - totalStart
    const duration = (endTime || totalEnd) - startTime
    return ((duration / totalDuration) * 100).toFixed(2)
  }

  const calculateLeftOffset = (startTime, totalStart, totalEnd) => {
    const totalDuration = totalEnd - totalStart
    const offset = startTime - totalStart
    return ((offset / totalDuration) * 100).toFixed(2)
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading state timeline...</div>
  }

  if (error) {
    return (
      <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load state timeline: {error}</span>
      </div>
    )
  }

  if (!timelineData || timelineData.length === 0) {
    return (
      <div className="bg-warning/10 border border-warning text-warning px-4 py-3 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5" />
        <span>No state timeline data available for the selected time range.</span>
      </div>
    )
  }

  const totalStart = startTime
  const totalEnd = endTime

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-success rounded"></div>
          <span>Running</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-danger rounded"></div>
          <span>Stopped</span>
        </div>
      </div>

      <div className="overflow-x-auto bg-gray-900 dark:bg-gray-950 p-4 rounded-lg">
        <div className="relative h-32 min-w-full">
          {timelineData.map((item, index) => {
            const leftOffset = calculateLeftOffset(item.start_time, totalStart, totalEnd)
            const width = calculateWidth(item.start_time, item.end_time || totalEnd, totalStart, totalEnd)

            return (
              <div
                key={index}
                className="absolute top-0 h-full flex items-center"
                style={{ left: `${leftOffset}%`, width: `${width}%` }}
              >
                <div
                  className={`h-12 w-full flex items-center justify-center text-white text-sm font-medium ${getStateColor(item.state)} opacity-90 hover:opacity-100 rounded transition-opacity`}
                  title={`${getStateLabel(item.state)} - ${new Date(item.start_time).toLocaleString()} to ${item.end_time ? new Date(item.end_time).toLocaleString() : "Now"}`}
                >
                  {width > 8 && getStateLabel(item.state)}
                </div>
              </div>
            )
          })}

          {/* Time axis labels */}
          <div className="absolute bottom-0 left-0 right-0 h-6 flex">
            {Array.from({ length: 5 }).map((_, i) => {
              const timeOffset = totalStart + ((totalEnd - totalStart) / 4) * i
              const timeStr = new Date(timeOffset).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
              return (
                <div
                  key={i}
                  className="flex-1 text-xs text-gray-400 border-l border-gray-700"
                  style={{ paddingLeft: "4px" }}
                >
                  {timeStr}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
