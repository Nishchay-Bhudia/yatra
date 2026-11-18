import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRoute } from '../lib/api';
import { STOPS } from '../data/itinerary';
import { pick } from '../i18n';

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const pin = (s, name, badge, on, delay) => L.divIcon({
  className: 'pin3d-wrap', iconSize: [140, 110], iconAnchor: [70, 32],
  html: `<div class="pin3d ${on ? 'on' : ''} ${delay != null ? 'intro' : ''}" style="--d:${delay || 0}ms"><i class="halo"></i><i class="halo h2"></i><div class="orb"><span>${s.emoji}</span></div><b class="num">${badge}</b><div class="plabel">${esc(name)}</div></div>`,
});

export default function MapView({ legs, firstDay, lang, sel, onSelect, inset }) {
  const el = useRef(null), map = useRef(null), markers = useRef({}), polys = useRef({});
  const [routes, setRoutes] = useState({});
  const insetRef = useRef(inset); insetRef.current = inset;
  const selRef = useRef(sel); selRef.current = sel;

  const pad = () => { const i = insetRef.current; return { paddingTopLeft: [i.left + 36, i.top + 36], paddingBottomRight: [i.right + 36, i.bottom + 36] }; };
  const fitAll = () => map.current.fitBounds(L.latLngBounds(Object.values(STOPS).map((s) => [s.lat, s.lng])), { ...pad(), animate: true, duration: 1.2, maxZoom: 8 });

  // init map, panes, markers
  useEffect(() => {
    const m = (map.current = L.map(el.current, { zoomControl: false, attributionControl: false, zoomSnap: 0.25 }));
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(m);
    m.setView([27.6, 82.6], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 18, subdomains: 'abcd', attribution: '© OpenStreetMap · © CARTO' }).addTo(m);
    m.createPane('shade').style.zIndex = 240;
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', { pane: 'shade', maxZoom: 13, opacity: 0.55, attribution: '© Esri' }).addTo(m);
    m.createPane('tint').style.zIndex = 250;
    L.rectangle([[-85, -180], [85, 180]], { pane: 'tint', stroke: false, fillColor: '#a9d0ff', fillOpacity: 0.85, interactive: false }).addTo(m);
    m.createPane('clouds').style.zIndex = 350; m.getPane('clouds').style.pointerEvents = 'none';
    [[27.2, 81.2, 1], [26.4, 83.2, 2], [28.4, 82.4, 3], [29.1, 84.2, 1], [28.0, 84.6, 2], [27.6, 80.6, 3], [28.9, 83.0, 2], [26.2, 82.0, 1], [27.9, 83.3, 3]].forEach(([la, ln, k]) =>
      L.marker([la, ln], { pane: 'clouds', interactive: false, icon: L.divIcon({ className: 'cloud-ic', iconSize: [0, 0], html: `<i class="cl c${k}"></i>` }) }).addTo(m));
    Object.entries(STOPS).forEach(([id, s], i) => {
      markers.current[id] = L.marker([s.lat, s.lng], { icon: pin(s, pick(s.name, lang), firstDay[id], false, 300 + i * 140), riseOnHover: true })
        .on('click', () => onSelect({ type: 'stop', id })).addTo(m);
    });
    m.on('click', () => onSelect(null));
    fitAll();
    return () => m.remove();
  }, []);

  // routes
  useEffect(() => { legs.forEach((l) => getRoute(STOPS[l.a], STOPS[l.b]).then((r) => setRoutes((o) => ({ ...o, [l.id]: r })))); }, []);
  useEffect(() => {
    const m = map.current;
    legs.forEach((l, k) => {
      const r = routes[l.id]; if (!r || polys.current[l.id]) return;
      const st = { lineCap: 'round', lineJoin: 'round', bubblingMouseEvents: false };
      const casing = L.polyline(r.coords, { ...st, color: '#fff', weight: 14, opacity: 0.95 });
      const main = L.polyline(r.coords, { ...st, color: '#6aaeff', weight: 8 });
      const flow = L.polyline(r.coords, { ...st, color: '#fff', weight: 3, className: 'route-flow', dashArray: r.estimated ? '2 10' : '1 14' });
      [casing, main, flow].forEach((p) => { p.addTo(m); p.on('click', () => onSelect({ type: 'leg', id: l.id })); });
      polys.current[l.id] = [casing, main, flow];
      const path = main.getElement();
      if (path && path.getTotalLength) {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
        setTimeout(() => { path.style.transition = 'stroke-dashoffset 1.6s ease'; path.style.strokeDashoffset = 0; }, 600 + k * 250);
        setTimeout(() => { path.style.strokeDasharray = 'none'; path.style.transition = 'none'; }, 2600 + k * 250);
      }
    });
    styleRoutes();
  }, [routes]);

  const styleRoutes = () => {
    const s = selRef.current;
    legs.forEach((l) => {
      const p = polys.current[l.id]; if (!p) return;
      const on = s?.type === 'leg' && s.id === l.id, dim = s?.type === 'leg' && !on;
      p[0].setStyle({ weight: on ? 18 : 14, opacity: dim ? 0.5 : 0.95 });
      p[1].setStyle({ color: on ? '#ff7a3d' : '#6aaeff', weight: on ? 11 : 8, opacity: dim ? 0.55 : 1 });
      if (on) p.forEach((x) => x.bringToFront());
    });
  };

  // selection: pins, route styles, camera
  useEffect(() => {
    Object.entries(STOPS).forEach(([id, s]) => markers.current[id].setIcon(pin(s, pick(s.name, lang), firstDay[id], sel?.type === 'stop' && sel.id === id, null)).setZIndexOffset(sel?.id === id ? 1000 : 0));
    styleRoutes();
    const m = map.current;
    if (!sel) { fitAll(); return; }
    if (sel.type === 'stop') { const s = STOPS[sel.id]; m.flyToBounds(L.latLng(s.lat, s.lng).toBounds(45000), { ...pad(), duration: 1.1 }); }
    else { const r = routes[sel.id]; const l = legs.find((x) => x.id === sel.id); const b = r ? L.latLngBounds(r.coords) : L.latLngBounds([[STOPS[l.a].lat, STOPS[l.a].lng], [STOPS[l.b].lat, STOPS[l.b].lng]]); m.flyToBounds(b, { ...pad(), duration: 1.1, maxZoom: 11 }); }
  }, [sel, lang, inset.bottom, inset.right]);

  return <div className="map-full"><div ref={el} className="map" /></div>;
}
