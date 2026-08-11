const db = require("../database/db")

const saveRoute = (req, res) => {

    const {
        start,
        destination,
        distance,
        duration,
        averageSpeed,
        arrivalTime,
        co2Saved,
        regeneratedEnergy,
        energyUsed,
        batteryUsage,
        totalUphill,
        totalDownhill,
        routeType
    } = req.body

    const sql = `
        INSERT INTO route_history
(
    start_location,
    destination,
    distance_km,
    duration_minutes,
    average_speed,
    arrival_time,
    energy_used,
    battery_usage,
    co2_saved,
    regenerated_energy,
    total_uphill,
    total_downhill,
    route_type
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    db.query(
        sql,
        [
    start,
    destination,
    distance,
    duration,
    averageSpeed,
    arrivalTime,
    energyUsed,
    batteryUsage,
    co2Saved,
    regeneratedEnergy,
    totalUphill,
    totalDownhill,
    routeType
],
        (err, result) => {

            if (err) {
                console.error(err)
                return res.status(500).json({
                    message: "Database Error"
                })
            }

            res.status(201).json({
                message: "Route saved successfully",
                routeId: result.insertId
            })

        }
    )
}

// NEW FUNCTION
const getRouteHistory = (req, res) => {

    const sql = `
    SELECT *
        FROM route_history
        ORDER BY created_at DESC
        `

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err)
            return res.status(500).json({
                message: "Database Error"
            })
        }

        res.status(200).json(results)

    })

}

module.exports = {
    saveRoute,
    getRouteHistory
}