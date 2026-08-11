const API_KEY = import.meta.env.VITE_ORS_API_KEY

export async function getElevationData(routeCoordinates) {
  const sampledPoints = routeCoordinates
    .filter((_, index) => index % 50 === 0)
    .slice(0, 50)

  if (sampledPoints.length < 2) {
    return {
      totalUphill: 0,
      totalDownhill: 0,
    }
  }

  const coordinates = sampledPoints.map((point) => [
    point[1], // longitude
    point[0], // latitude
  ])

  const response = await fetch(
    "https://api.openrouteservice.org/elevation/line",
    {
      method: "POST",
      headers: {
        Authorization: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        format_in: "polyline",
        format_out: "polyline",
        geometry: coordinates,
      }),
    }
  )

  const data = await response.json()
  console.log("ORS Elevation response:", data)

  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to fetch elevation data")
  }

  const elevations = data.geometry.coordinates.map((coord) => coord[2])

  let totalUphill = 0
  let totalDownhill = 0

  for (let i = 1; i < elevations.length; i++) {
    const difference = elevations[i] - elevations[i - 1]

    if (difference > 0) {
      totalUphill += difference
    } else {
      totalDownhill += Math.abs(difference)
    }
  }

  return {
    totalUphill: Math.round(totalUphill),
    totalDownhill: Math.round(totalDownhill),
  }
}