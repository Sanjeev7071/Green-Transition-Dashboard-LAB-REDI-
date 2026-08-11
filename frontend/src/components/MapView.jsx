import { useEffect, useRef, useState } from "react"

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet"

import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Blue Start Marker
const startIcon = L.divIcon({
  className: "",
  html: `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="32"
         height="48"
         viewBox="0 0 24 24">
      <path
        fill="#2563eb"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3" fill="white"/>
    </svg>
  `,
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -40],
})

// Red Destination Marker
const destinationIcon = L.divIcon({
  className: "",
  html: `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="32"
         height="48"
         viewBox="0 0 24 24">
      <path
        fill="#dc2626"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3" fill="white"/>
    </svg>
  `,
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -40],
})

function FollowMarker({ position }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), {
        animate: true,
      })
    }
  }, [position, map])

  return null
}


function MapView({
  routeInfo,
  currentPosition,
  navigationStarted,
}) {

  const defaultCenter = [60.9827, 25.6615]

  const [smoothPosition, setSmoothPosition] = useState(null)
  const animationRef = useRef(null)



  // const [currentPosition, setCurrentPosition] = useState(null)
  /*
  useEffect(() => {
    if (routeInfo?.startCoords) {
      setCurrentPosition(routeInfo.startCoords)
    }
  }, [routeInfo])
  */

  const selectedFeature = routeInfo?.routeData?.selectedFeature

  const selectedRoute = selectedFeature
    ? selectedFeature.geometry.coordinates.map((coord) => [
      coord[1],
      coord[0],
    ])
    : []

  const routeColor = routeInfo?.routeType === "eco" ? "green" : "blue"

  return (
    <MapContainer
      center={defaultCenter}
      zoom={8}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {navigationStarted && (
        <FollowMarker position={currentPosition} />)}


      {currentPosition && (
        <Marker
          position={currentPosition}
          icon={startIcon}
        >
          <Popup>
            <strong>Start</strong>
            <br />
            {routeInfo.start}
          </Popup>
        </Marker>
      )}

      {routeInfo?.endCoords && (
        <Marker
          position={routeInfo.endCoords}
          icon={destinationIcon}
        >
          <Popup>
            <strong>Destination</strong>
            <br />
            {routeInfo.destination}
          </Popup>
        </Marker>
      )}

      {selectedRoute.length > 0 && (
        <Polyline
          positions={selectedRoute}
          pathOptions={{
            color: routeColor,
            weight: 5,
          }}
        />
      )}
    </MapContainer>
  )
}

export default MapView