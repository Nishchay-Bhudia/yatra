// All free, keyless APIs: OSRM (routing), Open-Meteo (weather + elevation).
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const METEO = 'https://api.open-meteo.com/v1';

const mem = new Map();
function cached(key, ttlMs, fn) {
  if (mem.has(key)) return mem.get(key);
  const p = (async () => {
    try {
      const raw = localStorage.getItem('c:' + key);
      if (raw) {
        const { t, v } = JSON.parse(raw);
        if (Date.now() - t < ttlMs) return v;
      }
    } catch {}
    const v = await fn();
    try { localStorage.setItem('c:' + key, JSON.stringify({ t: Date.now(), v })); } catch {}
    return v;
  })();
  p.catch(() => mem.delete(key));
  mem.set(key, p);
  return p;
}

const rad = (d) => (d * Math.PI) / 180;
export function haversineKm(a, b) {
  const R = 6371, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function getRoute(a, b) {
  const key = `r:${a.lat},${a.lng}>${b.lat},${b.lng}`;
  return cached(key, 7 * 864e5, async () => {
    try {
      const url = `${OSRM}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&alternatives=false&continue_straight=true`;
      const r = await fetch(url);
      if (!r.ok) throw new Error('osrm ' + r.status);
      const j = await r.json();
      const rt = j.routes[0];
      return { km: rt.distance / 1000, min: rt.duration / 60, coords: rt.geometry.coordinates.map(([lng, lat]) => [lat, lng]), estimated: false };
    } catch {
      const km = haversineKm(a, b) * 1.35;
      return { km, min: (km / 42) * 60, coords: [[a.lat, a.lng], [b.lat, b.lng]], estimated: true };
    }
  });
}

export function getElevation(coords) {
  const N = 40, pts = [];
  for (let i = 0; i < N; i++) pts.push(coords[Math.round((i * (coords.length - 1)) / (N - 1))]);
  const lat = pts.map((p) => p[0].toFixed(4)).join(',');
  const lng = pts.map((p) => p[1].toFixed(4)).join(',');
  return cached(`e:${lat.slice(0, 40)}:${lng.slice(0, 40)}:${coords.length}`, 90 * 864e5, async () => {
    const r = await fetch(`${METEO}/elevation?latitude=${lat}&longitude=${lng}`);
    if (!r.ok) throw new Error('elev ' + r.status);
    const { elevation } = await r.json();
    let gain = 0, loss = 0;
    for (let i = 1; i < elevation.length; i++) {
      const d = elevation[i] - elevation[i - 1];
      d > 0 ? (gain += d) : (loss -= d);
    }
    return { gain: Math.round(gain), loss: Math.round(loss), max: Math.round(Math.max(...elevation)), min: Math.round(Math.min(...elevation)), profile: elevation };
  });
}

export function classifyTerrain(e) {
  if (!e) return 'plains';
  if (e.max > 2500) return 'himalaya';
  if (e.max > 1000 || e.gain > 1200) return 'mountain';
  if (e.max > 300 || e.gain > 300) return 'rolling';
  return 'plains';
}
export const TERRAIN = {
  plains:   { emoji: '🌾', factor: 1.0, color: '#7ee0b5' },
  rolling:  { emoji: '⛰️', factor: 1.15, color: '#ffd666' },
  mountain: { emoji: '🏔️', factor: 1.45, color: '#ff9f6b' },
  himalaya: { emoji: '🗻', factor: 1.7, color: '#b79cff' },
};

export function getWeather(stop) {
  const key = `w:${stop.lat},${stop.lng}`;
  return cached(key, 30 * 6e4, async () => {
    const q = `latitude=${stop.lat}&longitude=${stop.lng}&timezone=auto&forecast_days=16` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m`;
    const r = await fetch(`${METEO}/forecast?${q}`);
    if (!r.ok) throw new Error('weather ' + r.status);
    return r.json();
  });
}

export function weatherFor(data, date, hourLocal) {
  if (!data) return null;
  const i = data.daily.time.indexOf(date);
  if (i < 0) return null;
  const d = data.daily;
  const out = {
    code: d.weather_code[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i],
    pop: d.precipitation_probability_max[i], precip: d.precipitation_sum[i], wind: d.wind_speed_10m_max[i],
    sunrise: d.sunrise[i].slice(11, 16), sunset: d.sunset[i].slice(11, 16), hour: null,
  };
  if (hourLocal) {
    const j = data.hourly.time.indexOf(hourLocal);
    if (j >= 0) out.hour = { temp: data.hourly.temperature_2m[j], code: data.hourly.weather_code[j], pop: data.hourly.precipitation_probability[j], wind: data.hourly.wind_speed_10m[j] };
  }
  return out;
}

export function wmo(code) {
  if (code === 0) return { k: 'w_clear', e: '☀️' };
  if (code <= 2) return { k: 'w_partly', e: '⛅' };
  if (code === 3) return { k: 'w_cloudy', e: '☁️' };
  if (code === 45 || code === 48) return { k: 'w_fog', e: '🌫️' };
  if (code >= 51 && code <= 57) return { k: 'w_drizzle', e: '🌦️' };
  if (code >= 61 && code <= 67) return { k: 'w_rain', e: '🌧️' };
  if (code >= 71 && code <= 77) return { k: 'w_snow', e: '❄️' };
  if (code >= 80 && code <= 82) return { k: 'w_showers', e: '🌧️' };
  if (code === 85 || code === 86) return { k: 'w_snow', e: '🌨️' };
  if (code >= 95) return { k: 'w_storm', e: '⛈️' };
  return { k: 'w_cloudy', e: '☁️' };
}

// Weather → slowdown multiplier + alert keys
export function weatherImpact(w, elev) {
  const alerts = [];
  let factor = 1;
  if (w) {
    const c = w.code;
    if (c >= 95) { alerts.push('a_storm'); factor += 0.25; }
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) { alerts.push('a_snow'); factor += 0.3; }
    if (c === 45 || c === 48) { alerts.push('a_fog'); factor += 0.2; }
    if (w.pop >= 60 || w.precip >= 5 || (c >= 61 && c <= 67) || (c >= 80 && c <= 82)) { alerts.push('a_rain'); factor += w.precip >= 15 ? 0.25 : 0.12; }
    if (w.wind >= 40) { alerts.push('a_wind'); factor += 0.05; }
    if (w.min <= 0) alerts.push('a_cold');
  }
  if (elev && elev.max > 2500) alerts.push('a_altitude');
  return { factor, alerts };
}
