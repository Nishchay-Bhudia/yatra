import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { DAYS, STOPS } from './data/itinerary';
import { LANGS, makeT, pick } from './i18n';
import { useNow, toMs } from './lib/time';
import { ORDER, ICON } from './lib/maps';
import { useStored } from './lib/useStored';
import MapView from './components/MapView';
import LegCard from './components/LegCard';
import StopCard from './components/StopCard';
import Itinerary from './components/Itinerary';
import CapturePanel from './components/CapturePanel';
import { useGeo, setStop, setVia, getVia } from './lib/geo';

const LEGS = [], STOP_DATES = {}, FIRST_DAY = {};
DAYS.forEach((day, di) => {
  day.stops.forEach((id) => {
    (STOP_DATES[id] ||= []);
    if (!STOP_DATES[id].some((d) => d.date === day.date)) STOP_DATES[id].push({ date: day.date, di });
    FIRST_DAY[id] ||= Number(day.date.slice(8));
  });
  day.stops.slice(0, -1).forEach((a, i) => LEGS.push({ id: `${day.date}:${a}>${day.stops[i + 1]}`, a, b: day.stops[i + 1], day, idx: i }));
});

function useDesktop() {
  const q = '(min-width: 900px)';
  const [d, setD] = useState(() => window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q); const f = () => setD(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return d;
}

export default function App() {
  const [lang, setLang] = useStored('lang', 'gu');
  const t = useMemo(() => makeT(lang), [lang]);
  const now = useNow(1000);
  const desktop = useDesktop();
  const [sel, setSel] = useState(null);
  const [hint, setHint] = useState(true);
  const [baseRaw, setBase] = useStored('base', 'map');
  const base = ORDER.includes(baseRaw) ? baseRaw : 'map';
  const [me, setMe] = useState(null);
  const [locTick, setLocTick] = useState(0);
  const [locMsg, setLocMsg] = useState('');
  const watch = useRef(null);
  const startWatch = (silent) => {
    if (!navigator.geolocation) { if (!silent) setLocMsg(t('locFail')); return; }
    if (watch.current != null) return;
    watch.current = navigator.geolocation.watchPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => { navigator.geolocation.clearWatch(watch.current); watch.current = null; if (!silent) { setLocMsg(t('locFail')); setTimeout(() => setLocMsg(''), 4000); } },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
  };
  const locate = () => { startWatch(false); setLocTick((n) => n + 1); };
  useEffect(() => { startWatch(true); }, []); // ask for location on first load
  const [manual, setManual] = useStored('visited', {});
  const drag = useDragControls();
  const geoVer = useGeo();
  const [editing, setEditing] = useState(false);
  const [showItin, setShowItin] = useState(false);
  const mapRef = useRef(null);
  const insetE = { right: desktop ? 440 : 0, bottom: desktop ? 0 : 340 };
  const getCenter = () => {
    const m = mapRef.current; if (!m) return null;
    const sz = m.getSize(); const p = m.containerPointToLatLng([(sz.x - insetE.right) / 2, (sz.y - insetE.bottom + 70) / 2]);
    return { lat: p.lat, lng: p.lng };
  };
  const stopIds = Object.keys(STOPS);
  useEffect(() => { const id = setTimeout(() => setHint(false), 7000); return () => clearTimeout(id); }, []);
  useEffect(() => { if (sel) setHint(false); }, [sel]);

  const visited = {};
  Object.keys(STOPS).forEach((id) => { const f = STOP_DATES[id][0].date; const auto = toMs(f, '23:59', STOPS[id].tz) < now; visited[id] = manual[id] ?? auto; });
  const doneLegs = new Set(LEGS.filter((l) => toMs(l.day.date, '23:59', STOPS[l.b].tz) < now).map((l) => l.id));
  const H = typeof window === 'undefined' ? 800 : window.innerHeight;
  const inset = editing ? { top: 70, left: 0, ...insetE } : { top: 70, left: 0, right: sel && desktop ? 440 : 0, bottom: sel && !desktop ? Math.min(H * 0.52, 420) : 0 };
  const leg = sel?.type === 'leg' ? LEGS.find((l) => l.id === sel.id) : null;

  return (
    <div className="app">
      <MapView legs={LEGS} firstDay={FIRST_DAY} lang={lang} t={t} sel={sel} onSelect={setSel} inset={inset} base={base} onBaseFail={() => setBase('map')} me={me} locateTick={locTick} visited={visited} doneLegs={doneLegs} editing={editing} geoVer={geoVer} onMap={(m) => (mapRef.current = m)}
        onMoveStop={(id, la, ln) => setStop(id, la, ln)}
        onMoveVia={(key, i, la, ln) => { const [a, b] = key.split('>'); const cur = getVia(a, b).map((v) => [...v]); cur[i] = [la, ln]; setVia(a, b, cur); }} />

      <div className="floating">
        <motion.div className="brand" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}><span>🙏</span><b>{t('appName')}</b></motion.div>
        <div className="langs" role="group">
          {LANGS.map((l) => (
            <button key={l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)} aria-label={l.label}>
              {lang === l.id && <motion.span layoutId="lang-pill" className="pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span>{{ gu: 'ગુ', en: 'EN', hi: 'हि' }[l.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <button className="layerbtn" onClick={() => setBase(ORDER[(ORDER.indexOf(base) + 1) % ORDER.length])} aria-label="map style">{ICON[base]}</button>
      <button className={`layerbtn locbtn ${me ? 'on' : ''}`} onClick={locate} aria-label={t('whereAmI')}>📍</button>
      <button className="layerbtn itinbtn" onClick={() => { setSel(null); setEditing(false); setShowItin(true); }} aria-label={t('itinT')}>📋</button>
      <button className={`layerbtn editbtn ${editing ? 'on' : ''}`} onClick={() => { setShowItin(false); setSel(null); setEditing(!editing); }} aria-label={t('editPins')}>✏️</button>
      {editing && <div className="crosshair" style={{ left: `calc(50% - ${insetE.right / 2}px)`, top: `calc(50% - ${(insetE.bottom - 70) / 2}px)` }}><i /><b /></div>}
      <AnimatePresence>{locMsg && <motion.div className="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{locMsg}</motion.div>}</AnimatePresence>
      <AnimatePresence>{hint && !sel && !editing && !showItin && <motion.div className="hint" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>👆 {t('pickStop')}</motion.div>}</AnimatePresence>

      <AnimatePresence>{showItin && <Itinerary key="itin" days={DAYS} legs={LEGS} lang={lang} t={t} visited={visited} onClose={() => setShowItin(false)} onShow={(id) => { setShowItin(false); setSel({ type: 'stop', id }); }} />}</AnimatePresence>
      <AnimatePresence>{editing && <CapturePanel key="cap" t={t} lang={lang} sel={sel} setSel={setSel} stopIds={stopIds} legs={LEGS} me={me} getCenter={getCenter} onDone={() => { setEditing(false); setSel(null); }} />}</AnimatePresence>

      <AnimatePresence mode="wait">
        {sel && !editing && (
          <motion.div key={sel.id} className="pop" initial={desktop ? { x: 60, opacity: 0 } : { y: 80, opacity: 0 }} animate={{ x: 0, y: 0, opacity: 1 }} exit={desktop ? { x: 60, opacity: 0 } : { y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag={desktop ? false : 'y'} dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 90 || i.velocity.y > 500) && setSel(null)}>
            <div className="pop-top" onPointerDown={(e) => !desktop && drag.start(e)}>
              <div className="grab" /><button className="x" onClick={() => setSel(null)} aria-label="close">✕</button>
            </div>
            <div className="pop-body">
              {leg ? <LegCard key={leg.id} legIdx={leg.idx} fromId={leg.a} toId={leg.b} day={leg.day} lang={lang} t={t} now={now} />
                : <StopCard id={sel.id} dates={STOP_DATES[sel.id]} lang={lang} t={t} now={now} visited={visited[sel.id]} onToggle={() => setManual({ ...manual, [sel.id]: !visited[sel.id] })} me={me} nextLegs={LEGS.filter((l) => l.a === sel.id)} onOpenLeg={(id) => setSel({ type: 'leg', id })} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
