import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { DAYS, STOPS } from './data/itinerary';
import { LANGS, makeT, pick } from './i18n';
import { useNow } from './lib/time';
import { useStored } from './lib/useStored';
import MapView from './components/MapView';
import LegCard from './components/LegCard';
import StopCard from './components/StopCard';

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
  const drag = useDragControls();
  useEffect(() => { const id = setTimeout(() => setHint(false), 7000); return () => clearTimeout(id); }, []);
  useEffect(() => { if (sel) setHint(false); }, [sel]);

  const H = typeof window === 'undefined' ? 800 : window.innerHeight;
  const inset = { top: 70, left: 0, right: sel && desktop ? 440 : 0, bottom: sel && !desktop ? Math.min(H * 0.52, 420) : 0 };
  const leg = sel?.type === 'leg' ? LEGS.find((l) => l.id === sel.id) : null;

  return (
    <div className="app">
      <MapView legs={LEGS} firstDay={FIRST_DAY} lang={lang} sel={sel} onSelect={setSel} inset={inset} />

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

      <AnimatePresence>{hint && !sel && <motion.div className="hint" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>👆 {t('pickStop')}</motion.div>}</AnimatePresence>

      <AnimatePresence mode="wait">
        {sel && (
          <motion.div key={sel.id} className="pop" initial={desktop ? { x: 60, opacity: 0 } : { y: 80, opacity: 0 }} animate={{ x: 0, y: 0, opacity: 1 }} exit={desktop ? { x: 60, opacity: 0 } : { y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag={desktop ? false : 'y'} dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 90 || i.velocity.y > 500) && setSel(null)}>
            <div className="pop-top" onPointerDown={(e) => !desktop && drag.start(e)}>
              <div className="grab" /><button className="x" onClick={() => setSel(null)} aria-label="close">✕</button>
            </div>
            <div className="pop-body">
              {leg ? <LegCard key={leg.id} legIdx={leg.idx} fromId={leg.a} toId={leg.b} day={leg.day} lang={lang} t={t} now={now} />
                : <StopCard id={sel.id} dates={STOP_DATES[sel.id]} lang={lang} t={t} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
