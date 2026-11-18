import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { STOPS } from '../data/itinerary';
import { pick, num } from '../i18n';
import { getWeather, weatherFor, wmo } from '../lib/api';

export default function StopWeather({ id, date, lang, t, i }) {
  const s = STOPS[id];
  const [wx, setWx] = useState(undefined);
  useEffect(() => { let d = false; getWeather(s).then((w) => !d && setWx(w)).catch(() => !d && setWx(null)); return () => { d = true; }; }, [id]);
  const w = wx ? weatherFor(wx, date) : null;
  const m = w ? wmo(w.code) : null;
  return (
    <motion.div className="card stop" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: i * 0.07 }} whileHover={{ y: -6, rotate: -1 }}>
      <div className="stop-name">{s.emoji} {pick(s.name, lang)}</div>
      {wx === undefined ? <p className="note">{t('loading')}</p> : !w ? <p className="note">{t('noForecast')}</p> : (
        <>
          <div className="stop-main">
            <motion.span className="wx-big" animate={{ y: [0, -6, 0], rotate: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 3.5 + i * 0.3 }}>{m.e}</motion.span>
            <div><b className="temp">{num(Math.round(w.max), lang)}°<small>/{num(Math.round(w.min), lang)}°</small></b><div className="desc">{t(m.k)}</div></div>
          </div>
          <div className="mini">
            <span>💧 {num(Math.round(w.pop ?? 0), lang)}%</span>
            <span>💨 {num(Math.round(w.wind), lang)} {t('km')}/h</span>
            <span>🌅 {num(w.sunrise, lang)}</span>
            <span>🌇 {num(w.sunset, lang)}</span>
          </div>
        </>
      )}
    </motion.div>
  );
}
