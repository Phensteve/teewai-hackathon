import { History, Camera, ChevronRight } from 'lucide-react';
import DeviceCanvas from './DeviceCanvas';
import PhoneStatusBar from './PhoneStatusBar';
import PhoneTabBar from './PhoneTabBar';

const TEETH_URL = 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/25671764f_generated_image.png';

const SCANS = [
  { score: 87, shade: 'A1', date: 'Aug 3, 2026', pos: 'Front', health: 92 },
  { score: 82, shade: 'A2', date: 'Jul 28, 2026', pos: 'Front', health: 88 },
  { score: 78, shade: 'A2', date: 'Jul 15, 2026', pos: 'Top', health: 85 },
  { score: 74, shade: 'A3', date: 'Jul 1, 2026', pos: 'Front', health: 80 },
  { score: 71, shade: 'A3', date: 'Jun 22, 2026', pos: 'Front', health: 78 },
];

export default function MyScansSnapshot() {
  return (
    <DeviceCanvas>
      <div className="w-full h-full bg-background flex flex-col text-foreground">
        <PhoneStatusBar />

        <div className="flex items-center gap-3 px-5 pt-1 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
            <History className="w-[22px] h-[22px] text-olo" />
          </div>
          <div>
            <h1 className="font-heading font-700 text-[22px] tracking-tight">My scans</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">12 scans · newest first</p>
          </div>
        </div>

        <div className="flex gap-1 bg-muted/60 rounded-2xl p-1 mx-5 mb-4">
          <div className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-[13px] font-semibold bg-card text-foreground shadow-sm">
            <Camera className="w-4 h-4" /> Teeth <span className="text-muted-foreground font-normal">12</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-[13px] font-medium text-muted-foreground">
            Braces <span className="opacity-60">2</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-5 space-y-2.5 overflow-hidden">
          {SCANS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-olo-deep shrink-0">
                <img
                  src={TEETH_URL}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: i > 0 ? `brightness(${1 - i * 0.06})` : 'none' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-800 text-[20px] text-olo tabular-nums leading-none">{s.score}</span>
                  <span className="text-[12px] text-muted-foreground">whiteness</span>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {s.shade}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1.5">
                  {s.date} · {s.pos} · health {s.health}
                </p>
              </div>
              <ChevronRight className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>

        <PhoneTabBar active={1} />
      </div>
    </DeviceCanvas>
  );
}