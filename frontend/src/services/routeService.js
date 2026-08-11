const API_KEY = import.meta.env.VITE_ORS_API_KEY


async function fetchRoute(startCoords, endCoords, withAlternatives = false) {
  const body = {
    coordinates: [
      [startCoords[1], startCoords[0]],
      [endCoords[1], endCoords[0]],
    ],
    elevation: true,
  }

  if (withAlternatives) {
    body.alternative_routes = {
      target_count: 2,
      share_factor: 0.6,
      weight_factor: 1.6,
    }
  }

  const response = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: {
        Authorization: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    throw new Error("Route request failed")
  }

  return response.json()
}

export async function getRoute(startCoords, endCoords) {
  try {
    return await fetchRoute(startCoords, endCoords, true)
  } catch (error) {
    console.warn("Alternative route failed. Using single route.")
    return await fetchRoute(startCoords, endCoords, false)
  }
}

export async function getRemainingRoute(currentCoords, destinationCoords) {
  return await fetchRoute(currentCoords, destinationCoords, false)
}