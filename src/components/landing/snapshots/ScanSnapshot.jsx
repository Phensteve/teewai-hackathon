import { Info } from 'lucide-react';
import DeviceCanvas from './DeviceCanvas';
import PhoneStatusBar from './PhoneStatusBar';
import PhoneTabBar from './PhoneTabBar';

const TEETH_URL = 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/25671764f_generated_image.png';

export default function ScanSnapshot() {
  return (
    <DeviceCanvas>
      <div className="w-full h-full bg-olo-deep flex flex-col text-white">
        <PhoneStatusBar dark />

        <div className="px-5 pt-1 pb-4">
          <h1 className="font-heading font-700 text-[26px] tracking-tight leading-tight">New teeth scan</h1>
          <p className="text-[13px] text-white/50 mt-1 leading-snug">
            Snap a clear photo — teewai scores your smile in about 90 seconds.
          </p>
        </div>

        {/* Scan type */}
        <div className="px-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35 mb-2">Scan type</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl border border-olo bg-olo/10">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[14px]">Quick</span>
                <span className="text-[10px] font-semibold text-olo bg-olo/20 px-2 py-0.5 rounded-full">1 scan</span>
              </div>
              <p className="text-[11px] text-white/45 leading-snug">One photo, fast score.</p>
            </div>
            <div className="p-3 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[14px] text-white/80">Full</span>
                <span className="text-[10px] font-semibold text-white/45 bg-white/10 px-2 py-0.5 rounded-full">3 scans</span>
              </div>
              <p className="text-[11px] text-white/35 leading-snug">5 angles, full mouth.</p>
            </div>
          </div>
        </div>

        {/* Capture angle */}
        <div className="px-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35 mb-2">Capture angle</p>
          <div className="grid grid-cols-4 gap-2">
            {['Front', 'Top', 'Left', 'Right'].map((p, i) => (
              <div
                key={p}
                className={`py-2 rounded-xl text-center text-[12px] font-medium ${
                  i === 0 ? 'bg-olo text-olo-deep font-semibold' : 'bg-white/5 text-white/45 border border-white/10'
                }`}
              >
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* Camera viewfinder */}
        <div className="flex-1 relative mx-5 rounded-3xl overflow-hidden border border-white/15 min-h-0">
          <img src={TEETH_URL} alt="Teeth in viewfinder" className="w-full h-full object-cover" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute left-0 right-0 h-[2px] bg-olo-glow shadow-[0_0_24px_4px_hsl(var(--olo-glow))] animate-scan-line" />
          </div>

          {/* Focus brackets */}
          {[
            'top-4 left-4 border-t-2 border-l-2 rounded-tl-lg',
            'top-4 right-4 border-t-2 border-r-2 rounded-tr-lg',
            'bottom-4 left-4 border-b-2 border-l-2 rounded-bl-lg',
            'bottom-4 right-4 border-b-2 border-r-2 rounded-br-lg',
          ].map((pos) => (
            <span key={pos} className={`absolute w-7 h-7 border-olo-glow/80 ${pos}`} />
          ))}

          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/45 backdrop-blur px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-olo-glow animate-pulse" />
            <span className="text-[11px] font-medium">Calibrating shade</span>
          </div>

          <div className="absolute bottom-4 left-4 w-[74px] h-[52px] rounded-xl border-2 border-dashed border-olo-glow/70 flex items-center justify-center px-1">
            <span className="text-[10px] text-olo-glow font-medium leading-tight text-center">White card</span>
          </div>

          <div className="absolute bottom-4 right-4 w-[54px] h-[54px] rounded-full border-[3px] border-white/90 flex items-center justify-center">
            <div className="w-[42px] h-[42px] rounded-full bg-olo" />
          </div>
        </div>

        <div className="mx-5 mt-3.5 flex items-start gap-2 text-[11px] leading-snug text-warning/85 bg-warning/10 border border-warning/20 rounded-xl px-3 py-2.5">
          <Info className="w-4 h-4 shrink-0 mt-px" />
          <span>Place a VITA shade guide or white card beside your teeth for precise calibration.</span>
        </div>

        <div className="px-5 py-3.5 flex items-center justify-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-olo" />
          <span className="text-[12px] text-white/45">Do I need braces? Try Braces Check</span>
        </div>

        <PhoneTabBar active={1} dark />
      </div>
    </DeviceCanvas>
  );
}