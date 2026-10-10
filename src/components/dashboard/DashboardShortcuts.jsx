import { Link } from 'react-router-dom';
import {
  LayoutGrid,
  BookOpen,
  Palette,
  Droplet,
  Hourglass,
  CalendarHeart,
  Smile,
  Stethoscope,
} from 'lucide-react';
import DashboardSection from '@/components/DashboardSection';
import SmileMission from '@/components/SmileMission';
import StainShieldPrompt from '@/components/StainShieldPrompt';
import CalendarReminderCard from '@/components/CalendarReminderCard';

const NAV_LINKS = [
  { to: '/braces-check', icon: Smile, label: 'Braces check', featured: true },
  { to: '/stain-tracker', icon: Droplet, label: 'Stain tracker' },
  { to: '/timeline', icon: Palette, label: 'Shade timeline' },
  { to: '/time-machine', icon: Hourglass, label: 'Time machine' },
  { to: '/ask-teewai', icon: Stethoscope, label: 'Ask teewai', featured: true },
  { to: '/smile-goal', icon: CalendarHeart, label: 'Smile goal', featured: true },
];

export default function DashboardShortcuts({
  stats,
  streak,
  daysSinceScan,
  shields,
  isPro,
  subscription,
  statsReady = true,
  progressReady = true,
}) {
  const links = isPro || subscription?.plan === 'family_pro'
    ? [...NAV_LINKS, { to: '/home-whitening', icon: BookOpen, label: 'Whitening', featured: true }]
    : NAV_LINKS;

  return (
    <div className="mt-4 mb-4">
      <DashboardSection
        icon={LayoutGrid}
        title="Shortcuts & tools"
        summary="Braces check, smile goal, trackers & more"
      >
        {statsReady && <SmileMission stats={stats} />}
        {statsReady && progressReady && (
          <StainShieldPrompt
            streak={streak}
            daysSinceScan={daysSinceScan}
            shields={shields}
          />
        )}
        {/* Compact navigation grid — icon + label, no descriptions */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {links.map(({ to, icon: Icon, label, featured }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                featured ? 'border-olo/30 bg-olo/5 hover:bg-olo/10' : 'border-border bg-card hover:border-olo/40'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${featured ? 'bg-olo/10 text-olo' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
        <CalendarReminderCard />
      </DashboardSection>
    </div>
  );
}