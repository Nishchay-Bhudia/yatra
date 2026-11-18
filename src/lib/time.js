import { useEffect, useState } from 'react';

export function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setN(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return n;
}
// "2026-11-20" + "10:00" in tz offset (min) → epoch ms
export function toMs(date, hhmm, tz) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) - tz * 60000;
}
const p2 = (n) => String(n).padStart(2, '0');
export function hhmm(ms, tz) { const d = new Date(ms + tz * 60000); return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; }
export function ymd(ms, tz) { const d = new Date(ms + tz * 60000); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`; }
export function hourKey(ms, tz) { return `${ymd(ms, tz)}T${hhmm(ms, tz).slice(0, 2)}:00`; }
export function fmtClock(ms, tz, lang) {
  const d = new Date(ms + tz * 60000);
  let h = d.getUTCHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return { time: `${h}:${p2(d.getUTCMinutes())}`, ap, ymd: ymd(ms, tz) };
}
export function fmtDate(date, lang) {
  const [y, m, d] = date.split('-').map(Number);
  const loc = { gu: 'gu-IN', hi: 'hi-IN', en: 'en-IN' }[lang];
  return new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}
export function fmtDur(min, lang, t) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h}${t('h')} ${r}${t('m')}` : `${r}${t('m')}`;
}
export function splitDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
