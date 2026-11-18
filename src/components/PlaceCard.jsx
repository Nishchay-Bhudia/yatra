import { motion } from 'framer-motion';
import { STOPS } from '../data/itinerary';
import { PLACES } from '../data/places';
import { pick } from '../i18n';

export default function PlaceCard({ id, lang, t }) {
  const s = STOPS[id], p = PLACES[id];
  if (!p) return null;
  return (
    <motion.div key={id} className="place" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="place-hero"><motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }}>{s.emoji}</motion.span><h3>{pick(s.name, lang)}</h3></div>
      <h4>📖 {t('whatIs')}</h4>
      <p>{pick(p.about, lang)}</p>
      <div className="nk"><h4>🪷 {t('nilkanthT')}</h4><p>{pick(p.nilkanth, lang)}</p></div>
      <h4>🎈 {t('factsT')}</h4>
      <ul>{(p.facts[lang] || p.facts.en).map((f, i) => <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>{f}</motion.li>)}</ul>
      <p className="note">{t('disclaimer')}</p>
    </motion.div>
  );
}
