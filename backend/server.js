const express = require("express")
const cors = require("cors")

require("./database/db") // Import the database connection

const routeRoutes = require("./routes/routeRoutes")
const geocodeRoutes = require("./routes/geocodeRoutes")
const fingridRoutes = require("./routes/fingridRoutes")

const app = express()

app.use(cors())
app.use(express.json())
app.use("/api/geocode", geocodeRoutes)
app.use("/api/routes", routeRoutes)
app.use("/api/fingrid", fingridRoutes)
app.get("/", (req, res) => {
    res.send("Green Transition Backend Running")
})

const PORT = 5000

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`)
})