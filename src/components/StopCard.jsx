import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { STOPS } from '../data/itinerary';
import { PLACES, HINDU } from '../data/places';
import { pick, num } from '../i18n';
import { getWeather, weatherFor, wmo, haversineKm } from '../lib/api';
import { fmtDate, toMs } from '../lib/time';

export default function StopCard({ id, dates, lang, t, now, visited, onToggle, nextLegs, onOpenLeg, me }) {
  const s = STOPS[id], p = PLACES[id];
  const [di, setDi] = useState(0);
  const [wx, setWx] = useState(undefined);
  const [more, setMore] = useState(false);
  useEffect(() => { setDi(0); setMore(false); }, [id]);
  useEffect(() => { let d = false; setWx(undefined); getWeather(s).then((w) => !d && setWx(w)).catch(() => !d && setWx(null)); return () => { d = true; }; }, [id]);
  const date = dates[di]?.date;
  const w = wx && date ? weatherFor(wx, date) : null;
  const m = w ? wmo(w.code) : null;
  return (
    <div className="stopcard">
      <div className="sc-head">
        <motion.span className="sc-emoji" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }}>{s.emoji}</motion.span>
        <div><h3>{pick(s.name, lang)}</h3>
          <div className="chips">{dates.map((d, i) => <button key={d.date} className={`chip ${i === di ? 'on' : ''}`} onClick={() => setDi(i)}>{toMs(d.date, '23:59', s.tz) < now ? '✓ ' : ''}{fmtDate(d.date, lang)}</button>)}</div>
        </div>
      </div>
      <div className="wxrow">
        {wx === undefined ? <span className="note">{t('loading')}</span> : !w ? <span className="note">{t('noForecast')}</span> : (
          <>
            <motion.span className="wx-big" animate={{ y: [0, -5, 0], rotate: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 3.4 }}>{m.e}</motion.span>
            <b className="temp">{num(Math.round(w.max), lang)}°<small>/{num(Math.round(w.min), lang)}°</small></b>
            <span className="mini">💧 {num(Math.round(w.pop ?? 0), lang)}%</span>
            <span className="mini">💨 {num(Math.round(w.wind), lang)}</span>
            <span className="mini">🌅 {num(w.sunrise, lang)}</span>
          </>
        )}
      </div>
      {me && <p className="away">📍 {num(Math.round(haversineKm(me, s)), lang)} {t('km')} {t('away')}</p>}
      <div className="actions">
        <button className={`vbtn ${visited ? 'on' : ''}`} onClick={onToggle}>{visited ? t('visitedT') : '○ ' + t('markVisited')}</button>
        {nextLegs.map((l) => <button key={l.id} className="chip live" onClick={() => onOpenLeg(l.id)}>🚗 ➜ {pick(STOPS[l.b].name, lang).split('·')[0]}</button>)}
      </div>
      {p && <p className="about">{pick(p.about, lang)}</p>}
      {p && (
        <>
          <button className="morebtn" onClick={() => setMore(!more)}>🪷 {t('mahima')} {more ? '▴' : '▾'}</button>
          {more && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="more">
              {HINDU[id] && <div className="hd"><h5>🕉️ {t('hinduT')}</h5><p>{pick(HINDU[id], lang)}</p></div>}
              <div className="nk"><h5>🪷 {t('nilkanthT')}</h5><p>{pick(p.nilkanth, lang)}</p></div>
              <ul>{(p.facts[lang] || p.facts.en).map((f, i) => <li key={i}>🎈 {f}</li>)}</ul>
              <p className="note">{t('disclaimer')}</p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
