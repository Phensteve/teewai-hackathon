import { User, Crown, Flame, Camera, Trophy, Gauge, HeartPulse, Check } from 'lucide-react';
import DeviceCanvas from './DeviceCanvas';
import PhoneStatusBar from './PhoneStatusBar';
import PhoneTabBar from './PhoneTabBar';

function Ring({ value, label, color, Icon }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex-1 p-4 rounded-2xl border border-border bg-card flex flex-col items-center">
      <div className="flex items-center gap-1.5 mb-2.5" style={{ color }}>
        <Icon className="w-4 h-4" />
        <span className="text-[12px] font-heading font-600">{label}</span>
      </div>
      <div className="relative w-[70px] h-[70px]">
        <svg viewBox="0 0 70 70" className="w-full h-full -rotate-90">
          <circle cx="35" cy="35" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
          <circle
            cx="35"
            cy="35"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - value / 100)}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-heading font-800 text-[24px] tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export default function ProfileSnapshot() {
  return (
    <DeviceCanvas>
      <div className="w-full h-full bg-background flex flex-col text-foreground">
        <PhoneStatusBar />

        <div className="px-5 pt-1 pb-4">
          <h1 className="font-heading font-700 text-[24px] tracking-tight">Profile</h1>
        </div>

        {/* Identity */}
        <div className="mx-5 p-4 rounded-2xl border border-border bg-card mb-4 flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-olo" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-700 text-[17px] truncate">Ada Okafor</p>
            <p className="text-[12px] text-muted-foreground truncate mt-0.5">ada@teewai.app</p>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold mt-2"
              style={{ backgroundColor: '#fbbf2422', color: '#fbbf24' }}
            >
              🏆 Gold III
            </span>
          </div>
        </div>

        {/* Scores */}
        <div className="flex gap-3 px-5 mb-4">
          <Ring value={87} label="Whiteness" color="hsl(174 100% 36%)" Icon={Gauge} />
          <Ring value={92} label="Health" color="#10b981" Icon={HeartPulse} />
        </div>

        {/* Stats */}
        <div className="px-5 mb-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2.5">
            Smile stats
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Camera, label: 'Scans', value: '12' },
              { icon: Flame, label: 'Streak', value: '7' },
              { icon: Trophy, label: 'MMR', value: '1840' },
              { icon: Crown, label: 'Peak', value: '1920' },
            ].map((s) => (
              <div key={s.label} className="py-3 rounded-2xl border border-border bg-card text-center">
                <s.icon className="w-4 h-4 mx-auto mb-1.5 text-olo" />
                <p className="text-[16px] font-heading font-800 tabular-nums leading-none">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rank progress */}
        <div className="mx-5 p-4 rounded-2xl border border-border bg-card mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-olo" />
            <span className="text-[13px] font-heading font-700">Rank progress</span>
          </div>
          <div className="flex justify-between text-[12px] mb-2">
            <span className="text-champagne font-semibold">🏆 Gold III</span>
            <span className="text-muted-foreground">Diamond next</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-olo to-olo-glow rounded-full" style={{ width: '68%' }} />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
            <span>1,840 MMR</span>
            <span>2,400 to promote</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="mx-5 p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-2.5">
            <Trophy className="w-4 h-4 text-olo" />
            <span className="text-[13px] font-heading font-700">Milestones</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['First scan', '7-day streak', '10 scans'].map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-olo/10 text-olo"
              >
                <Check className="w-3.5 h-3.5" /> {m}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1" />
        <PhoneTabBar active={5} />
      </div>
    </DeviceCanvas>
  );
}