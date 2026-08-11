const express = require("express")

const router = express.Router()

const {
    saveRoute,
    getRouteHistory
} = require("../controllers/routeController")

router.post("/save-route", saveRoute)
router.get("/history", getRouteHistory)

module.exports = router