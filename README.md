# Yatra 🛕

Weather, drive times, terrain, ETA countdowns and a map for every stop. Gujarati / English / Hindi.

- Free, keyless APIs: Open-Meteo (weather + elevation), OSRM (routing), OpenStreetMap/CARTO tiles
- Edit stops/days in `src/data/itinerary.js` (pins are approximate)
- Deploy: import the repo on Vercel (Vite preset, no config needed)

## Maps
Works with no key (OpenStreetMap + OpenTopoMap). For a prettier map and satellite, add a free MapTiler key as the
`VITE_MAPTILER_KEY` environment variable in Vercel (Project → Settings → Environment Variables) and redeploy.
