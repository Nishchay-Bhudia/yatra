import { useState, useCallback } from 'react';
export function useStored(key, init) {
  const [v, setV] = useState(() => { try { const r = localStorage.getItem('s:' + key); return r == null ? init : JSON.parse(r); } catch { return init; } });
  const set = useCallback((nv) => { setV(nv); try { nv == null ? localStorage.removeItem('s:' + key) : localStorage.setItem('s:' + key, JSON.stringify(nv)); } catch {} }, [key]);
  return [v, set];
}
