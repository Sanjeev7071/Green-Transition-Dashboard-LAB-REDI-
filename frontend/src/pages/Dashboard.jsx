import { useState, useRef } from "react"
import MapView from "../components/MapView"
import RoutePlanner from "../components/RoutePlanner"
import { getRoute, getRemainingRoute } from "../services/routeService"
import { getCoordinates } from "../services/geocodeService"
import vehicles from "../data/vehicles-temp"

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km

  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

function buildRouteSegments(coordinates, baseEnergyRate) {
  const segments = []

  let cumulativeEnergy = 0

  const uphillFactor = 0.001
  const regenFactor = 0.0005

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1]
    const curr = coordinates[i]

    const distanceKm = calculateDistance(
      prev[1],
      prev[0],
      curr[1],
      curr[0]
    )

    const elevationDiff =
      (curr[2] || 0) - (prev[2] || 0)

    const uphill = Math.max(elevationDiff, 0)
    const downhill = Math.max(-elevationDiff, 0)

    const drivingEnergy =
      distanceKm * baseEnergyRate

    const uphillEnergy =
      uphill * uphillFactor

    const regeneration =
      downhill * regenFactor

    const segmentEnergy =
      drivingEnergy +
      uphillEnergy -
      regeneration

    cumulativeEnergy += segmentEnergy

    segments.push({
      start: [prev[1], prev[0]],
      end: [curr[1], curr[0]],
      cumulativeEnergy,
    })
  }

  return segments
}


