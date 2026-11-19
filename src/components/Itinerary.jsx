import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { STOPS } from '../data/itinerary';
import { pick, num } from '../i18n';
import { getRoute } from '../lib/api';
import { fmtDate, fmtDur } from '../lib/time';
import { getVia, gmapsPin, useGeo, isCustom } from '../lib/geo';

const fmt = (s) => `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`;

export default function Itinerary({ days, legs, lang, t, visited, onClose, onShow }) {
  const ver = useGeo();
  const [rt, setRt] = useState({});
  const [copied, setCopied] = useState('');
  useEffect(() => { setRt({}); legs.forEach((l) => getRoute(STOPS[l.a], STOPS[l.b], getVia(l.a, l.b)).then((r) => setRt((o) => ({ ...o, [l.id]: r })))); }, [ver]);
  const copy = (txt, k) => { navigator.clipboard?.writeText(txt).then(() => { setCopied(k); setTimeout(() => setCopied(''), 1500); }).catch(() => {}); };
  const asText = () => days.map((d, i) => `Day ${i + 1} · ${d.date} · ${d.title.en}\n` + d.stops.map((id) => `  • ${STOPS[id].name.en}: ${fmt(STOPS[id])}  ${gmapsPin(STOPS[id])}`).join('\n')).join('\n\n');

  return (
    <motion.div className="itin" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 34 }}>
      <div className="itin-head">
        <h2>📋 {t('itinT')}</h2>
        <button className="chip" onClick={() => copy(asText(), 'all')}>{copied === 'all' ? t('copied') : '⧉ ' + t('copyAll')}</button>
        <button className="x static" onClick={onClose} aria-label="close">✕</button>
      </div>
      <div className="itin-body">
        {days.map((d, di) => (
          <section key={d.date} className="iday">
            <h3><span>{d.emoji}</span> {t('day')} {num(di + 1, lang)} · {fmtDate(d.date, lang)}<small>{pick(d.title, lang)}</small></h3>
            {d.stops.map((id, i) => {
              const s = STOPS[id], l = i < d.stops.length - 1 ? legs.find((x) => x.id === `${d.date}:${id}>${d.stops[i + 1]}`) : null, r = l && rt[l.id];
              return (
                <div key={id + i}>
                  <div className="istop">
                    <span className="ie">{visited[id] && i === 0 ? '✓' : s.emoji}</span>
                    <div className="it">
                      <b>{pick(s.name, lang)}</b>
                      <button className="coord" onClick={() => copy(fmt(s), id + i)}>{copied === id + i ? t('copied') : fmt(s)}{isCustom(id) ? ' ✎' : ''}</button>
                    </div>
                    <button className="mini-btn" onClick={() => onShow(id)} title={t('showOnMap')}>🎯</button>
                    <a className="mini-btn" href={gmapsPin(s)} target="_blank" rel="noreferrer" title={t('checkG')}>🗺️</a>
                  </div>
                  {l && (
                    <div className="ileg">
                      <i />
                      <span>{r ? `🚗 ${fmtDur(r.min, lang, t)} · ${num(Math.round(r.km), lang)} ${t('km')}${r.estimated ? ' ⚠️' : ''}` : '🚗 …'}{getVia(l.a, l.b).length ? ` · ${getVia(l.a, l.b).length} ${t('routeVia')}` : ''}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </motion.div>
  );
}
