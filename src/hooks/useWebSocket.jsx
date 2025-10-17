// hooks/useWebSocket.ts
"use client"
import { useEffect, useRef, useState } from "react"

export function useWebSocket(url, enabled = true) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const shouldReconnectRef = useRef(true)
  const sessionIdRef = useRef(0)

  useEffect(() => {
    shouldReconnectRef.current = enabled
    if (!enabled) {
      shouldReconnectRef.current = false
      reconnectTimeoutRef.current && clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
      wsRef.current?.close()
      wsRef.current = null
      setIsConnected(false)
      return
    }

    const mySession = ++sessionIdRef.current

    const connect = () => {
      if (!shouldReconnectRef.current) return
      if (wsRef.current && wsRef.current.url !== url) {
        try { wsRef.current.close() } catch {}
        wsRef.current = null
      }
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (sessionIdRef.current !== mySession) return
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        if (sessionIdRef.current !== mySession) return
        try {
          if (url.includes("/logs")) {
            const lines = String(event.data)
            setData(prev => {
              const existing = Array.isArray(prev) ? prev : []
              const newLines = lines.split("\n").filter(line => line.trim() !== "")
              return [...existing, ...newLines]
            })
            
          } else {
            setData(JSON.parse(event.data))
          }
        } catch (e) {
          // bỏ qua frame lỗi parse
        }
      }

      ws.onerror = () => {
        if (sessionIdRef.current !== mySession) return
        setError("WebSocket connection error")
      }

      ws.onclose = () => {
        if (sessionIdRef.current !== mySession) return
        setIsConnected(false)
        wsRef.current = null
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < 10) {
          reconnectAttemptsRef.current++
          reconnectTimeoutRef.current = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      shouldReconnectRef.current = false
      sessionIdRef.current++ // vô hiệu handler cũ
      reconnectTimeoutRef.current && clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
      try { wsRef.current?.close() } catch {}
      wsRef.current = null
    }
  }, [url, enabled])

  return { data, error, isConnected }
}
