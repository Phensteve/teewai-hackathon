import SectionLabel from './SectionLabel';

// Placeholder partner clinics — replace with real partner dentist clinics,
// dental school crests, and "as featured in" press logos. Text entries keep the
// strip lightweight (no external logo fetching); swap to <img> entries when
// real assets exist.
const PARTNERS = [
  'Lagos Dental Studio',
  'Smile Clinic Ikoyi',
  'Lekki Orthodontics',
  'Victoria Island Dental',
  'Ikeja Smiles',
  'Yaba Dental Care',
  'Apapa Family Dental',
  'Surulere Orthodontics',
  'Festac Smiles',
  'Grace Dental Lagos',
  'BrightSmile Clinic',
  'Marina Dental',
];

function Item({ name }) {
  return (
    <span className="shrink-0 mx-6 sm:mx-10 font-heading font-600 text-lg sm:text-xl text-muted-foreground/55 grayscale transition-colors duration-300 hover:text-olo">
      {name}
    </span>
  );
}

export default function LandingMarquee() {
  // Duplicated track for a seamless infinite loop.
  const loop = [...PARTNERS, ...PARTNERS];
  return (
    <section className="relative z-10 py-10 sm:py-14 overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionLabel label="Trusted by" title="Dental professionals across Lagos" />
      </div>
      <div className="relative mt-8 [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
        <div className="flex w-max animate-marquee will-change-transform">
          {loop.map((name, i) => (
            <Item key={i} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}