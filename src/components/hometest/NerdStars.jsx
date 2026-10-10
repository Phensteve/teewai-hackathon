import { useEffect, useState } from 'react';

// Seven trivia cards hang around the lab at once, each twinkling at its own
// rate. Mostly genuinely strange space facts, with the occasional teewai
// internal — and every so often a card glitches and swaps its content mid-air.
const SPACE_FACTS = [
  ['Venus', 'A day on Venus is longer than its year — and it spins backwards.'],
  ['Neutron star', 'One teaspoon weighs about 4 billion tonnes.'],
  ['Saturn', 'It is less dense than water — it would float, if you found a big enough bath.'],
  ['Space smell', 'Astronauts describe the smell after an EVA as seared steak and hot metal.'],
  ['Sagittarius B2', 'A gas cloud near the galactic centre contains billions of litres of alcohol.'],
  ['Diamond rain', 'Neptune and Uranus likely rain solid diamonds through their mantles.'],
  ['Olympus Mons', 'The Martian volcano is so wide you could not see its peak while standing on it.'],
  ['Voyager 1', 'Its radio signal reaching us is under one quadrillionth of a watt.'],
  ['Moon dust', 'Lunar regolith smells like spent gunpowder once it is indoors.'],
  ['HD 189733b', 'It rains molten glass, sideways, at 8,700 km/h.'],
  ['Time dilation', 'Your head ages faster than your feet — very slightly.'],
  ['Sun', 'Photons take up to 100,000 years to escape its core.'],
];
const TEEWAI_FACTS = [
  ['teewai', 'Enamel refracts light at ~1.63 — the shader here uses 1.62.'],
  ['teewai', 'Every scan is segmented tooth by tooth before a single score is written.'],
  ['teewai', 'Shades map to the VITA Classical scale dentists already use.'],
  ['teewai', 'Photos are encrypted and never used to train models.'],
  ['teewai', 'This whole arch is 28 procedurally tapered crowns.'],
];
// ~7 space facts to 3 teewai facts.
const POOL = [...SPACE_FACTS, ...SPACE_FACTS.slice(0, 2), ...TEEWAI_FACTS];

const SLOTS = [
  { top: '10%', left: '3%', twinkle: 3.1 },
  { top: '24%', right: '2%', twinkle: 4.4 },
  { top: '52%', left: '1%', twinkle: 5.2 },
  { top: '74%', right: '4%', twinkle: 3.8 },
  { top: '4%', left: '62%', twinkle: 6.1 },
  { top: '86%', left: '28%', twinkle: 4.9 },
  { top: '40%', right: '9%', twinkle: 3.4 },
];

const pick = () => Math.floor(Math.random() * POOL.length);

export default function NerdStars() {
  const [cards, setCards] = useState(() => SLOTS.map((_, i) => POOL[(i * 3) % POOL.length]));
  const [glitching, setGlitching] = useState(-1);

  useEffect(() => {
    // Every couple of seconds, one random card glitches and rewrites itself.
    const id = setInterval(() => {
      const slot = Math.floor(Math.random() * SLOTS.length);
      setGlitching(slot);
      setTimeout(() => {
        setCards((prev) => prev.map((c, i) => (i === slot ? POOL[pick()] : c)));
        setGlitching(-1);
      }, 220);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden="true">
      <style>{`
        @keyframes star-twinkle{0%,100%{opacity:.42}50%{opacity:.95}}
        @keyframes star-glitch{0%{transform:translate(0,0);filter:none}25%{transform:translate(-2px,1px);filter:hue-rotate(70deg)}50%{transform:translate(2px,-1px) skewX(2deg)}75%{transform:translate(-1px,0);filter:saturate(2)}100%{transform:translate(0,0)}}
      `}</style>
      {SLOTS.map((s, i) => {
        const [label, text] = cards[i];
        const isGlitch = glitching === i;
        return (
          <div
            key={i}
            className="absolute max-w-[208px]"
            style={{
              top: s.top, left: s.left, right: s.right,
              animation: `star-twinkle ${s.twinkle}s ease-in-out ${i * 0.4}s infinite${isGlitch ? ', star-glitch 0.22s steps(2) 1' : ''}`,
            }}
          >
            <div
              className="rounded-xl border border-[#0d9f8e]/25 bg-[#06121a]/70 backdrop-blur-md px-3 py-2"
              style={{ boxShadow: '0 0 30px -12px rgba(13,159,142,0.5)' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#5eead4]" style={{ boxShadow: '0 0 6px 1px rgba(94,234,212,0.8)' }} />
                <span className="text-[8px] uppercase tracking-[0.18em] text-[#2dd4bf] font-semibold">{label}</span>
              </div>
              <p className={`text-[11px] leading-snug mt-1 font-light ${isGlitch ? 'text-[#5eead4]' : 'text-white/70'}`}>{text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}