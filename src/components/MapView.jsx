import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRoute, getElevation, classifyTerrain, TERRAIN } from '../lib/api';
import { STOPS } from '../data/itinerary';
import { pick } from '../i18n';
import { fmtDur } from '../lib/time';
import { BASES } from '../lib/maps';
import { getVia, viaKey } from '../lib/geo';

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const pin = (s, name, badge, on, done, delay, edit) => L.divIcon({
  className: 'pin3d-wrap', iconSize: [140, 110], iconAnchor: [70, 32],
  html: `<div class="pin3d ${on ? 'on' : ''} ${done ? 'done' : ''} ${edit ? 'edit' : ''} ${delay != null ? 'intro' : ''}" style="--d:${delay || 0}ms"><i class="halo"></i><div class="orb"><span>${s.emoji}</span></div><b class="num">${done ? '✓' : badge}</b><div class="plabel">${esc(name)}</div></div>`,
});
const arrow = (ang, done) => L.divIcon({
  className: 'arrow-ic', iconSize: [24, 24], iconAnchor: [12, 12],
  html: `<svg viewBox="0 0 24 24" width="24" height="24" style="transform:rotate(${ang}deg)"><path d="M5 18 L12 5 L19 18 L12 14 Z" fill="${done ? '#b9c7d8' : '#fff'}" stroke="${done ? '#7f93ab' : '#2f7bff'}" stroke-width="2" stroke-linejoin="round"/></svg>`,
});
const dense = (c) => { if (c.length > 4) return c; const o = []; for (let i = 0; i <= 14; i++) o.push([c[0][0] + (c[1][0] - c[0][0]) * i / 14, c[0][1] + (c[1][1] - c[0][1]) * i / 14]); return o; };