function Dashboard() {
  const [routeInfo, setRouteInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [currentPosition, setCurrentPosition] = useState(null)
  const [navigationStarted, setNavigationStarted] = useState(false)
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [remainingDistance, setRemainingDistance] = useState(null)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [remainingTime, setRemainingTime] = useState(null)
  const [liveArrivalTime, setLiveArrivalTime] = useState("")
  const BATTERY_CAPACITY = selectedVehicle?.batteryCapacity || 60
  const [startingBattery] = useState(100)
  const [liveBattery, setLiveBattery] = useState(100)
  const [routeSegments, setRouteSegments] = useState([])
  const watchIdRef = useRef(null)
  const routeUpdateRef = useRef(null)
  const currentPositionRef = useRef(null)
  const previousGpsRef = useRef(null)
  const previousGpsTimeRef = useRef(null)

  function findNearestSegmentIndex(gps, segments) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    segments.forEach((segment, index) => {
      const distance = calculateDistance(
        gps[0],
        gps[1],
        segment.end[0],
        segment.end[1]
      )

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    return nearestIndex
  }

  function findVehicle() {
    const registration = registrationNumber
      .trim()
      .toUpperCase()

    const vehicle = vehicles[registration]

    if (!vehicle) {
      alert("Vehicle not found.")
      setSelectedVehicle(null)
      return
    }

    setSelectedVehicle(vehicle)
  }

  async function handleRouteChange(route) {

    stopNavigation() // Stop any ongoing navigation when a new route is planned

    if (!route) {
      setRouteInfo(null)
      return
    }

    if (!selectedVehicle) {
      alert("Please find your vehicle before planning a route.")
      return
    }

    setLoading(true)

    try {
      const startCoords = await getCoordinates(route.start)
      const endCoords = await getCoordinates(route.destination)

      const routeResult = await getRoute(startCoords, endCoords)

      function densifyRoute(route, step = 5) {
        const dense = []

        for (let i = 0; i < route.length - 1; i++) {
          const start = route[i]
          const end = route[i + 1]

          dense.push(start)

          for (let j = 1; j < step; j++) {
            dense.push([
              start[0] + ((end[0] - start[0]) * j) / step,
              start[1] + ((end[1] - start[1]) * j) / step,
            ])
          }
        }

        dense.push(route[route.length - 1])

        return dense
      }

      function calculateMetrics(feature) {
        const coordinates = feature.geometry.coordinates
        const summary = feature.properties.summary

        let totalUphill = 0
        let totalDownhill = 0

        for (let i = 1; i < coordinates.length; i++) {
          const previousElevation = coordinates[i - 1][2]
          const currentElevation = coordinates[i][2]

          if (previousElevation === undefined || currentElevation === undefined) continue

          const difference = currentElevation - previousElevation

          if (difference > 0) totalUphill += difference
          else totalDownhill += Math.abs(difference)
        }

        const distanceKm = summary.distance / 1000
        const durationMin = summary.duration / 60

        const baseEnergyRate = selectedVehicle.energyConsumption / 100
        const uphillFactor = 0.001
        const regenFactor = 0.0005

        const uphillEnergy = totalUphill * uphillFactor
        const regeneratedEnergy = totalDownhill * regenFactor

        const energyUsed =
          distanceKm * baseEnergyRate + uphillEnergy - regeneratedEnergy

        return {
          feature,
          distanceKm,
          durationMin,
          totalUphill,
          totalDownhill,
          energyUsed,
          regeneratedEnergy,
        }
      }

      const routeMetrics = routeResult.features.map(calculateMetrics)

      console.table(
        routeMetrics.map((r, index) => ({
          route: index + 1,
          distance: r.distanceKm.toFixed(1),
          time: r.durationMin.toFixed(1),
          energy: r.energyUsed.toFixed(2),
          uphill: Math.round(r.totalUphill),
          downhill: Math.round(r.totalDownhill),
        }))
      )

      const fastRoute = routeMetrics.reduce((best, current) =>
        current.durationMin < best.durationMin ? current : best
      )

      const lowestEnergyRoute = routeMetrics.reduce((best, current) =>
        current.energyUsed < best.energyUsed ? current : best
      )

      const ecoRoute =
        lowestEnergyRoute.energyUsed < fastRoute.energyUsed
          ? lowestEnergyRoute
          : fastRoute

      const sameRoute = ecoRoute.feature === fastRoute.feature

      const selectedMetrics = route.routeType === "eco" ? ecoRoute : fastRoute
      const selectedFeature = selectedMetrics.feature

      const segments = buildRouteSegments(
        selectedFeature.geometry.coordinates,
        selectedVehicle.energyConsumption / 100
      )

      setRouteSegments(segments)

      const leafletCoordinates = selectedFeature.geometry.coordinates.map(coord => [
        coord[1],
        coord[0],
      ])

      setRouteCoordinates(densifyRoute(leafletCoordinates, 8))

      const distanceKm = selectedMetrics.distanceKm.toFixed(1)
      const durationMin = Math.round(selectedMetrics.durationMin)

      const arrivalTime = new Date(
        Date.now() + durationMin * 60 * 1000
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })

      const hours = Math.floor(durationMin / 60)
      const minutes = durationMin % 60
      const formattedDuration =
        hours > 0 ? `${hours}h ${minutes}m` : `${minutes}min`

      const distanceNumber = Number(distanceKm)
      const averageSpeed = distanceNumber / (durationMin / 60)

      const fingridResponse = await fetch(
        "http://localhost:5000/api/fingrid/co2-intensity"
      )

      const fingridData = await fingridResponse.json()

      const electricityCarbonIntensity =
        fingridData.data[0].value / 1000

      const batteryCapacity = selectedVehicle.batteryCapacity

      const energyUsed = Math.max(selectedMetrics.energyUsed, 0)
      const batteryUsage = (energyUsed / batteryCapacity) * 100
      const co2Emissions = energyUsed * electricityCarbonIntensity
      const regenerated = selectedMetrics.regeneratedEnergy

      const elevationData = {
        totalUphill: Math.round(selectedMetrics.totalUphill),
        totalDownhill: Math.round(selectedMetrics.totalDownhill),
      }

      try {
        await fetch("http://localhost:5000/api/routes/save-route", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: route.start,
            destination: route.destination,
            distance: distanceNumber,
            duration: durationMin,
            averageSpeed,
            arrivalTime,
            energyUsed,
            batteryUsage,
            co2Emissions,
            regeneratedEnergy: regenerated,
            totalUphill: elevationData.totalUphill,
            totalDownhill: elevationData.totalDownhill,
            routeType: route.routeType
          }),
        })
      } catch (error) {
        console.error("Failed to save route:", error)
      }

      setRouteInfo({
        ...route,
        startCoords,
        endCoords,
        routeData: {
          ...routeResult,
          selectedFeature,
        },
        distance: distanceKm,
        duration: formattedDuration,
        hasAlternativeRoute: routeResult.features.length > 1,
        sameRoute,
        batteryUsage: batteryUsage.toFixed(1),
        energyUsed: energyUsed.toFixed(1),
        co2Emissions: co2Emissions.toFixed(2),
        regenerated: regenerated.toFixed(1),
        averageSpeed: averageSpeed.toFixed(1),
        arrivalTime,
        elevation: elevationData,
      })

      setLiveBattery(startingBattery)

      setCurrentPosition(startCoords)

      setLoading(false)

    } catch (error) {
      console.error(error)
      alert("Failed to fetch route information. Please try again.")
      setLoading(false)
    }
  }

  async function startNavigation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.")
      return
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setNavigationStarted(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const gps = [
          position.coords.latitude,
          position.coords.longitude,
        ]

        setCurrentPosition(gps)
        currentPositionRef.current = gps

        // Calculate speed from consecutive GPS positions
        const currentTime = position.timestamp
        let speedKmh = 0

        if (
          previousGpsRef.current &&
          previousGpsTimeRef.current
        ) {
          const distanceKm = calculateDistance(
            previousGpsRef.current[0],
            previousGpsRef.current[1],
            gps[0],
            gps[1]
          )

          const distanceMeters = distanceKm * 1000

          const timeSeconds =
            (currentTime - previousGpsTimeRef.current) / 1000

          if (timeSeconds > 0) {
            const speedMps = distanceMeters / timeSeconds
            speedKmh = speedMps * 3.6
          }
        }

        // Store current GPS reading for the next calculation
        previousGpsRef.current = gps
        previousGpsTimeRef.current = currentTime

        setCurrentSpeed(speedKmh)

        console.log(
          "Current Speed:",
          speedKmh.toFixed(1),
          "km/h"
        )

        console.log("Live GPS:", gps)
        console.log(
          "GPS time:",
          new Date(position.timestamp).toLocaleTimeString()
        )
      },

      (error) => {
        console.error(error)
      },

      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 1000,
      }
    )
    routeUpdateRef.current = setInterval(() => {
      if (currentPositionRef.current) {
        updateRemainingRoute(currentPositionRef.current)
      }
    }, 5000)
  }

  function stopNavigation() {
    // Stop GPS tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    // Stop 5-second route updates
    if (routeUpdateRef.current !== null) {
      clearInterval(routeUpdateRef.current)
      routeUpdateRef.current = null
    }

    setNavigationStarted(false)

    // Reset navigation state
    setCurrentPosition(null)
    currentPositionRef.current = null

    setRemainingDistance(null)
    setRemainingTime(null)
    setLiveArrivalTime("")
    setCurrentSpeed(0)

    console.log("Navigation stopped")
  }

  async function updateRemainingRoute(gps) {
    if (!routeInfo?.endCoords) return
    if (routeSegments.length === 0) return

    try {
      const remainingRoute = await getRemainingRoute(
        gps,
        routeInfo.endCoords
      )

      const summary = remainingRoute.features[0].properties.summary

      const remainingDistance = summary.distance / 1000
      const remainingMinutes = summary.duration / 60

      setRemainingDistance(remainingDistance)
      setRemainingTime(remainingMinutes)

      const segmentIndex =
        findNearestSegmentIndex(
          gps,
          routeSegments
        )

      const netEnergy =
        routeSegments[segmentIndex]
          ?.cumulativeEnergy || 0

      console.log(
        "Segment:",
        segmentIndex,
        "Energy Usage:",
        netEnergy.toFixed(2),
        "kWh"
      )

      const batteryConsumed =
        (netEnergy / BATTERY_CAPACITY) * 100

      const currentBattery =
        Math.max(startingBattery - batteryConsumed, 0)

      setLiveBattery(currentBattery)

      console.log(
        "Battery:",
        currentBattery.toFixed(2) + "%"
      )

      const arrival = new Date(
        Date.now() + remainingMinutes * 60 * 1000
      )

      setLiveArrivalTime(
        arrival.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      )

      console.log(
        "Road Distance:",
        remainingDistance.toFixed(2),
        "km"
      )

      console.log(
        "Remaining Time:",
        Math.round(remainingMinutes),
        "min"
      )

    } catch (error) {
      console.error("Remaining route update failed:", error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="rounded-xl border border-green-500/20 bg-slate-950 p-8 shadow-2xl">
        <h1 className="text-xl font-bold text-green-400 mb-2">
          Green Transition Dashboard
        </h1>

        <p className="text-gray-400 mb-6">
          EV route optimization using energy consumption and topography
        </p>

        <div className="rounded-2xl bg-slate-900/80 border border-green-500/20 p-6 mb-6">

          <h3 className="text-green-400 text-lg font-semibold mb-4">
            Vehicle
          </h3>

          <div className="flex flex-col md:flex-row gap-3">

            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="Enter registration number"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            />

            <button
              onClick={findVehicle}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
            >
              Find Vehicle
            </button>

          </div>

          {selectedVehicle && (
            <div className="mt-5 bg-slate-800 rounded-xl p-4">

              <h4 className="text-white font-semibold text-lg">
                {selectedVehicle.make} {selectedVehicle.model}
              </h4>

              <p className="text-gray-400">
                Variant: {selectedVehicle.variant}
              </p>

              <p className="text-gray-400">
                Propulsion: {selectedVehicle.propulsion}
              </p>

              <p className="text-gray-400">
                Battery Capacity: {selectedVehicle.batteryCapacity} kWh
              </p>

              <p className="text-gray-400">
                Energy Consumption: {selectedVehicle.energyConsumption} kWh/100 km
              </p>

            </div>
          )}

        </div>


        <RoutePlanner onRouteChange={handleRouteChange} loading={loading} />

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl bg-slate-900/80 border border-green-500/20 p-6">
            <h3 className="text-green-400 text-lg font-semibold mb-4">
              Route Information
            </h3>

            <p className="text-lg font-bold">
              {routeInfo?.start || "Start"} →{" "}
              {routeInfo?.destination || "Destination"}
            </p>

            <div className="mt-4 space-y-3 text-gray-300">
              <p>
                {navigationStarted ? "Remaining Distance" : "Distance"}:{" "}
                {navigationStarted
                  ? remainingDistance !== null
                    ? `${remainingDistance.toFixed(2)} km`
                    : "--"
                  : `${routeInfo?.distance || "--"} km`}
              </p>
              <p>
                {navigationStarted ? "Remaining Time" : "Travel Time"}:{" "}
                {navigationStarted
                  ? remainingTime !== null
                    ? `${Math.round(remainingTime)} min`
                    : "--"
                  : routeInfo?.duration || "--"}
              </p>
              <p>
                Arrival Time:{" "}
                {navigationStarted
                  ? liveArrivalTime || "--"
                  : routeInfo?.arrivalTime || "--"}
              </p>

              <p>
                Current Battery:{" "}
                {navigationStarted
                  ? `${liveBattery.toFixed(2)}%`
                  : `${startingBattery}%`}
              </p>

              <p>
                Current Speed:{" "}
                {navigationStarted
                  ? `${currentSpeed.toFixed(1)} km/h`
                  : "--"}
              </p>

              <p>
                Route Type:{" "}
                <span className="text-green-400 font-semibold">
                  {routeInfo?.routeType?.toUpperCase() || "--"}
                </span>
              </p>

              <p className="text-yellow-400">
                {routeInfo?.sameRoute && routeInfo?.routeType === "eco"
                  ? "The fastest route is also the most energy-efficient route for this journey."
                  : ""}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-green-500/20 p-6">
            <h3 className="text-green-400 text-lg font-semibold mb-2">
              Energy Analysis
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-gray-400">Battery Usage</p>
                <h2 className="text-2xl font-bold text-green-400">
                  {routeInfo?.batteryUsage || "--"}%
                </h2>
              </div>

              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-gray-400">Energy Usage</p>
                <h2 className="text-2xl font-bold text-green-400">
                  {routeInfo?.energyUsed || "--"} kWh
                </h2>
              </div>

              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-gray-400">CO2 Emissions</p>
                <h2 className="text-2xl font-bold text-green-400">
                  {routeInfo?.co2Emissions || "--"} kg
                </h2>
              </div>

              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-gray-400">Regenerated</p>
                <h2 className="text-2xl font-bold text-green-400">
                  {routeInfo?.regenerated || "--"} kWh
                </h2>
              </div>

              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-gray-400">Total Uphill</p>
                <h2 className="text-2xl font-bold text-green-400">
                  {routeInfo?.elevation?.totalUphill ?? "--"} m
                </h2>
              </div>

              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-gray-400">Total Downhill</p>
                <h2 className="text-2xl font-bold text-green-400">
                  {routeInfo?.elevation?.totalDownhill ?? "--"} m
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-green-500/20 shadow-xl">
          <div className="flex justify-end mb-4">
            <button
              onClick={startNavigation}
              disabled={!routeInfo}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-5 py-2 rounded-lg"
            >
              Start Navigation
            </button>
            <button
              onClick={stopNavigation}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Stop Navigation
            </button>
          </div>

          <MapView
            routeInfo={routeInfo}
            currentPosition={currentPosition}
            navigationStarted={navigationStarted}
            routeCoordinates={routeCoordinates}
            setCurrentPosition={setCurrentPosition}
          />
        </div>
      </div>
    </div>
  )
}

export default Dashboard