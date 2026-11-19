import { useState } from 'react';
import { motion } from 'framer-motion';
import { STOPS } from '../data/itinerary';
import { pick } from '../i18n';
import { useGeo, setStop, resetStop, isCustom, defaultOf, getVia, setVia, resetVia, parseCoords, exportJSON, resetAll, customCount, gmapsPin } from '../lib/geo';

export default function CapturePanel({ t, lang, sel, setSel, stopIds, legs, me, getCenter, onDone }) {
  const ver = useGeo();
  const [txt, setTxt] = useState('');
  const [msg, setMsg] = useState('');
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };
  const id = sel?.type === 'stop' ? sel.id : null;
  const leg = sel?.type === 'leg' ? legs.find((l) => l.id === sel.id) : null;
  const s = id ? STOPS[id] : null;

  const paste = () => {
    const r = parseCoords(txt);
    if (r.err) return flash(t({ short: 'errShort', range: 'errRange', format: 'errFormat', empty: 'errFormat' }[r.err]));
    setStop(id, r.lat, r.lng); setTxt(''); flash(t('saved'));
  };
  const here = () => { const c = getCenter(); if (c) setStop(id, c.lat, c.lng); };
  const mine = () => (me ? setStop(id, me.lat, me.lng) : flash(t('noGps')));
  const addVia = () => {
    const c = getCenter(); if (!c) return;
    const cur = getVia(leg.a, leg.b); setVia(leg.a, leg.b, [...cur, [c.lat, c.lng]]);
  };
  const copyAll = () => navigator.clipboard?.writeText(exportJSON()).then(() => flash(t('copied'))).catch(() => {});

  return (
    <motion.div className="pop capture" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <div className="pop-top"><div className="grab" /></div>
      <div className="pop-body">
        <div className="cap-head"><h3>✏️ {t('editPins')}</h3><button className="btn go" onClick={onDone}>✓ {t('doneBtn')}</button></div>
        <div className="chips scroll">{stopIds.map((x) => <button key={x} className={`chip ${id === x ? 'on' : ''}`} onClick={() => setSel({ type: 'stop', id: x })}>{STOPS[x].emoji} {pick(STOPS[x].name, lang).split('·')[0]}{isCustom(x) ? ' ✎' : ''}</button>)}</div>

        {s && (
          <div className="capbox">
            <div className="coordbig">{s.lat.toFixed(6)}, {s.lng.toFixed(6)}</div>
            <div className="note">{isCustom(id) ? `✎ ${t('customised')} · ${t('defaultPin')}: ${defaultOf(id).lat.toFixed(5)}, ${defaultOf(id).lng.toFixed(5)}` : t('defaultPin')}</div>
            <div className="cap-actions">
              <button className="chip live" onClick={here}>🎯 {t('setHere')}</button>
              <button className="chip" onClick={mine}>📍 {t('useMyLoc')}</button>
              <a className="chip" href={gmapsPin(s)} target="_blank" rel="noreferrer">🗺️ {t('checkG')}</a>
              {isCustom(id) && <button className="chip clear" onClick={() => resetStop(id)}>↺ {t('resetBtn')}</button>}
            </div>
            <div className="pasterow"><input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={t('pasteCoords')} onKeyDown={(e) => e.key === 'Enter' && paste()} /><button className="btn" onClick={paste}>{t('setBtn')}</button></div>
          </div>
        )}

        {leg && (
          <div className="capbox">
            <b>{pick(STOPS[leg.a].name, lang).split('·')[0]} ➜ {pick(STOPS[leg.b].name, lang).split('·')[0]}</b>
            <div className="note">{t('viaPts')}: {getVia(leg.a, leg.b).length}</div>
            <div className="cap-actions">
              <button className="chip live" onClick={addVia}>＋ {t('addVia')}</button>
              {getVia(leg.a, leg.b).length > 0 && <button className="chip clear" onClick={() => resetVia(leg.a, leg.b)}>↺ {t('resetBtn')}</button>}
            </div>
            {getVia(leg.a, leg.b).map((v, i) => (
              <div key={i} className="viarow"><span className="via-dot s">{i + 1}</span><code>{v[0].toFixed(5)}, {v[1].toFixed(5)}</code>
                <button className="mini-btn" onClick={() => setVia(leg.a, leg.b, getVia(leg.a, leg.b).filter((_, j) => j !== i))}>✕</button></div>
            ))}
          </div>
        )}

        {!s && !leg && <p className="note">{t('selectPin')} · {t('tapRoute')}</p>}
        <p className="note">{t('editHint')}</p>
        <div className="cap-actions">
          <button className="chip" onClick={copyAll}>⧉ {t('copyAll')}</button>
          {customCount() > 0 && <button className="chip clear" onClick={resetAll}>↺ {t('resetAll')}</button>}
        </div>
        {msg && <div className="toast-in">{msg}</div>}
      </div>
    </motion.div>
  );
}
