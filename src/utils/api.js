const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function fetchApps() {
  try {
    const response = await fetch(`${API_BASE_URL}/apps`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()

    // Transform object format to array with service details
    return Object.entries(data).map(([appId, details]) => ({
      app_id: appId,
      running: details.running,
      trackable: details.trackable,
      version: details.version,
      cgroup: details.cgroup,
    }))
  } catch (error) {
    console.error("Failed to fetch apps:", error)
    throw error
  }
}

export async function fetchServiceStats(appId, start, end, maxPoints = 100, bucketMs = null) {
  try {
    if (appId == "system") {
      appId = "__system__"
    }
    // Validate: don't allow more than 24 hours
    const duration = end - start
    // const maxDuration = 24 * 60 * 60 * 1000 // 24 hours in ms

    // if (duration > maxDuration) {
    //   throw new Error("Time range cannot exceed 24 hours")
    // }

    let url = `${API_BASE_URL}/apps/${appId}/stats?start=${start}&end=${end}&max_points=${maxPoints}`

    if (bucketMs) {
      url += `&bucket_ms=${bucketMs}`
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error("Failed to fetch service stats:", error)
    throw error
  }
}

export async function controlService(appId, action) {
  try {
    const response = await fetch(`${API_BASE_URL}/containers/${appId}/control/${action}`, {
      method: "POST",
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Failed to ${action} service:`, error)
    throw error
  }
}

export async function fetchAlerts(appId = null, limit = 10) {
  try {
    const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL
    let url = `${WS_BASE_URL}/ws/alerts?limit=${limit}`
    if (appId) {
      url += `&app_id=${appId}`
    }
    // Note: This is a WebSocket endpoint, use useAlerts hook instead
    return url
  } catch (error) {
    console.error("Failed to get alerts URL:", error)
    throw error
  }
}

export async function fetchSystemThreshold() {
  try {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL
    let url = `${BASE_URL}/system/thresholds`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Failed to get alerts URL:", error)
    throw error
  }
}

export async function fetchStateTimeline(appId, tsFrom, tsTo) {
  try {
    const apiAppId = appId === "system" ? "__system__" : appId
    const url = `${API_BASE_URL}/apps/${apiAppId}/state_timelines?ts_from=${tsFrom}&ts_to=${tsTo}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Failed to fetch state timeline:", error)
    throw error
  }
}

export async function fetchContainers() {
  try {
    const response = await fetch(`${API_BASE_URL}/containers`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    // Transform object format to array
    return Object.entries(data).map(([containerName, details]) => ({
      container_name: containerName,
      ...details,
    }))
  } catch (error) {
    console.error("Failed to fetch containers:", error)
    throw error
  }
}

export async function fetchContainerStats(containerName, start, end, maxPoints = 100, bucketMs = null) {
  try {
    let url = `${API_BASE_URL}/containers/${containerName}/stats?start=${start}&end=${end}&max_points=${maxPoints}`
    if (bucketMs) {
      url += `&bucket_ms=${bucketMs}`
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Failed to fetch container stats:", error)
    throw error
  }
}

export async function fetchContainerStateTimeline(containerName, tsFrom, tsTo) {
  try {
    const url = `${API_BASE_URL}/containers/${containerName}/state_timelines?ts_from=${tsFrom}&ts_to=${tsTo}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Failed to fetch container state timeline:", error)
    throw error
  }
}

export async function fetchContainerInfo(containerName) {
  try {
    const response = await fetch(`${API_BASE_URL}/containers`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    const containerData = data[containerName]
    if (!containerData) {
      throw new Error(`Container ${containerName} not found`)
    }
    return {
      container_name: containerName,
      ...containerData,
    }
  } catch (error) {
    console.error("Failed to fetch container info:", error)
    throw error
  }
}
