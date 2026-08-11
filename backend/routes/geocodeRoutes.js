const express = require("express")

const router = express.Router()

const {
    getCoordinates
} = require("../controllers/geocodeController")

router.get("/", getCoordinates)

module.exports = router