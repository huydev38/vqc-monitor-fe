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
    const maxDuration = 24 * 60 * 60 * 1000 // 24 hours in ms

    if (duration > maxDuration) {
      throw new Error("Time range cannot exceed 24 hours")
    }

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
    const response = await fetch(`${API_BASE_URL}/apps/${appId}/control/${action}`, {
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
