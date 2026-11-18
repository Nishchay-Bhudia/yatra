import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DAYS, STOPS } from './data/itinerary';
import { LANGS, makeT, pick, num } from './i18n';
import { useNow, toMs, fmtDate, splitDur } from './lib/time';
import { useStored } from './lib/useStored';
import MapView from './components/MapView';
import LegCard from './components/LegCard';
import StopWeather from './components/StopWeather';

const START = toMs(DAYS[0].date, '00:00', 330);
const END = toMs(DAYS[DAYS.length - 1].date, '23:59', 345);

export default function App() {
  const [lang, setLang] = useStored('lang', 'gu');
  const t = useMemo(() => makeT(lang), [lang]);
  const now = useNow(1000);
  const todayIdx = DAYS.findIndex((d) => now >= toMs(d.date, '00:00', 330) && now < toMs(d.date, '00:00', 330) + 864e5);
  const [dayIdx, setDayIdx] = useState(Math.max(0, todayIdx));
  const [leg, setLeg] = useState(0);
  const day = DAYS[dayIdx];
  const legs = day.stops.slice(0, -1).map((id, i) => [id, day.stops[i + 1]]);
  const before = now < START, after = now > END;
  const cd = splitDur(START - now);

  return (
    <div className="app">
      <div className="sky" aria-hidden>
        <motion.div className="sun" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 60, ease: 'linear' }}>☀️</motion.div>
        {[0, 1, 2, 3].map((i) => <motion.div key={i} className="cloud" style={{ top: `${6 + i * 14}%`, fontSize: 40 + i * 14 }} animate={{ x: ['-20vw', '120vw'] }} transition={{ repeat: Infinity, duration: 70 + i * 25, ease: 'linear', delay: -i * 18 }}>☁️</motion.div>)}
      </div>

      <header className="top">
        <motion.h1 initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring' }}>
          <span className="jsn">🙏 {t('jsn')}</span>
          <span className="brand">{t('appName')}<motion.span className="brand-ic" animate={{ x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>🚐💨</motion.span></span>
        </motion.h1>
        <div className="langs" role="group">
          {LANGS.map((l) => (
            <button key={l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>
              {lang === l.id && <motion.span layoutId="lang-pill" className="pill" />}<span>{l.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main>
        <motion.div className="card hero" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <p className="tag">{t('tagline')}</p>
          {before ? (
            <div className="hero-cd"><small>{t('startsIn')}</small>
              <div className="cd-digits big">
                <i><b>{num(cd.d, lang)}</b>{t('d')}</i><i><b>{num(String(cd.h).padStart(2, '0'), lang)}</b>{t('h')}</i>
                <i><b>{num(String(cd.m).padStart(2, '0'), lang)}</b>{t('m')}</i><i><b>{num(String(cd.s).padStart(2, '0'), lang)}</b>{t('s')}</i>
              </div></div>
          ) : after ? <div className="hero-cd"><b className="cd-done">{t('yatraDone')}</b></div>
            : <div className="hero-cd"><b className="cd-done">{t('todayIsDay')} {num(Math.max(todayIdx, 0) + 1, lang)} / {num(DAYS.length, lang)}</b></div>}
        </motion.div>

        <nav className="days" aria-label="days">
          {DAYS.map((d, i) => (
            <button key={d.date} className={`day ${i === dayIdx ? 'on' : ''} ${i === todayIdx ? 'today' : ''}`} onClick={() => { setDayIdx(i); setLeg(0); }}>
              {i === dayIdx && <motion.span layoutId="day-pill" className="pill" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <span className="day-in"><em>{t('day')} {num(i + 1, lang)}</em><b>{num(d.date.slice(8), lang)}</b><span>{d.emoji}</span></span>
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div key={day.date} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
            <div className="card day-title">
              <div className="dt-emoji">{day.emoji}</div>
              <div><small>{fmtDate(day.date, lang)}</small><h2>{pick(day.title, lang)}</h2><p>{pick(day.event, lang)}</p></div>
            </div>

            <div className="layout">
              <div className="col">
                <h3 className="sec">🌤️ {t('weatherAt')} · {t('stops')}</h3>
                <div className="stops">{[...new Set(day.stops)].map((id, i) => <StopWeather key={id} id={id} date={day.date} lang={lang} t={t} i={i} />)}</div>
                {legs.length === 0 && <div className="card stay">🏕️ {t('stayDay')}</div>}
                {legs.map(([a, b], i) => <LegCard key={`${day.date}${a}${b}`} legIdx={i} fromId={a} toId={b} day={day} lang={lang} t={t} now={now} active={leg === i} onSelect={() => setLeg(i)} />)}
              </div>
              <aside className="col sticky">
                <h3 className="sec">🗺️ {t('map')}</h3>
                <MapView day={day} lang={lang} activeLeg={leg} onSelectLeg={setLeg} />
              </aside>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer>{t('footer')}</footer>
    </div>
  );
}
