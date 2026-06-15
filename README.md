# AtmosIQ — Weather Intelligence Dashboard (Task 6: API Integration)

A premium, real-time weather dashboard with a futuristic glassmorphism UI,
animated backgrounds, and live data from the OpenWeatherMap API.

## Tech Stack
- HTML5, CSS3, JavaScript (Vanilla)
- Chart.js for forecast visualizations
- OpenWeatherMap API (current weather, 5-day forecast, air quality)

## Features
- Real-time weather search by city or current location
- 5-day / hourly forecast with interactive charts
- Air Quality Index (AQI) breakdown
- Multiple themes (Dark, Neon, Cyberpunk)
- Celsius / Fahrenheit toggle with saved preferences
- Search history with quick re-access
- Responsive across all devices
- Graceful fallback to demo data if the API is unavailable

## Setup
1. Clone the repository
2. Open `index.html` in a browser, or use the **Live Server** extension in VS Code
3. (Optional) Replace the `API_KEY` value in `script.js` with your own
   [OpenWeatherMap API key](https://home.openweathermap.org/api_keys)

## Project Structure
```
├── index.html     # Markup and layout
├── styles.css     # Theme tokens, layout, animations
├── script.js      # App logic, API calls, rendering
└── README.md
```

## Notes
- New OpenWeatherMap API keys can take up to 10 minutes to activate.
- When opened directly as a local file (`file://`), the app routes API
  requests through a CORS proxy automatically. For best results, host it
  on a service like Netlify, Vercel, or GitHub Pages.
