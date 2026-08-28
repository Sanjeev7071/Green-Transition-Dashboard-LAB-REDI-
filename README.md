# Green Transition Dashboard

A web-based dashboard for **electric mobility and sustainable route optimization**. The project focuses on real-time mobility and sustainability data, including CO₂ savings, energy consumption, battery usage, regenerative energy, and topography-based route analysis.

## Features
* Vehicle selection 
* Fast and Eco route planning
* Interactive map with GPS navigation
* Real-time GPS position tracking
* Real-time mobility and sustainability data
* Energy and battery consumption estimation
* Regenerative energy analysis
* CO₂ Emissions estimation
* Topography-based route analysis

## Technology Stack

* **Frontend:** React, Vite, TailwindCSS, Leaflet
* **Backend:** Node.js, Express
* **Database:** MySQL
* **Routing:** OpenRouteService
* **Map & Geolocation:** Leaflet, Browser Geolocation API

## Project Structure

```text
green-dashboard/
├── frontend/
└── backend/
```

## Running Locally

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Environment Variables

Create the required `.env` files locally and configure the necessary API and database credentials.

> Do not commit API keys, passwords, or other sensitive credentials to the repository.
