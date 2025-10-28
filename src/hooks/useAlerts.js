"use client"

import { useState, useEffect, useRef } from "react"

export function useAlerts(appId = null, limit = 10, enabled = true) {
    const [alerts, setAlerts] = useState([])
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState(null)
    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)

    useEffect(() => {
        if (!enabled) {
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
            return
        }

        const connectWebSocket = () => {
            try {
                const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL
                let url = `${WS_BASE_URL}/ws/alerts?limit=${limit}`
                if (appId) {
                    url += `&app_id=${appId}`
                }

                wsRef.current = new WebSocket(url)

                wsRef.current.onopen = () => {
                    setIsConnected(true)
                    setError(null)
                }

                wsRef.current.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)
                        if (data.alerts && Array.isArray(data.alerts)) {
                            setAlerts(data.alerts)
                        }
                    } catch (err) {
                        console.error("[v0] Failed to parse alerts:", err)
                    }
                }

                wsRef.current.onerror = (err) => {
                    console.error("[v0] WebSocket error:", err)
                    setError("Connection error")
                    setIsConnected(false)
                }

                wsRef.current.onclose = () => {
                    setIsConnected(false)
                    // Attempt to reconnect after 5 seconds
                    if (enabled) {
                        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000)
                    }
                }
            } catch (err) {
                console.error("[v0] Failed to connect WebSocket:", err)
                setError(err.message)
            }
        }

        connectWebSocket()

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
        }
    }, [appId, limit, enabled])

    return { alerts, isConnected, error }
}
