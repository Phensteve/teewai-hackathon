import { Link } from 'react-router-dom';
import { ArrowRight, Camera } from 'lucide-react';

// A strong, detailed call-to-action band that closes the landing narrative:
// restates the value, reinforces trust, and gives two clear next steps
// (scan now / see pricing). Addresses the "missing detailed CTA" weakness.
export default function LandingCTA() {
  return (
    <section className="relative z-10 py-20 sm:py-28 px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10 radial-olo" />
      <div className="absolute inset-0 -z-10 grid-pattern opacity-40" />
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-heading font-700 text-3xl sm:text-5xl tracking-tight text-balance">
          See your <span className="text-olo">VITA shade</span> in 90 seconds
        </h2>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
          Snap one photo. teewai scores your whiteness and dental health, detects stains and plaque,
          and builds a personalized whitening plan that improves with every scan.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 bg-olo text-white font-semibold px-7 py-3.5 rounded-xl text-base hover:scale-[1.03] transition-transform olo-glow w-full sm:w-auto justify-center"
          >
            <Camera className="w-5 h-5" />
            Scan my teeth now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground font-semibold px-7 py-3.5 rounded-xl text-base hover:border-olo/50 transition-colors w-full sm:w-auto justify-center"
          >
            See plans &amp; pricing
          </a>
        </div>


      </div>
    </section>
  );
}