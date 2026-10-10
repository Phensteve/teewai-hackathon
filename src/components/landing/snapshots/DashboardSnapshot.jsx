import { Camera, Flame, LayoutGrid, Crown, TrendingUp, Trophy, History, Target, Share2 } from 'lucide-react';
import DeviceCanvas from './DeviceCanvas';
import PhoneStatusBar from './PhoneStatusBar';
import PhoneTabBar from './PhoneTabBar';

const TREND = [58, 63, 69, 66, 74, 81, 87];

export default function DashboardSnapshot() {
  return (
    <DeviceCanvas>
      <div className="w-full h-full bg-background flex flex-col text-foreground">
        <PhoneStatusBar />

        {/* Header */}
        <div className="px-5 pt-1 pb-4 flex items-start justify-between">
          <div>
            <h1 className="font-heading font-700 text-[24px] tracking-tight leading-tight">Welcome, Ada</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Track your whitening journey</p>
          </div>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-olo bg-olo/10 px-3 py-1.5 rounded-full">
            <Crown className="w-3.5 h-3.5" /> Upgrade
          </span>
        </div>

        {/* Primary actions */}
        <div className="flex gap-2.5 px-5 mb-4">
          <div className="flex-1 flex items-center justify-center gap-2 bg-olo text-white h-12 rounded-2xl text-[15px] font-semibold">
            <Camera className="w-[18px] h-[18px]" /> New scan
          </div>
          <div className="flex items-center gap-1.5 px-4 h-12 rounded-2xl border border-border bg-card">
            <Flame className="w-[18px] h-[18px] text-olo" />
            <span className="font-heading font-800 text-[19px] tabular-nums">7</span>
            <span className="text-muted-foreground text-[12px]">days</span>
          </div>
        </div>

        {/* Latest scan */}
        <div className="mx-5 p-4 rounded-2xl border border-border bg-card mb-4 flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full border-[4px] border-olo/25 flex items-center justify-center shrink-0">
            <span className="font-heading font-800 text-[20px] text-olo tabular-nums">87</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-700 text-[15px]">Latest scan</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Shade <span className="text-olo font-semibold">A1</span> · Health{' '}
              <span className="text-success font-semibold">Good</span>
            </p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">2 staining areas · 1 health note</p>
          </div>
          <Share2 className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 px-5 mb-4">
          {[
            { label: 'White', value: '87', color: 'text-olo' },
            { label: 'Health', value: '92', color: 'text-success' },
            { label: 'Gain', value: '+5', color: 'text-olo' },
            { label: 'Scans', value: '12', color: 'text-foreground' },
          ].map((s) => (
            <div key={s.label} className="py-2.5 rounded-2xl border border-border bg-card text-center">
              <p className={`text-[19px] font-heading font-800 tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/60 rounded-2xl p-1 mx-5 mb-4">
          {[
            { icon: LayoutGrid, label: 'Overview', active: true },
            { icon: TrendingUp, label: 'Journey' },
            { icon: Trophy, label: 'Rank' },
            { icon: History, label: 'History' },
          ].map((t) => (
            <div
              key={t.label}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-medium ${
                t.active ? 'bg-card text-olo shadow-sm font-semibold' : 'text-muted-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </div>
          ))}
        </div>

        {/* Rank */}
        <div className="mx-5 p-4 rounded-2xl border border-olo/20 bg-gradient-to-br from-olo/10 to-transparent mb-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-olo/15 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-olo" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-heading font-700 text-olo">Smile Rank: Diamond</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">MMR 2,840 · Peak 2,910</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-success font-semibold">▲ 120</p>
            <p className="text-[10px] text-muted-foreground">this week</p>
          </div>
        </div>

        {/* Trend */}
        <div className="mx-5 p-4 rounded-2xl border border-border bg-card mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-olo" />
            <span className="text-[13px] font-heading font-700">Whiteness trend</span>
            <span className="ml-auto text-[11px] text-success font-semibold">+29 in 7 scans</span>
          </div>
          <div className="flex items-end gap-1.5 h-[68px]">
            {TREND.map((v, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-md ${i === TREND.length - 1 ? 'bg-olo' : 'bg-olo/25'}`}
                style={{ height: `${v}%` }}
              />
            ))}
          </div>
        </div>

        {/* Quests */}
        <div className="mx-5 p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-2.5">
            <Target className="w-4 h-4 text-olo" />
            <span className="text-[13px] font-heading font-700">Daily quests</span>
          </div>
          <div className="space-y-2">
            {[
              { task: 'Scan your teeth', done: true },
              { task: 'Read your plan', done: true },
              { task: 'Share your score', done: false },
            ].map((q) => (
              <div key={q.task} className="flex items-center gap-2.5">
                <div className={`w-4 h-4 rounded-full shrink-0 ${q.done ? 'bg-olo' : 'border-2 border-muted-foreground/30'}`} />
                <span className={`text-[13px] ${q.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {q.task}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1" />
        <PhoneTabBar active={0} />
      </div>
    </DeviceCanvas>
  );
}