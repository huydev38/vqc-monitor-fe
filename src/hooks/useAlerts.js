"use client"

import { useEffect, useRef, useState } from "react"


export function useAlerts(appId = null, limit = 10, enabled = true) {
    const [alerts, setAlerts] = useState([])
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState(false)

    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)
    const isConnectingRef = useRef(false)
    const lastUrlRef = useRef(null)
    const connectionIdRef = useRef(0) // tăng mỗi lần (re)connect
    const mountedRef = useRef(true)

    // Clear UI khi đổi app để tránh “bóng ma”
    useEffect(() => {
        setAlerts([])
    }, [appId])

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    useEffect(() => {
        // Tắt → đóng sạch và thôi
        if (!enabled) {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
                reconnectTimeoutRef.current = null
            }
            if (wsRef.current) {
                try { wsRef.current.close() } catch { }
                wsRef.current = null
            }
            lastUrlRef.current = null
            isConnectingRef.current = false
            setIsConnected(false)
            return
        }

        const WS_BASE_URL = import.meta.env.VITE_API_BASE_URL
        let desiredUrl = `${WS_BASE_URL}/ws/alerts?limit=${limit}`
        if (appId) desiredUrl += `&app_id=${appId}`

        // Luôn dọn timer cũ trước
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
        }

        // Nếu đã có socket OPEN đúng URL thì giữ nguyên
        if (
            wsRef.current &&
            wsRef.current.readyState === WebSocket.OPEN &&
            (lastUrlRef.current === desiredUrl || wsRef.current.url === desiredUrl)
        ) {
            return
        }

        // Nếu có socket nhưng URL khác → đóng
        if (wsRef.current && (lastUrlRef.current !== desiredUrl && wsRef.current.url !== desiredUrl)) {
            try { wsRef.current.close() } catch { }
            wsRef.current = null
            setIsConnected(false)
        }

        // Tránh đúp connect cùng URL
        if (isConnectingRef.current && lastUrlRef.current === desiredUrl) {
            return
        }

        const connect = () => {
            // Nếu đang kết nối cùng URL → thôi
            if (isConnectingRef.current && lastUrlRef.current === desiredUrl) return

            isConnectingRef.current = true
            const myConnectionId = ++connectionIdRef.current

            try {
                const ws = new WebSocket(desiredUrl)
                wsRef.current = ws
                lastUrlRef.current = desiredUrl

                ws.onopen = () => {
                    // Chỉ set state nếu đây là kết nối “đương nhiệm”
                    if (connectionIdRef.current !== myConnectionId || !mountedRef.current) return
                    isConnectingRef.current = false
                    setIsConnected(true)
                    setError(false)
                }

                ws.onmessage = (event) => {
                    if (connectionIdRef.current !== myConnectionId || !mountedRef.current) return
                    try {
                        const data = JSON.parse(event.data)

                        // Nếu server gửi dạng { alerts: Alert[] }
                        let next = Array.isArray(data.alerts) ? data.alerts : []
                        // (Khuyến nghị) Lọc theo app hiện tại nếu có trường nhận dạng
                        // if (appId) {
                        //     next = next.filter(() =>
                        //         a?.app_id === appId || a?.service_id === appId || a?.appId === appId
                        //     )
                        // }

                        setAlerts(next)
                    } catch (err) {
                        console.error("Failed to parse alerts:", err)
                    }
                }

                ws.onerror = (err) => {
                    if (connectionIdRef.current !== myConnectionId || !mountedRef.current) return
                    console.error("WebSocket error:", err)
                    isConnectingRef.current = false
                    setError("Connection error")
                    setIsConnected(false)
                }

                ws.onclose = () => {
                    // Nếu KHÔNG còn là kết nối hiện tại → đừng reconnect
                    if (connectionIdRef.current !== myConnectionId || !mountedRef.current) return
                    isConnectingRef.current = false
                    setIsConnected(false)

                    // Chỉ reconnect nếu vẫn enabled và URL vẫn là desiredUrl hiện tại
                    if (enabled && (lastUrlRef.current === desiredUrl)) {
                        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
                        reconnectTimeoutRef.current = setTimeout(connect, 5000)
                    }
                }
            } catch (err) {
                if (connectionIdRef.current !== myConnectionId || !mountedRef.current) return
                console.error("Failed to connect WebSocket:", err)
                isConnectingRef.current = false
                setError(err?.message ?? "Connect error")
            }
        }

        connect()

        // Cleanup cho lần thay đổi deps hoặc unmount
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
                reconnectTimeoutRef.current = null
            }
            if (wsRef.current) {
                try { wsRef.current.close() } catch { }
                wsRef.current = null
            }
            lastUrlRef.current = null
            isConnectingRef.current = false
            // tăng connectionId để “vô hiệu hóa” mọi handler cũ
            connectionIdRef.current++
        }
    }, [appId, limit, enabled])

    return { alerts, isConnected, error }
}
