const express = require("express")

const router = express.Router()

router.get("/co2-intensity", async (req, res) => {
  try {
    const response = await fetch(
      "https://data.fingrid.fi/api/datasets/265/data?format=json&last=1",
      {
        headers: {
          "x-api-key": process.env.FINGRID_API_KEY,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Fingrid API error: ${response.status}`)
    }

    const data = await response.json()

    res.json(data)
  } catch (error) {
    console.error("Fingrid API error:", error)

    res.status(500).json({
      error: "Failed to fetch Fingrid CO₂ intensity",
    })
  }
})

module.exports = router