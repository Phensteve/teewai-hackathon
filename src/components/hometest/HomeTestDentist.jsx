import { Stethoscope, Users, ScanLine, CalendarCheck } from 'lucide-react';

export default function HomeTestDentist() {
  const features = [
    { icon: Users, text: 'Manage your client list & clinical notes' },
    { icon: ScanLine, text: 'Review AI scans your patients share with you' },
    { icon: CalendarCheck, text: 'Receive booking requests directly' },
  ];
  return (
    <section className="relative px-4 py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute -top-10 right-0 w-80 h-80 rounded-full blur-[120px]" style={{ background: 'rgba(13,159,142,0.15)' }} />
      <div className="relative max-w-4xl mx-auto grid sm:grid-cols-2 gap-8 items-center">
        <div data-reveal>
          <div className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full mb-4">
            <Stethoscope className="w-4 h-4 text-[#2dd4bf]" />
            <span className="text-xs font-medium text-white/80">For dental professionals</span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full uppercase tracking-wide">Coming soon</span>
          </div>
          <h2 className="font-heading font-300 text-3xl sm:text-4xl tracking-tight mb-3">
            Run your practice with the <span className="font-600 text-[#5eead4]">teewai</span> portal
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-6 font-light">
            Connect with patients, review their AI smile scans, and manage bookings — all in one place.
          </p>
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/60 font-semibold px-6 py-3 rounded-xl cursor-not-allowed">
            Coming soon
          </div>
        </div>
        <div data-reveal className="space-y-3">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="p-4 rounded-2xl glass flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0d9f8e] flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-white/85">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}