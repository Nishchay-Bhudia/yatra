import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRoute } from '../lib/api';
import { STOPS } from '../data/itinerary';
import { pick } from '../i18n';

const icon = (emoji, big) => L.divIcon({
  className: 'pin', iconSize: [big ? 46 : 36, big ? 46 : 36], iconAnchor: [big ? 23 : 18, big ? 46 : 36],
  html: `<div class="pin-bubble ${big ? 'big' : ''}"><span>${emoji}</span></div>`,
});

export default function MapView({ day, lang, activeLeg, onSelectLeg }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null);

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView([27.5, 82.5], 6);
    L.control.zoom({ position: 'bottomright' }).addTo(map.current);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 18, subdomains: 'abcd', attribution: '© OpenStreetMap · © CARTO',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => map.current.remove();
  }, []);

  useEffect(() => {
    let dead = false;
    const g = layer.current; g.clearLayers();
    const ids = day.stops;
    const bounds = L.latLngBounds(ids.map((id) => [STOPS[id].lat, STOPS[id].lng]));
    ids.forEach((id, i) => {
      const s = STOPS[id];
      L.marker([s.lat, s.lng], { icon: icon(s.emoji, i === 0 || i === ids.length - 1) })
        .bindTooltip(pick(s.name, lang), { direction: 'top', offset: [0, -34], className: 'tip' }).addTo(g);
    });
    map.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 11, animate: true });
    ids.slice(0, -1).forEach(async (id, i) => {
      const r = await getRoute(STOPS[id], STOPS[ids[i + 1]]);
      if (dead) return;
      const on = activeLeg === i;
      const line = L.polyline(r.coords, { color: '#2b2140', weight: on ? 9 : 7, opacity: 0.9, lineCap: 'round' }).addTo(g);
      const top = L.polyline(r.coords, { color: on ? '#ff6b3d' : '#ffb83d', weight: on ? 5 : 4, className: 'route-flow', dashArray: r.estimated ? '2 10' : '12 10', lineCap: 'round' }).addTo(g);
      [line, top].forEach((l) => l.on('click', () => onSelectLeg(i)));
      if (!r.estimated) bounds.extend(line.getBounds());
      map.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 11, animate: true });
    });
    return () => { dead = true; };
  }, [day, lang, activeLeg]);

  return <div className="map-wrap"><div ref={el} className="map" /></div>;
}
