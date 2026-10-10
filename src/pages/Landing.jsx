import { Link } from 'react-router-dom';
import { Camera, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-olo/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-4">
        {/* Nav */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-heading text-xl font-700 tracking-tight">teewai</span>
          </div>
          <Link
            to="/login"
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Sign in
          </Link>
        </header>

        {/* Hero */}
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-olo/20 bg-olo/5 px-4 py-1.5 text-caption font-medium text-olo">
            <Sparkles className="h-3.5 w-3.5" />
            AI dental scan in seconds
          </div>
          <h1 className="font-heading text-4xl font-700 leading-tight tracking-tight sm:text-5xl">
            See your smile
            <br />
            <span className="text-olo">in a whole new light</span>
          </h1>
          <p className="mt-5 max-w-md text-body text-muted-foreground">
            Snap a photo of your teeth and teewai's AI scores your whiteness and dental health, then builds a real care plan.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-olo px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-olo/20 transition-transform hover:scale-105"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              I have an account
            </Link>
          </div>

          {/* Feature row */}
          <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Camera, title: 'Snap a photo', desc: 'A quick close-up is all it takes.' },
              { icon: Sparkles, title: 'AI analysis', desc: 'Whiteness, health and a care plan.' },
              { icon: ShieldCheck, title: 'Private', desc: 'Your photos stay yours, always.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5 text-left">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-olo/10 text-olo">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-heading text-sm font-600">{title}</p>
                <p className="mt-1 text-caption text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <footer className="py-8 text-center text-label text-muted-foreground">
          teewai is a wellness companion, not a medical device.
        </footer>
      </div>
    </div>
  );
}