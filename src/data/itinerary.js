// ─────────────────────────────────────────────────────────────
//  EDIT ME: all stops, days and events live here.
//  Verified pins: Chhapaiya, Gupteshwar, Muktinath, Galeshwar (3 km N of Beni), Modibeni (Modi Khola mouth).
//  Mahashila = Mahashila rural municipality centre, Parbat (confirm exact spot). Khokhra is still a guess. Nudge lat/lng if a pin is off.
//  tz = UTC offset in minutes (India 330, Nepal 345).
// ─────────────────────────────────────────────────────────────
const IN = 330, NP = 345;

export const STOPS = {
  lko:       { emoji: '✈️', lat: 26.7606, lng: 80.8893, tz: IN, name: { en: 'Lucknow Airport', gu: 'લખનૌ એરપોર્ટ', hi: 'लखनऊ एयरपोर्ट' } },
  ayodhya:   { emoji: '🛕', lat: 26.7955, lng: 82.1943, tz: IN, name: { en: 'Ayodhya', gu: 'અયોધ્યા', hi: 'अयोध्या' } },
  chhapaiya: { emoji: '🏡', lat: 26.9658, lng: 82.3897, tz: IN, name: { en: 'Chhapaiya', gu: 'છપૈયા', hi: 'छपैया' } },
  khokhra:   { emoji: '🌾', lat: 28.0500, lng: 81.6170, tz: NP, name: { en: 'Khokhra', gu: 'ખોખરા', hi: 'खोखरा' } },
  gupteshwar:{ emoji: '🕉️', lat: 28.1896, lng: 83.9578, tz: NP, name: { en: 'Gupteshwar', gu: 'ગુપ્તેશ્વર', hi: 'गुप्तेश्वर' } },
  galeshwar: { emoji: '🏞️', lat: 28.3800, lng: 83.5670, tz: NP, name: { en: 'Galeshwar', gu: 'ગલેશ્વર', hi: 'गलेश्वर' } },
  muktinath: { emoji: '🏔️', lat: 28.8168, lng: 83.8717, tz: NP, name: { en: 'Muktinath', gu: 'મુક્તિનાથ', hi: 'मुक्तिनाथ' } },
  modibeni:  { emoji: '🧘', lat: 28.2050, lng: 83.6700, tz: NP, name: { en: 'Modibeni · Gopalyogi Ashram', gu: 'મોદીબેની · ગોપાલયોગી આશ્રમ', hi: 'मोदीबेनी · गोपालयोगी आश्रम' } },
  mahashila: { emoji: '🪨', lat: 28.0830, lng: 83.6740, tz: NP, name: { en: 'Mahashila', gu: 'મહાશીલા', hi: 'महाशिला' } },
};

// defaultDepart = HH:MM local time at the first stop of the day.
export const DAYS = [
  { date: '2026-11-20', emoji: '🛕', defaultDepart: '10:00', stops: ['lko', 'ayodhya', 'chhapaiya'],
    title: { en: 'Lucknow → Ayodhya → Chhapaiya', gu: 'લખનૌ → અયોધ્યા → છપૈયા', hi: 'लखनऊ → अयोध्या → छपैया' },
    event: { en: 'Arrive at Lucknow Airport, darshan at Ayodhya, evening at Chhapaiya', gu: 'લખનૌ એરપોર્ટ પહોંચવું, અયોધ્યા દર્શન, સાંજે છપૈયા', hi: 'लखनऊ एयरपोर्ट, अयोध्या दर्शन, शाम को छपैया' } },
  { date: '2026-11-21', emoji: '🚌', defaultDepart: '07:00', stops: ['chhapaiya', 'khokhra'],
    title: { en: 'Chhapaiya → Khokhra', gu: 'છપૈયા → ખોખરા', hi: 'छपैया → खोखरा' },
    event: { en: 'Travel day to Khokhra', gu: 'ખોખરા તરફ પ્રયાણ', hi: 'खोखरा की ओर प्रस्थान' } },
  { date: '2026-11-22', emoji: '🏔️', defaultDepart: '06:00', stops: ['khokhra', 'gupteshwar', 'galeshwar', 'muktinath'],
    title: { en: 'Gupteshwar · Galeshwar · Muktinath', gu: 'ગુપ્તેશ્વર · ગલેશ્વર · મુક્તિનાથ', hi: 'गुप्तेश्वर · गलेश्वर · मुक्तिनाथ' },
    event: { en: 'Darshan at Gupteshwar & Galeshwar, then on to Muktinath', gu: 'ગુપ્તેશ્વર અને ગલેશ્વર દર્શન, પછી મુક્તિનાથ', hi: 'गुप्तेश्वर और गलेश्वर दर्शन, फिर मुक्तिनाथ' } },
  { date: '2026-11-23', emoji: '🔥', defaultDepart: '07:00', stops: ['muktinath'],
    title: { en: 'Muktinath Mahapuja', gu: 'મુક્તિનાથ મહાપૂજા', hi: 'मुक्तिनाथ महापूजा' },
    event: { en: 'Mahapuja at Muktinath', gu: 'મુક્તિનાથ ખાતે મહાપૂજા', hi: 'मुक्तिनाथ में महापूजा' } },
  { date: '2026-11-24', emoji: '🔥', defaultDepart: '07:00', stops: ['muktinath', 'modibeni'],
    title: { en: 'Modibeni · Gopalyogi Ashram Mahapuja', gu: 'મોદીબેની · ગોપાલયોગી આશ્રમ મહાપૂજા', hi: 'मोदीबेनी · गोपालयोगी आश्रम महापूजा' },
    event: { en: 'Travel to Modibeni, Mahapuja at Gopalyogi Ashram', gu: 'મોદીબેની પ્રયાણ, ગોપાલયોગી આશ્રમે મહાપૂજા', hi: 'मोदीबेनी प्रस्थान, गोपालयोगी आश्रम में महापूजा' } },
  { date: '2026-11-25', emoji: '🎉', defaultDepart: '08:00', stops: ['modibeni'],
    title: { en: 'Modibeni Utsav', gu: 'મોદીબેની ઉત્સવ', hi: 'मोदीबेनी उत्सव' },
    event: { en: 'Utsav celebration at Modibeni', gu: 'મોદીબેની ખાતે ઉત્સવ', hi: 'मोदीबेनी में उत्सव' } },
  { date: '2026-11-26', emoji: '🪨', defaultDepart: '08:00', stops: ['modibeni', 'mahashila'],
    title: { en: 'Mahashila Mahapuja', gu: 'મહાશીલા મહાપૂજા', hi: 'महाशिला महापूजा' },
    event: { en: 'Mahapuja at Mahashila', gu: 'મહાશીલા ખાતે મહાપૂજા', hi: 'महाशिला में महापूजा' } },
  { date: '2026-11-27', emoji: '🏡', defaultDepart: '06:00', stops: ['mahashila', 'chhapaiya'],
    title: { en: 'Return to Chhapaiya', gu: 'છપૈયા પરત', hi: 'छपैया वापसी' },
    event: { en: 'Journey back to Chhapaiya', gu: 'છપૈયા તરફ પરત પ્રયાણ', hi: 'छपैया की वापसी यात्रा' } },
];
