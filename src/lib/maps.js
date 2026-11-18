// Keyless by default (OpenStreetMap / OpenTopoMap). Add VITE_MAPTILER_KEY in Vercel for a prettier map + satellite.
const KEY = import.meta.env.VITE_MAPTILER_KEY;
const MT = (style, ext = 'png') => `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}${ext === 'jpg' ? '.jpg' : '@2x.png'}?key=${KEY}`;
const mtAttr = '© MapTiler © OpenStreetMap contributors';

export const BASES = KEY
  ? {
      map: [{ url: MT('streets-v2'), o: { maxZoom: 20, tileSize: 512, zoomOffset: -1, attribution: mtAttr } }],
      terrain: [{ url: MT('outdoor-v2'), o: { maxZoom: 20, tileSize: 512, zoomOffset: -1, attribution: mtAttr } }],
      sat: [{ url: MT('hybrid', 'jpg'), o: { maxZoom: 20, tileSize: 512, zoomOffset: -1, attribution: mtAttr } }],
    }
  : {
      map: [{ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', o: { maxZoom: 19, attribution: '© OpenStreetMap contributors' } }],
      terrain: [{ url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', o: { subdomains: 'abc', maxZoom: 17, attribution: '© OpenStreetMap · © OpenTopoMap (CC-BY-SA)' } }],
    };
export const ORDER = Object.keys(BASES);
export const ICON = { map: '🗺️', terrain: '⛰️', sat: '🛰️' };
