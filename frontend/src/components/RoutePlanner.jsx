import { useState } from "react"
import { FaMapMarkerAlt } from "react-icons/fa"

function RoutePlanner({ onRouteChange, loading }) {
    const [start, setStart] = useState("")
    const [destination, setDestination] = useState("")
    const [routeType, setRouteType] = useState("fast")

    async function handleCurrentLocation() {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const lat = position.coords.latitude
                    const lon = position.coords.longitude

                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
                    )

                    const data = await response.json()

                    const address = data.address

                    const locationName = [
                        address.road,
                        address.house_number,
                        address.city || address.town || address.village
                    ]
                        .filter(Boolean)
                        .join(" ")

                    setStart(locationName)


                } catch (error) {
                    console.error(error)
                    alert("Failed to get location name.")
                }
            },
            (error) => {
                console.error("Geolocation error:", error)
                alert(`Location error: ${error.message}`)
            }
        )
    }

    function handlePlanRoute() {
        if (!start || !destination) {
            alert("Please enter both start location and destination.")
            return
        }

        onRouteChange({
            start,
            destination,
            routeType,
        })
    }

    return (
        <div
            className={`rounded-2xl bg-gray-900 p-5 mb-6 ${loading ? "cursor-wait" : ""
                }`}
        >
            <h2 className="text-xl font-semibold text-green-400 mb-4">
                Route Planner
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                    type="text"
                    disabled={loading}
                    placeholder="Start location"
                    value={start}
                    onChange={(e) => {
                        setStart(e.target.value)
                    }}
                    className="rounded-xl bg-gray-800 px-4 py-3 text-white outline-none border border-gray-700"
                />

                <input
                    type="text"
                    disabled={loading}
                    placeholder="Destination"
                    value={destination}
                    onChange={(e) => {
                        setDestination(e.target.value)
                    }}
                    className="rounded-xl bg-gray-800 px-4 py-3 text-white outline-none border border-gray-700"
                />
            </div>

            <div className="mb-4">
                <button
                    onClick={handleCurrentLocation}
                    disabled={loading}
                    className={`rounded-full p-3 text-black font-semibold flex items-center justify-center transition
${loading
                            ? "bg-green-300 cursor-not-allowed"
                            : "bg-green-500 hover:bg-green-400 cursor-pointer"
                        }`}
                >
                    <FaMapMarkerAlt size={20} />
                </button>
            </div>

            <div className="flex gap-4 mb-4">
                <button
                    onClick={() => setRouteType("fast")}
                    disabled={loading}
                    className={`px-4 py-2 rounded-xl font-semibold cursor-pointer ${routeType === "fast"
                        ? "bg-green-500 text-black"
                        : "bg-gray-700 text-white"
                        }`}
                >
                    Fast Route
                </button>

                <button
                    onClick={() => setRouteType("eco")}
                    disabled={loading}
                    className={`px-4 py-2 rounded-xl font-semibold cursor-pointer ${routeType === "eco"
                        ? "bg-green-500 text-black"
                        : "bg-gray-700 text-white"
                        }`}
                >
                    Eco Route
                </button>
            </div>

            <button
                onClick={handlePlanRoute}
                disabled={loading}
                className={`w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition
        ${loading
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                    }`}
            >
                {loading && (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}

                {loading ? "Calculating Route..." : "Plan Route"}
            </button>
        </div>
    )
}

export default RoutePlanner