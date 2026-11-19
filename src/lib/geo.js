// Editable coordinates: user overrides live in localStorage and are applied onto STOPS in place.
import { useEffect, useState } from 'react';
import { STOPS, VIA } from '../data/itinerary';

const KEY = 'yatra:geo:v1';
const DEF = Object.fromEntries(Object.entries(STOPS).map(([k, s]) => [k, { lat: s.lat, lng: s.lng }]));
let data = { stops: {}, via: {} };
try { data = { stops: {}, via: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
let ver = 0;
const subs = new Set();

const r6 = (n) => Math.round(n * 1e6) / 1e6;
function apply() { Object.keys(STOPS).forEach((id) => { const o = data.stops[id] || DEF[id]; STOPS[id].lat = o.lat; STOPS[id].lng = o.lng; }); }
function commit() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  apply(); ver++; subs.forEach((f) => f());
}
apply();

export function useGeo() {
  const [v, setV] = useState(ver);
  useEffect(() => { const f = () => setV(ver); subs.add(f); return () => subs.delete(f); }, []);
  return v;
}
export const defaultOf = (id) => DEF[id];
export const isCustom = (id) => !!data.stops[id];
export const customCount = () => Object.keys(data.stops).length + Object.keys(data.via).length;
export function setStop(id, lat, lng) { data.stops[id] = { lat: r6(lat), lng: r6(lng) }; commit(); }
export function resetStop(id) { delete data.stops[id]; commit(); }
export const viaKey = (a, b) => `${a}>${b}`;
export const getVia = (a, b) => data.via[viaKey(a, b)] || VIA[viaKey(a, b)] || [];
export function setVia(a, b, arr) { data.via[viaKey(a, b)] = arr.map(([la, ln]) => [r6(la), r6(ln)]); commit(); }
export function resetVia(a, b) { delete data.via[viaKey(a, b)]; commit(); }
export function resetAll() { data = { stops: {}, via: {} }; commit(); }
export function exportJSON() {
  const stops = {}; Object.keys(STOPS).forEach((id) => { stops[id] = { lat: STOPS[id].lat, lng: STOPS[id].lng }; });
  return JSON.stringify({ stops, via: { ...VIA, ...data.via } }, null, 2);
}
export const gmapsPin = (s) => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;

const dms = (d, m, s, h) => (Number(d) + Number(m) / 60 + Number(s) / 3600) * (/[SW]/i.test(h) ? -1 : 1);
// Accepts "28.2, 83.9", a Google Maps URL (@lat,lng / !3d!4d / q=), or DMS like 28°11′22″N 83°57′28″E
export function parseCoords(txt) {
  let s = String(txt || '').trim(); if (!s) return { err: 'empty' };
  try { s = decodeURIComponent(s); } catch {}
  if (/goo\.gl|maps\.app/i.test(s)) return { err: 'short' };
  let lat, lng, m;
  if ((m = s.match(/(\d+)°\s*(\d+)['′]\s*([\d.]+)["″]?\s*([NS])[,\s]+(\d+)°\s*(\d+)['′]\s*([\d.]+)["″]?\s*([EW])/i))) { lat = dms(m[1], m[2], m[3], m[4]); lng = dms(m[5], m[6], m[7], m[8]); }
  else if ((m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)) || (m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)) || (m = s.match(/[?&](?:q|ll|query|destination|center)=(-?\d+\.\d+)[, ]+(-?\d+\.\d+)/)) || (m = s.match(/(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)/))) { lat = +m[1]; lng = +m[2]; }
  else return { err: 'format' };
  if (!(lat > 24 && lat < 31 && lng > 79 && lng < 86)) return { err: 'range' };
  return { lat, lng };
}
