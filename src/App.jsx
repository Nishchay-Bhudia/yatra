import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DAYS, STOPS } from './data/itinerary';
import { LANGS, makeT, pick, num } from './i18n';
import { useNow, toMs, fmtDate, splitDur } from './lib/time';
import { useStored } from './lib/useStored';
import MapView from './components/MapView';
import LegCard from './components/LegCard';
import StopWeather from './components/StopWeather';
import PlaceCard from './components/PlaceCard';
import Sheet, { useViewportH, visibleFor, HEAD } from './components/Sheet';

const START = toMs(DAYS[0].date, '00:00', 330);
const END = toMs(DAYS[DAYS.length - 1].date, '23:59', 345);

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
  const H = useViewportH();
  const todayIdx = DAYS.findIndex((d) => now >= toMs(d.date, '00:00', 330) && now < toMs(d.date, '00:00', 330) + 864e5);
  const [dayIdx, setDayIdx] = useState(Math.max(0, todayIdx));
  const [leg, setLeg] = useState(0);
  const [tab, setTab] = useState('journey');
  const [snap, setSnap] = useState('half');
  const day = DAYS[dayIdx];
  const [focus, setFocus] = useState(day.stops[0]);
  const legs = day.stops.slice(0, -1).map((id, i) => [id, day.stops[i + 1]]);
  const cd = splitDur(START - now);
  const before = now < START, after = now > END;

  const pickDay = (i) => { setDayIdx(i); setLeg(0); setFocus(DAYS[i].stops[0]); };
  const pickStop = (id) => { setFocus(id); setTab('story'); if (snap === 'peek') setSnap('half'); };
  const inset = desktop ? { top: 120, bottom: 0, left: 460 } : { top: 130, bottom: visibleFor(H)[snap], left: 0 };

  const header = (
    <>
      <div className="dt">
        <span className="dt-emoji">{day.emoji}</span>
        <div className="dt-text"><small>{fmtDate(day.date, lang)} · {t('day')} {num(dayIdx + 1, lang)}/{num(DAYS.length, lang)}</small><h2>{pick(day.title, lang)}</h2></div>
      </div>
      <div className="seg" role="tablist" onPointerDown={(e) => e.stopPropagation()}>
        {[['journey', '🚐', 'tabJourney'], ['weather', '🌤️', 'tabWeather'], ['story', '🪷', 'tabStory']].map(([k, e, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); if (snap === 'peek') setSnap('half'); }}>
            {tab === k && <motion.span layoutId="seg-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span>{e} {t(l)}</span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="app">
      <MapView day={day} lang={lang} activeLeg={leg} focus={focus} onSelectLeg={(i) => { setLeg(i); setTab('journey'); }} onSelectStop={pickStop} inset={inset} />

      <div className="floating">
        <div className="topbar">
          <motion.div className="brand" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <small>🙏 {t('jsn')}</small><b>{t('appName')}</b>
          </motion.div>
          <div className="langs" role="group">
            {LANGS.map((l) => (
              <button key={l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>
                {lang === l.id && <motion.span layoutId="lang-pill" className="pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}<span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>
        <nav className="days" aria-label="days">
          {DAYS.map((d, i) => (
            <button key={d.date} className={`day ${i === dayIdx ? 'on' : ''} ${i === todayIdx ? 'today' : ''}`} onClick={() => pickDay(i)}>
              {i === dayIdx && <motion.span layoutId="day-pill" className="pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className="day-in"><b>{num(d.date.slice(8), lang)}</b><span>{d.emoji}</span></span>
            </button>
          ))}
        </nav>
      </div>

      <Sheet desktop={desktop} snap={snap} setSnap={setSnap} H={H} header={header}>
        <AnimatePresence mode="wait">
          <motion.div key={day.date + tab + (tab === 'story' ? focus : '')} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === 'journey' && (
              <>
                <div className="banner">
                  {before ? <>⏳ {t('startsIn')} <b>{num(cd.d, lang)}{t('d')} {num(cd.h, lang)}{t('h')} {num(cd.m, lang)}{t('m')}</b></>
                    : after ? t('yatraDone') : <>🙏 {t('todayIsDay')} {num(Math.max(todayIdx, 0) + 1, lang)}</>}
                </div>
                <p className="event">{pick(day.event, lang)}</p>
                {legs.length === 0 && <div className="card stay">🏕️ {t('stayDay')}</div>}
                {legs.map(([a, b], i) => <LegCard key={`${day.date}${a}${b}`} legIdx={i} fromId={a} toId={b} day={day} lang={lang} t={t} now={now} active={leg === i} onSelect={() => setLeg(i)} />)}
              </>
            )}
            {tab === 'weather' && <div className="stops">{[...new Set(day.stops)].map((id, i) => <StopWeather key={id} id={id} date={day.date} lang={lang} t={t} i={i} />)}</div>}
            {tab === 'story' && (
              <>
                <div className="chips">{[...new Set(day.stops)].map((id) => <button key={id} className={`chip ${focus === id ? 'on' : ''}`} onClick={() => setFocus(id)}>{STOPS[id].emoji} {pick(STOPS[id].name, lang).split('·')[0]}</button>)}</div>
                <PlaceCard id={focus} lang={lang} t={t} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <footer>{t('footer')}</footer>
      </Sheet>
    </div>
  );
}
