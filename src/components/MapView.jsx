import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRoute } from '../lib/api';
import { STOPS } from '../data/itinerary';
import { pick } from '../i18n';

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const pin = (s, name, n, on) => L.divIcon({
  className: 'pin3d-wrap', iconSize: [130, 100], iconAnchor: [65, 30],
  html: `<div class="pin3d ${on ? 'on' : ''}"><i class="halo"></i><i class="halo h2"></i><div class="orb"><span>${s.emoji}</span></div><b class="num">${n}</b><div class="plabel">${esc(name)}</div></div>`,
});

export default function MapView({ day, lang, activeLeg, focus, onSelectLeg, onSelectStop, inset }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), insetRef = useRef(inset);
  insetRef.current = inset;

  const fit = (bounds) => {
    const i = insetRef.current;
    map.current.fitBounds(bounds, { paddingTopLeft: [i.left + 40, i.top + 50], paddingBottomRight: [40, i.bottom + 50], maxZoom: 11, animate: true, duration: 0.8 });
  };

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: true }).setView([27.5, 82.5], 6);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map.current);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 18, subdomains: 'abcd', attribution: '© OpenStreetMap · © CARTO',
    }).addTo(map.current);
    const m = map.current;
    m.createPane('tint').style.zIndex = 250;
    m.createPane('clouds').style.zIndex = 350;
    m.getPane('clouds').style.pointerEvents = 'none';
    L.rectangle([[-85, -180], [85, 180]], { pane: 'tint', stroke: false, fillColor: '#a9d0ff', fillOpacity: 0.9, interactive: false }).addTo(m);
    [[27.2, 81.2, 1], [26.4, 83.2, 2], [28.4, 82.4, 3], [29.1, 84.2, 1], [28.0, 84.6, 2], [27.6, 80.6, 3], [28.9, 83.0, 2], [26.2, 82.0, 1], [27.9, 83.3, 3]].forEach(([la, ln, k]) =>
      L.marker([la, ln], { pane: 'clouds', interactive: false, icon: L.divIcon({ className: 'cloud-ic', iconSize: [0, 0], html: `<i class="cl c${k}"></i>` }) }).addTo(m));
    layer.current = L.layerGroup().addTo(m);
    return () => map.current.remove();
  }, []);

  useEffect(() => {
    let dead = false;
    const g = layer.current; g.clearLayers();
    const ids = day.stops;
    let bounds = L.latLngBounds(ids.map((id) => [STOPS[id].lat, STOPS[id].lng]));
    if (bounds.getNorthEast().equals(bounds.getSouthWest())) bounds = bounds.pad(0.02);
    ids.forEach((id, i) => {
      const s = STOPS[id];
      L.marker([s.lat, s.lng], { icon: pin(s, pick(s.name, lang), i + 1, focus === id), zIndexOffset: focus === id ? 1000 : 0, riseOnHover: true })
        .on('click', () => onSelectStop(id)).addTo(g);
    });
    if (ids.length === 1) map.current.setView([STOPS[ids[0]].lat, STOPS[ids[0]].lng], 10, { animate: true });
    else fit(bounds);
    ids.slice(0, -1).forEach(async (id, i) => {
      const r = await getRoute(STOPS[id], STOPS[ids[i + 1]]);
      if (dead) return;
      const on = activeLeg === i;
      const pane = (c) => ({ lineCap: 'round', lineJoin: 'round', ...c });
      const layers = [
        L.polyline(r.coords, pane({ color: '#ffffff', weight: on ? 16 : 13, opacity: 0.95 })),
        L.polyline(r.coords, pane({ color: on ? '#2f7bff' : '#6aaeff', weight: on ? 10 : 8, opacity: 1 })),
        L.polyline(r.coords, pane({ color: '#ffffff', weight: 3, opacity: 0.95, className: 'route-flow', dashArray: r.estimated ? '2 10' : '1 14' })),
      ];
      layers.forEach((l) => { l.addTo(g); l.on('click', () => onSelectLeg(i)); });
      if (!r.estimated && ids.length > 1) { bounds = bounds.extend(layers[0].getBounds()); fit(bounds); }
    });
    return () => { dead = true; };
  }, [day, lang, activeLeg, focus, inset.bottom, inset.left]);

  return (
    <div className="map-full">
      <div ref={el} className="map" />
    </div>
  );
}
