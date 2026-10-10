import { HandUnderline, MakersMark } from './HandDrawn';

// A philosophy / "why we built this" section.
// This is the kind of intimate, intentional moment that makes a product
// feel handcrafted rather than generated — it shows design intent.
export default function CraftManifesto() {
  const lines = [
    { text: 'We didn\u2019t build teewai to replace your dentist.', emphasis: false },
    { text: 'We built it because between visits, nobody\u2019s watching.', emphasis: true },
    { text: '', emphasis: false },
    { text: 'Your teeth change every day. Coffee leaves a mark.', emphasis: false },
    { text: 'Wine leaves a mark. Time leaves a mark.', emphasis: false },
    { text: '', emphasis: false },
    { text: 'teewai watches \u2014 calmly, precisely, without judgment \u2014', emphasis: false },
    { text: 'and shows you exactly where you stand,', emphasis: false },
    { text: 'and where you could be.', emphasis: true },
  ];

  return (
    <section className="relative px-4 py-28 sm:py-40">
      {/* Generous white space — the breathing room IS the brand */}
      <div className="max-w-2xl mx-auto text-center">
        <div data-reveal className="flex justify-center mb-12">
          <MakersMark className="w-10 h-10 opacity-50" color="#5eead4" />
        </div>

        <div data-reveal className="space-y-1">
          {lines.map((line, i) => (
            <p
              key={i}
              data-reveal
              className={
                line.text === ''
                  ? 'h-4'
                  : line.emphasis
                  ? 'font-serif text-xl sm:text-2xl leading-relaxed text-white/95 tracking-tight'
                  : 'font-serif text-lg sm:text-xl leading-relaxed text-white/70 tracking-tight'
              }
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {line.text}
            </p>
          ))}
        </div>

        {/* Hand-drawn underline accent under the last emphasized line */}
        <div data-reveal className="flex justify-center mt-2" style={{ transitionDelay: '800ms' }}>
          <HandUnderline className="w-32 h-2.5 opacity-60" color="#5eead4" />
        </div>

        {/* The quiet closer */}
        <div data-reveal className="mt-16" style={{ transitionDelay: '1000ms' }}>
          <p className="text-sm text-white/40 tracking-wide">
            One photo. No clinic. No guesswork.
          </p>
          <p className="mt-2 text-xs text-white/30 tracking-wide font-light">
            {'\u2014 made in Ogbomoso, Nigeria, with care'}
          </p>
        </div>
      </div>
    </section>
  );
}