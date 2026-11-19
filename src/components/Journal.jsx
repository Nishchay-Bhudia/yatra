import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { addNote, addPhoto, getBlob, removeItem, useJournal, fmtTs } from '../lib/journal';
import { num } from '../i18n';

function Lightbox({ item, t, lang, onClose }) {
  const [url, setUrl] = useState('');
  useEffect(() => { let u; getBlob(item.id).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); } }); return () => u && URL.revokeObjectURL(u); }, [item.id]);
  return (
    <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      {url ? <img src={url} alt="" onClick={(e) => e.stopPropagation()} /> : <span className="note">{t('loading')}</span>}
      <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
        <span>{fmtTs(item.ts, lang)}{item.lat ? ` · 📍 ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}` : ''}</span>
        {url && <a className="chip" href={url} download={`yatra-${item.ts}.jpg`}>⬇ {t('dlPhoto')}</a>}
        <button className="chip clear" onClick={() => { if (confirm(t('delQ'))) { removeItem(item.id); onClose(); } }}>🗑</button>
        <button className="chip" onClick={onClose}>✕</button>
      </div>
    </motion.div>
  );
}

export default function Journal({ k, me, t, lang, onSaved }) {
  const items = useJournal(k);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);
  const cam = useRef(), gal = useRef();
  const loc = me ? { lat: me.lat, lng: me.lng } : undefined;
  const photos = items.filter((i) => i.type === 'photo'), notes = items.filter((i) => i.type === 'note');
  useEffect(() => { if (items.length) setOpen(true); }, [items.length > 0]);

  const onFiles = async (e) => {
    const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
    setBusy(true); setOpen(true);
    try { for (const f of files) await addPhoto(k, f, loc); onSaved?.(); } catch { alert(t('errSave')); }
    setBusy(false);
  };
  const save = async () => { const v = text.trim(); if (!v) return; await addNote(k, v, loc); setText(''); onSaved?.(); };

  return (
    <div className="journal">
      <div className="j-head">
        <button className="morebtn" onClick={() => setOpen(!open)}>📝 {t('journalT')} {items.length ? `(${num(notes.length, lang)}📝 ${num(photos.length, lang)}📷)` : ''} {open ? '▴' : '▾'}</button>
        <button className="mini-btn" onClick={() => cam.current.click()} aria-label={t('takePhoto')}>📷</button>
        <button className="mini-btn" onClick={() => gal.current.click()} aria-label={t('uploadPhoto')}>🖼️</button>
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} />
        <input ref={gal} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      </div>
      {open && (
        <div className="j-body">
          <div className="pasterow">
            <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('writeNote')} />
            <button className="btn go" onClick={save}>{t('saveNote')}</button>
          </div>
          {busy && <p className="note">{t('loading')}</p>}
          {photos.length > 0 && <div className="pgrid">{photos.map((p) => <button key={p.id} onClick={() => setView(p)}><img src={p.thumb} alt="" /></button>)}</div>}
          {notes.map((n) => (
            <div key={n.id} className="jnote">
              <p>{n.text}</p>
              <small>{fmtTs(n.ts, lang)}{n.lat ? ` · 📍 ${n.lat.toFixed(4)}, ${n.lng.toFixed(4)}` : ''}</small>
              <button className="jdel" onClick={() => confirm(t('delQ')) && removeItem(n.id)} aria-label="delete">✕</button>
            </div>
          ))}
          <p className="note">{t('journalLocal')}</p>
        </div>
      )}
      {createPortal(<AnimatePresence>{view && <Lightbox item={view} t={t} lang={lang} onClose={() => setView(null)} />}</AnimatePresence>, document.body)}
    </div>
  );
}
