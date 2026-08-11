const axios = require("axios")

const getCoordinates = async (req, res) => {
    try {
        const location = req.query.location

        if (!location) {
            return res.status(400).json({
                message: "Location is required"
            })
        }

        const response = await axios.get(
            "https://nominatim.openstreetmap.org/search",
            {
                params: {
                    q: `${location}, Finland`,
                    format: "json",
                    limit: 1,
                    countrycodes: "fi"
                },
                headers: {
                    "User-Agent": "GreenTransitionDashboard/1.0"
                }
            }
        )

        if (response.data.length === 0) {
            return res.status(404).json({
                message: "Location not found"
            })
        }

        res.json({
            lat: Number(response.data[0].lat),
            lon: Number(response.data[0].lon)
        })

    } catch (error) {
        console.error(error.message)

        res.status(500).json({
            message: "Geocoding failed"
        })
    }
}

module.exports = {
    getCoordinates
}