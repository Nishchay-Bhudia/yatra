import { useEffect, useState } from 'react';
import { motion, useAnimationControls, useDragControls } from 'framer-motion';

export const HEAD = 128;
export function useViewportH() {
  const [h, setH] = useState(typeof window === 'undefined' ? 800 : window.innerHeight);
  useEffect(() => { const f = () => setH(window.innerHeight); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return h;
}
export const visibleFor = (H) => ({ peek: 196, half: Math.round(H * 0.5), full: H - 84 });

export default function Sheet({ desktop, snap, setSnap, H, header, children }) {
  const anim = useAnimationControls();
  const drag = useDragControls();
  const vis = visibleFor(H);
  const fullH = vis.full;
  const yFor = (s) => fullH - vis[s];
  useEffect(() => { if (!desktop) anim.start({ y: yFor(snap), transition: { type: 'spring', stiffness: 320, damping: 34 } }); }, [snap, H, desktop]);

  if (desktop) return <aside className="panel">{header}<div className="sheet-body">{children}</div></aside>;

  const end = (_, info) => {
    const cur = yFor(snap) + info.offset.y + info.velocity.y * 0.18;
    const next = ['peek', 'half', 'full'].reduce((a, s) => (Math.abs(yFor(s) - cur) < Math.abs(yFor(a) - cur) ? s : a), 'peek');
    setSnap(next); anim.start({ y: yFor(next), transition: { type: 'spring', stiffness: 320, damping: 34 } });
  };
  return (
    <motion.div className="sheet" style={{ height: fullH }} initial={{ y: fullH }} animate={anim}
      drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: yFor('peek') }} dragElastic={0.04} onDragEnd={end}>
      <div className="sheet-head" onPointerDown={(e) => drag.start(e)} onClick={() => snap === 'peek' && setSnap('half')}>
        <div className="grab" />
        {header}
      </div>
      <div className="sheet-body" style={{ height: vis[snap] - HEAD - 8 }}>{children}</div>
    </motion.div>
  );
}
