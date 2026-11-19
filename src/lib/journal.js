// Notes + photos, stored on-device in IndexedDB (works offline, no backend, free).
import { useEffect, useState } from 'react';

let dbp;
try { navigator.storage?.persist?.(); } catch {} // ask the browser not to evict our data
const db = () => (dbp ||= new Promise((res, rej) => {
  const r = indexedDB.open('yatra-journal', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('meta', { keyPath: 'id' }).createIndex('k', 'k'); r.result.createObjectStore('blobs', { keyPath: 'id' }); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
const wrap = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = (t) => new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
const subs = new Set(); const notify = () => subs.forEach((f) => f());
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));

export async function listMeta(k) {
  const st = (await db()).transaction('meta').objectStore('meta');
  const all = await wrap(k ? st.index('k').getAll(k) : st.getAll());
  return all.sort((a, b) => b.ts - a.ts);
}
export async function addNote(k, text, loc) {
  const d = await db(), t = d.transaction('meta', 'readwrite');
  t.objectStore('meta').put({ id: uid(), k, type: 'note', text, ts: Date.now(), ...(loc || {}) });
  await done(t); notify();
}
async function shrink(file) {
  const bmp = await (window.createImageBitmap ? createImageBitmap(file).catch(() => null) : null);
  let img = bmp;
  if (!img) img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const draw = (max, q, asBlob) => {
    const sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return asBlob ? new Promise((r) => c.toBlob(r, 'image/jpeg', q)) : c.toDataURL('image/jpeg', q);
  };
  return { full: await draw(1600, 0.82, true), thumb: draw(360, 0.7, false), w: img.width, h: img.height };
}
export async function addPhoto(k, file, loc) {
  const { full, thumb, w, h } = await shrink(file); const id = uid();
  const d = await db(), t = d.transaction(['meta', 'blobs'], 'readwrite');
  t.objectStore('meta').put({ id, k, type: 'photo', thumb, w, h, ts: Date.now(), ...(loc || {}) });
  t.objectStore('blobs').put({ id, blob: full });
  await done(t); notify();
}
export async function getBlob(id) { const r = await wrap((await db()).transaction('blobs').objectStore('blobs').get(id)); return r?.blob; }
export async function removeItem(id) {
  const d = await db(), t = d.transaction(['meta', 'blobs'], 'readwrite');
  t.objectStore('meta').delete(id); t.objectStore('blobs').delete(id);
  await done(t); notify();
}

export function useJournal(k) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let on = true; const load = () => listMeta(k).then((x) => on && setItems(x)).catch(() => {});
    load(); subs.add(load); return () => { on = false; subs.delete(load); };
  }, [k]);
  return items;
}
export function useJournalCounts() {
  const all = useJournal(null), c = {};
  all.forEach((i) => { const o = (c[i.k] ||= { notes: 0, photos: 0 }); i.type === 'photo' ? o.photos++ : o.notes++; });
  return c;
}
export const fmtTs = (ts, lang) => new Intl.DateTimeFormat({ gu: 'gu-IN', hi: 'hi-IN', en: 'en-IN' }[lang], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
