"use client"

import { useState, useEffect, useRef } from "react"

export function useAlerts(appId = null, limit = 10, enabled = true) {
    const [alerts, setAlerts] = useState([])
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState(null)
    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)
    const currentAppIdRef = useRef(appId)
    const isConnectingRef = useRef(false) // Add flag to prevent duplicate connections

    useEffect(() => {
        currentAppIdRef.current = appId
    }, [appId])

    useEffect(() => {
        if (!enabled) {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
                reconnectTimeoutRef.current = null
            }
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
            isConnectingRef.current = false // Reset connecting flag
            setIsConnected(false)
            return
        }

        if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
            return
        }

        // Close existing connection before creating a new one
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
        }

        const connectWebSocket = () => {
            if (isConnectingRef.current) {
                return
            }

            isConnectingRef.current = true

            try {
                const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL
                let url = `${WS_BASE_URL}/ws/alerts?limit=${limit}`
                if (currentAppIdRef.current) {
                    url += `&app_id=${currentAppIdRef.current}`
                }

                wsRef.current = new WebSocket(url)

                wsRef.current.onopen = () => {
                    isConnectingRef.current = false
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
                        console.error("Failed to parse alerts:", err)
                    }
                }

                wsRef.current.onerror = (err) => {
                    console.error("WebSocket error:", err)
                    isConnectingRef.current = false
                    setError("Connection error")
                    setIsConnected(false)
                }

                wsRef.current.onclose = () => {
                    isConnectingRef.current = false
                    setIsConnected(false)
                    // Attempt to reconnect after 5 seconds if still enabled
                    if (enabled) {
                        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000)
                    }
                }
            } catch (err) {
                console.error("Failed to connect WebSocket:", err)
                isConnectingRef.current = false
                setError(err.message)
            }
        }

        connectWebSocket()

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
                reconnectTimeoutRef.current = null
            }
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
            isConnectingRef.current = false // Reset flag on cleanup
        }
    }, [appId, limit, enabled])

    return { alerts, isConnected, error }
}
