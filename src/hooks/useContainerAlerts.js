"use client"

import { useEffect, useRef, useState } from "react"

export function useContainerAlerts(containerName = null, limit = 10, enabled = true) {
    const [alerts, setAlerts] = useState([])
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState(null)
    const wsRef = useRef(null)
    const isConnectingRef = useRef(false)
    const previousParamsRef = useRef({ containerName, limit, enabled })

    useEffect(() => {
        const paramsChanged =
            previousParamsRef.current.containerName !== containerName ||
            previousParamsRef.current.limit !== limit ||
            previousParamsRef.current.enabled !== enabled

        previousParamsRef.current = { containerName, limit, enabled }

        if (!paramsChanged && wsRef.current?.readyState === WebSocket.OPEN) {
            return
        }

        if (!enabled) {
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
                setIsConnected(false)
            }
            setAlerts([])
            return
        }

        const connect = () => {
            if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
                return
            }

            isConnectingRef.current = true
            const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL

            try {
                let wsUrl = `${WS_BASE_URL}/ws/container/alerts?limit=${limit}`
                if (containerName) {
                    wsUrl += `&container=${containerName}`
                }

                wsRef.current = new WebSocket(wsUrl)

                wsRef.current.onopen = () => {
                    setIsConnected(true)
                    setError(null)
                    isConnectingRef.current = false
                }

                wsRef.current.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)
                        if (data.alerts) {
                            setAlerts(data.alerts)
                        }
                    } catch (e) {
                        console.error("Failed to parse alert data:", e)
                    }
                }

                wsRef.current.onerror = () => {
                    setError("WebSocket error")
                    isConnectingRef.current = false
                }

                wsRef.current.onclose = () => {
                    setIsConnected(false)
                    isConnectingRef.current = false
                    if (enabled) {
                        setTimeout(connect, 5000)
                    }
                }
            } catch (e) {
                setError(e.message)
                isConnectingRef.current = false
            }
        }

        connect()

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
        }
    }, [containerName, limit, enabled])

    return { alerts, isConnected, error }
}
