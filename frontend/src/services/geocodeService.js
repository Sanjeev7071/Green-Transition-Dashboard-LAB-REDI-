const knownCities = {
  lahti: [60.9827, 25.6615],
  helsinki: [60.1699, 24.9384],
  tampere: [61.4978, 23.7610],
  turku: [60.4518, 22.2666],
  porvoo: [60.3932, 25.6651],
  valkeakoski: [61.2642, 24.0312],
  jyvaskyla: [62.2426, 25.7473],
  oulu: [65.0121, 25.4651],
  kuopio: [62.8924, 27.6770],
  espoo: [60.2055, 24.6559],
  vantaa: [60.2934, 25.0378],
}

export async function getCoordinates(location) {
  const key = location.trim().toLowerCase()

  // Use local coordinates first
  if (knownCities[key]) {
    return knownCities[key]
  }

  // Otherwise ask YOUR backend
  const API_BASE = import.meta.env.VITE_API_URL

  const response = await fetch(
    `${API_BASE}/api/geocode?location=${encodeURIComponent(location)}`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch coordinates")
  }

  const data = await response.json()

  return [data.lat, data.lon]
}