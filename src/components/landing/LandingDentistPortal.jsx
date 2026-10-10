import { Link } from 'react-router-dom';
import { Stethoscope, ArrowRight, Users, ScanLine, CalendarCheck } from 'lucide-react';
import Reveal from '@/components/Reveal';
import LivingBackground from '@/components/landing/LivingBackground';

export default function LandingDentistPortal() {
  const features = [
    { icon: Users, text: 'Manage your client list and clinical notes' },
    { icon: ScanLine, text: 'Review AI scans your patients share with you' },
    { icon: CalendarCheck, text: 'Receive booking requests directly' },
  ];

  return (
    <section className="relative z-10 py-16 sm:py-20 px-4 bg-olo-deep text-white overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <LivingBackground />
      <div className="absolute -top-10 right-0 w-80 h-80 bg-olo/20 rounded-full blur-[120px]" />
      <div className="relative max-w-4xl mx-auto grid sm:grid-cols-2 gap-8 items-center">
        <Reveal>
          <span className="inline-block text-[10px] font-bold text-warning bg-warning/15 px-2 py-0.5 rounded-full uppercase tracking-wide mb-3">Coming soon</span>
          <h2 className="font-heading font-800 text-3xl sm:text-4xl tracking-tight text-balance mb-4">
            Run your practice with the <span className="text-olo olo-text-glow">teewai</span> portal
          </h2>
          <p className="text-white/60 leading-relaxed mb-6">
            Connect with patients, review their smile scans and manage bookings in one place.
          </p>
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/60 font-semibold px-6 py-3 rounded-xl cursor-not-allowed">
            Coming soon
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="p-4 rounded-2xl glass flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-olo flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-white/85">{text}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}