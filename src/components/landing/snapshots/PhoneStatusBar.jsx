// Real iOS status bar at true device scale (390px wide, 54px tall) —
// time, cellular bars, wifi and battery, drawn as vectors so they stay crisp
// when the DeviceCanvas scales the screen down.
export default function PhoneStatusBar({ dark = false }) {
  const tint = dark ? 'text-white' : 'text-foreground';
  const fill = dark ? '#ffffff' : 'currentColor';

  return (
    <div className={`relative h-[54px] shrink-0 flex items-end justify-between px-7 pb-2.5 ${tint}`}>
      <span className="text-[15px] font-semibold tracking-tight tabular-nums">9:41</span>

      {/* Dynamic island */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[118px] h-[32px] rounded-full bg-black" />

      <div className="flex items-center gap-1.5">
        {/* Cellular */}
        <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={i * 4.5}
              y={9 - i * 2.6}
              width="3"
              height={3 + i * 2.6}
              rx="1"
              fill={fill}
              opacity={i === 3 ? 0.35 : 1}
            />
          ))}
        </svg>
        {/* Wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
          <path d="M8 10.6 5.9 8.3a3.1 3.1 0 0 1 4.2 0L8 10.6Z" fill={fill} />
          <path d="M3.7 6.1a6.2 6.2 0 0 1 8.6 0" stroke={fill} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M1.4 3.6a9.5 9.5 0 0 1 13.2 0" stroke={fill} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
        {/* Battery */}
        <svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true">
          <rect x="0.6" y="0.6" width="22" height="11.8" rx="3.4" stroke={fill} strokeWidth="1.1" fill="none" opacity="0.4" />
          <rect x="2.2" y="2.2" width="16" height="8.6" rx="2.1" fill={fill} />
          <path d="M24.4 4.6c1.1.3 1.6 1 1.6 1.9s-.5 1.6-1.6 1.9V4.6Z" fill={fill} opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}