export default function MapView({ legs, firstDay, lang, t, sel, onSelect, inset, base, onBaseFail, me, locateTick, visited, doneLegs, editing, geoVer, onMoveStop, onMoveVia, onMap }) {
  const el = useRef(null), map = useRef(null), markers = useRef({}), polys = useRef({}), tiles = useRef(null), arrows = useRef(null), chips = useRef(null), viaLayer = useRef(null), gen = useRef(0);
  const [routes, setRoutes] = useState({});
  const [adj, setAdj] = useState({});
  const ref = useRef({}); ref.current = { inset, sel, visited, doneLegs, routes, lang, editing, onMoveStop, onMoveVia };
  const visKey = Object.keys(visited).filter((k) => visited[k]).join(), doneKey = [...doneLegs].join();

  const pad = () => { const i = ref.current.inset; return { paddingTopLeft: [i.left + 36, i.top + 36], paddingBottomRight: [i.right + 36, i.bottom + 36] }; };
  const fitAll = () => map.current.fitBounds(L.latLngBounds(Object.values(STOPS).map((s) => [s.lat, s.lng])), { ...pad(), animate: true, duration: 1.2, maxZoom: 8 });

  const drawArrows = () => {
    const m = map.current; if (!m || !arrows.current) return;
    arrows.current.clearLayers();
    const view = m.getBounds().pad(0.15);
    legs.forEach((l) => {
      const r = ref.current.routes[l.id]; if (!r) return;
      const c = dense(r.coords), pts = c.map((x) => m.latLngToLayerPoint(x)), done = ref.current.doneLegs.has(l.id);
      let acc = 70;
      for (let i = 1; i < pts.length; i++) {
        acc += pts[i].distanceTo(pts[i - 1]);
        if (acc >= 150) {
          acc = 0;
          if (!view.contains(c[i])) continue;
          const q = pts[Math.max(0, i - 3)], d = pts[i];
          L.marker(c[i], { icon: arrow((Math.atan2(d.x - q.x, -(d.y - q.y)) * 180) / Math.PI, done), interactive: false, pane: 'arrows', keyboard: false }).addTo(arrows.current);
        }
      }
    });
  };

  const drawChips = () => {
    if (!chips.current) return; chips.current.clearLayers();
    const z = map.current.getZoom(), sl = ref.current.sel;
    legs.forEach((l) => {
      const r = ref.current.routes[l.id]; if (!r) return;
      if (z < 8.5 && !(sl?.type === 'leg' && sl.id === l.id)) return;
      const mid = r.coords[Math.floor(r.coords.length / 2)];
      const min = adj[l.id] ?? r.min;
      L.marker(mid, { icon: L.divIcon({ className: 'eta-ic', iconSize: [0, 0], html: `<div class="etachip ${ref.current.doneLegs.has(l.id) ? 'done' : ''}">🚗 ${fmtDur(min, lang, t)}</div>` }), zIndexOffset: 400 })
        .on('click', () => onSelect({ type: 'leg', id: l.id })).addTo(chips.current);
    });
  };

  useEffect(() => {
    const m = (map.current = L.map(el.current, { zoomControl: false, attributionControl: false, zoomSnap: 0.25 }));
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(m);
    m.setView([27.6, 82.6], 6);
    tiles.current = L.layerGroup().addTo(m);
    m.createPane('arrows').style.zIndex = 450; m.getPane('arrows').style.pointerEvents = 'none';
    arrows.current = L.layerGroup().addTo(m);
    chips.current = L.layerGroup().addTo(m);
    viaLayer.current = L.layerGroup().addTo(m);
    Object.entries(STOPS).forEach(([id, s], i) => {
      markers.current[id] = L.marker([s.lat, s.lng], { icon: pin(s, pick(s.name, ref.current.lang), firstDay[id], false, false, 300 + i * 140), riseOnHover: true, draggable: false })
        .on('click', () => onSelect({ type: 'stop', id }))
        .on('dragend', (e) => { const p = e.target.getLatLng(); ref.current.onMoveStop(id, p.lat, p.lng); }).addTo(m);
    });
    m.on('click', () => { if (!ref.current.editing) onSelect(null); });
    m.on('moveend zoomend', drawArrows); m.on('zoomend', () => drawChips());
    onMap?.(m);
    fitAll();
    return () => m.remove();
  }, []);

  useEffect(() => {
    tiles.current.clearLayers();
    let errs = 0;
    BASES[base].forEach((b) => { const tl = L.tileLayer(b.url, b.o).addTo(tiles.current).setZIndex(1); tl.on('tileerror', () => { if (++errs === 6 && base !== 'map') onBaseFail(); }); });
  }, [base]);

  // (re)load routes — runs on mount and whenever a pin / via point is edited
  const first = useRef(true);
  useEffect(() => {
    const g = ++gen.current;
    if (!first.current) {
      Object.entries(STOPS).forEach(([id, s]) => markers.current[id].setLatLng([s.lat, s.lng]));
      Object.values(polys.current).forEach((p) => p.forEach((x) => x.remove()));
      polys.current = {}; setRoutes({}); setAdj({});
    }
    first.current = false;
    legs.forEach((l) => getRoute(STOPS[l.a], STOPS[l.b], getVia(l.a, l.b)).then((r) => {
      if (g !== gen.current) return;
      setRoutes((o) => ({ ...o, [l.id]: r }));
      getElevation(r.coords).then((e) => g === gen.current && setAdj((o) => ({ ...o, [l.id]: r.min * TERRAIN[classifyTerrain(e)].factor }))).catch(() => {});
    }));
  }, [geoVer]);

  const meLayer = useRef(null);
  useEffect(() => {
    const m = map.current; if (!m) return;
    if (!meLayer.current) meLayer.current = L.layerGroup().addTo(m);
    meLayer.current.clearLayers();
    if (!me) return;
    L.circle([me.lat, me.lng], { radius: Math.min(me.acc || 50, 2000), stroke: false, fillColor: '#2f7bff', fillOpacity: 0.12, interactive: false }).addTo(meLayer.current);
    L.marker([me.lat, me.lng], { icon: L.divIcon({ className: 'me-ic', iconSize: [0, 0], html: '<div class="me-dot"><i></i></div>' }), zIndexOffset: 2000, interactive: false }).addTo(meLayer.current);
  }, [me]);
  useEffect(() => { if (locateTick && me) map.current.flyTo([me.lat, me.lng], Math.max(map.current.getZoom(), 12), { duration: 1.2 }); }, [locateTick]);

  const styleRoutes = () => {
    const { sel: s, doneLegs: dl } = ref.current;
    legs.forEach((l) => {
      const p = polys.current[l.id]; if (!p) return;
      const on = s?.type === 'leg' && s.id === l.id, dim = s?.type === 'leg' && !on, done = dl.has(l.id);
      p[0].setStyle({ weight: on ? 18 : 14, opacity: dim ? 0.5 : 0.95 });
      p[1].setStyle({ color: on ? '#ff7a3d' : done ? '#9fb3c8' : '#2f7bff', weight: on ? 11 : 8, opacity: dim ? 0.55 : 1 });
      if (on) p.forEach((x) => x.bringToFront());
    });
  };

  useEffect(() => {
    const m = map.current;
    legs.forEach((l, k) => {
      const r = routes[l.id]; if (!r || polys.current[l.id]) return;
      const st = { lineCap: 'round', lineJoin: 'round', bubblingMouseEvents: false };
      const casing = L.polyline(r.coords, { ...st, color: '#fff', weight: 14, opacity: 0.95 });
      const main = L.polyline(r.coords, { ...st, color: '#2f7bff', weight: 8, dashArray: r.estimated ? '6 10' : null });
      [casing, main].forEach((p) => { p.addTo(m); p.on('click', () => onSelect({ type: 'leg', id: l.id })); });
      polys.current[l.id] = [casing, main];
      const path = main.getElement();
      if (path?.getTotalLength && !r.estimated) {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
        setTimeout(() => { path.style.transition = 'stroke-dashoffset 1.6s ease'; path.style.strokeDashoffset = 0; }, 400 + k * 200);
        setTimeout(() => { path.style.strokeDasharray = 'none'; path.style.transition = 'none'; }, 2200 + k * 200);
      }
    });
    Object.values(markers.current).forEach((mk) => mk.bringToFront?.());
    styleRoutes(); drawArrows();
  }, [routes]);
  useEffect(() => { drawChips(); }, [routes, adj, lang, doneKey, sel]);

  // pins: icons, draggable in edit mode
  useEffect(() => {
    Object.entries(STOPS).forEach(([id, s]) => {
      const mk = markers.current[id];
      mk.setIcon(pin(s, pick(s.name, lang), firstDay[id], sel?.type === 'stop' && sel.id === id, !!visited[id], null, editing)).setZIndexOffset(sel?.id === id ? 1000 : 0);
      editing ? mk.dragging.enable() : mk.dragging.disable();
    });
    styleRoutes(); drawArrows();
  }, [sel, lang, visKey, doneKey, editing]);

  // via points of the selected leg (edit mode)
  useEffect(() => {
    const g = viaLayer.current; g.clearLayers();
    if (!editing || sel?.type !== 'leg') return;
    const l = legs.find((x) => x.id === sel.id); if (!l) return;
    getVia(l.a, l.b).forEach((v, i) => {
      L.marker(v, { draggable: true, zIndexOffset: 1500, icon: L.divIcon({ className: 'via-ic', iconSize: [28, 28], iconAnchor: [14, 14], html: `<div class="via-dot">${i + 1}</div>` }) })
        .on('dragend', (e) => { const p = e.target.getLatLng(); ref.current.onMoveVia(viaKey(l.a, l.b), i, p.lat, p.lng); }).addTo(g);
    });
  }, [sel, editing, geoVer]);

  useEffect(() => {
    const m = map.current;
    if (!sel) { fitAll(); return; }
    if (sel.type === 'stop') { const s = STOPS[sel.id]; m.flyToBounds(L.latLng(s.lat, s.lng).toBounds(editing ? 4000 : 45000), { ...pad(), duration: 1.1 }); }
    else { const r = routes[sel.id]; const l = legs.find((x) => x.id === sel.id); const b = r ? L.latLngBounds(r.coords) : L.latLngBounds([[STOPS[l.a].lat, STOPS[l.a].lng], [STOPS[l.b].lat, STOPS[l.b].lng]]); m.flyToBounds(b, { ...pad(), duration: 1.1, maxZoom: 11 }); }
  }, [sel?.type, sel?.id, inset.bottom, inset.right]);

  return <div className={`map-full base-${base}`}><div ref={el} className="map" /></div>;
}
