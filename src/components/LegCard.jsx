import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { STOPS } from '../data/itinerary';
import { pick, num } from '../i18n';
import { getRoute, getElevation, classifyTerrain, TERRAIN, getWeather, weatherFor, weatherImpact, wmo } from '../lib/api';
import { toMs, hhmm, fmtClock, fmtDur, splitDur, hourKey } from '../lib/time';
import { useStored } from '../lib/useStored';

export default function LegCard({ legIdx, fromId, toId, day, lang, t, now, active, onSelect }) {
  const from = STOPS[fromId], to = STOPS[toId];
  const id = `${day.date}:${fromId}>${toId}`;
  const [route, setRoute] = useState(null);
  const [elev, setElev] = useState(null);
  const [wx, setWx] = useState(null);
  const [showCalc, setShowCalc] = useState(false);

  const defDep = useMemo(() => {
    const [h, m] = day.defaultDepart.split(':').map(Number);
    const tot = h * 60 + m + legIdx * 180;
    return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
  }, [day, legIdx]);
  const [depTime, setDepTime] = useStored('dep:' + id, defDep);
  const [leftAt, setLeftAt] = useStored('left:' + id, null);
  const [delay, setDelay] = useStored('delay:' + id, 0);

  useEffect(() => {
    let dead = false;
    getRoute(from, to).then((r) => {
      if (dead) return; setRoute(r);
      getElevation(r.coords).then((e) => !dead && setElev(e)).catch(() => {});
    });
    getWeather(to).then((w) => !dead && setWx(w)).catch(() => {});
    return () => { dead = true; };
  }, [fromId, toId]);

  const terrainKey = classifyTerrain(elev);
  const terr = TERRAIN[terrainKey];
  const dayW = weatherFor(wx, day.date);
  const impact = weatherImpact(dayW, elev);
  const border = from.tz !== to.tz ? 45 : 0;

  const baseMin = route ? route.min : 0;
  const terrMin = baseMin * (terr.factor - 1);
  const wxMin = baseMin * (impact.factor - 1);
  const totalMin = baseMin + terrMin + wxMin + border + delay;

  const departMs = leftAt ?? toMs(day.date, depTime, from.tz);
  const etaMs = departMs + totalMin * 60000;
  const eta = fmtClock(etaMs, to.tz);
  const arrW = weatherFor(wx, eta.ymd, hourKey(etaMs, to.tz));

  let state = 'before', cd = departMs - now;
  if (now >= departMs && now < etaMs) { state = 'road'; cd = etaMs - now; }
  else if (now >= etaMs) { state = 'done'; cd = 0; }
  const progress = state === 'road' ? (now - departMs) / (etaMs - departMs) : state === 'done' ? 1 : 0;
  const cdp = splitDur(cd);

  const alerts = [...impact.alerts];
  if (border) alerts.push('a_border');
  const live = `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`;
  const w = arrW?.hour || (dayW && { temp: (dayW.max + dayW.min) / 2, code: dayW.code, pop: dayW.pop, wind: dayW.wind });
  const wi = w ? wmo(w.code) : null;

  return (
    <motion.section layout className={`card leg ${active ? 'active' : ''}`} onClick={onSelect}
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 22, delay: legIdx * 0.08 }}>
      <header className="leg-head">
        <span className="leg-from">{from.emoji} {pick(from.name, lang)}</span>
        <span className="leg-arrow">➜</span>
        <span className="leg-to">{to.emoji} {pick(to.name, lang)}</span>
      </header>

      <div className="stats">
        <div className="stat"><span className="stat-ic">🚗</span><b>{route ? fmtDur(totalMin - delay, lang, t).replace(/\d+/g, (d) => num(d, lang)) : '…'}</b><small>{t('drive')}</small></div>
        <div className="stat"><span className="stat-ic">📏</span><b>{route ? num(Math.round(route.km), lang) : '…'} {t('km')}</b><small>{t('distance')}</small></div>
        <div className="stat" style={{ background: terr.color }}><span className="stat-ic wob">{terr.emoji}</span><b>{t('t_' + terrainKey)}</b><small>{elev ? `${t('highest')} ${num(elev.max, lang)}m · ↗${num(elev.gain, lang)}m` : t('terrain')}</small></div>
        <div className="stat wx"><motion.span className="stat-ic big" animate={{ y: [0, -4, 0], rotate: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 3.2 }}>{wi ? wi.e : '⏳'}</motion.span><b>{w ? `${num(Math.round(w.temp), lang)}°C` : '—'}</b><small>{wi ? t(wi.k) : t('noForecast')}</small></div>
      </div>
      {route?.estimated && <p className="note warn">⚠️ {t('estimated')}</p>}

      <div className="eta-box">
        <div className="eta-row">
          <label className="leave">
            <span>{t('leaveAt')} <em>({from.tz === 330 ? 'IST' : 'NPT'})</em></span>
            <input type="time" value={leftAt ? hhmm(leftAt, from.tz) : depTime} onChange={(e) => { setLeftAt(null); setDepTime(e.target.value); }} onClick={(e) => e.stopPropagation()} />
          </label>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} className="btn go" onClick={(e) => { e.stopPropagation(); setLeftAt(Date.now()); }}>🚀 {t('leaveNow')}</motion.button>
          {leftAt && <button className="btn ghost" onClick={(e) => { e.stopPropagation(); setLeftAt(null); }}>↺ {t('resetLeave')}</button>}
        </div>

        <div className="eta-main">
          <div>
            <small>{t('arriveBy')} · {t('localTime')}</small>
            <div className="eta-time">{num(eta.time, lang)}<span>{eta.ap}</span></div>
          </div>
          <div className="cd">
            <small>{state === 'before' ? t('departsIn') : state === 'road' ? t('arrivingIn') : t('onTheRoad')}</small>
            {state === 'done' ? <div className="cd-done">{t('arrived')}</div> : (
              <div className="cd-digits">
                {cdp.d > 0 && <i><b>{num(cdp.d, lang)}</b>{t('d')}</i>}
                <i><b>{num(String(cdp.h).padStart(2, '0'), lang)}</b>{t('h')}</i>
                <i><b>{num(String(cdp.m).padStart(2, '0'), lang)}</b>{t('m')}</i>
                <i><b>{num(String(cdp.s).padStart(2, '0'), lang)}</b>{t('s')}</i>
              </div>
            )}
          </div>
        </div>

        <div className="road"><div className="road-line" />
          <motion.div className="road-fill" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 60 }} />
          <span className="road-a">{from.emoji}</span>
          <motion.span className="road-car" animate={{ left: `${Math.min(96, Math.max(0, progress * 100))}%` }} transition={{ type: 'spring', stiffness: 60 }}><span className={state === 'road' ? 'bounce' : ''}>🚐</span></motion.span>
          <span className="road-b">{to.emoji}</span>
        </div>

        <button className="link" onClick={(e) => { e.stopPropagation(); setShowCalc(!showCalc); }}>{showCalc ? '▾' : '▸'} {t('etaBreakdown')}</button>
        {showCalc && (
          <ul className="calc">
            <li><span>{t('baseDrive')}</span><b>{fmtDur(baseMin, lang, t)}</b></li>
            <li><span>{t('terrainAdj')}</span><b>+{fmtDur(terrMin, lang, t)}</b></li>
            <li><span>{t('weatherAdj')}</span><b>+{fmtDur(wxMin, lang, t)}</b></li>
            {border > 0 && <li><span>{t('borderAdj')}</span><b>+{fmtDur(border, lang, t)}</b></li>}
            <li><span>{t('yourDelay')}</span><b>+{fmtDur(delay, lang, t)}</b></li>
            <li className="sum"><span>{t('total')}</span><b>{fmtDur(totalMin, lang, t)}</b></li>
          </ul>
        )}
      </div>

      <div className="alerts" onClick={(e) => e.stopPropagation()}>
        <h4>🚧 {t('delays')}</h4>
        {alerts.length === 0 && !delay && <p className="ok">{t('noAlerts')}</p>}
        {alerts.map((a) => <motion.p key={a} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="alert">⚠️ {t(a)}</motion.p>)}
        {delay > 0 && <p className="alert user">🛑 {t('a_manual')}: +{num(delay, lang)} {t('min')}</p>}
        <div className="delay-btns">
          {[15, 30, 60].map((m) => <button key={m} className="chip" onClick={() => setDelay(delay + m)}>+{num(m, lang)} {t('min')}</button>)}
          {delay > 0 && <button className="chip clear" onClick={() => setDelay(0)}>✕ {t('clearDelay')}</button>}
          <a className="chip live" href={live} target="_blank" rel="noreferrer">🚦 {t('liveTraffic')}</a>
        </div>
        <p className="note">{t('trafficNote')}</p>
      </div>
    </motion.section>
  );
}
