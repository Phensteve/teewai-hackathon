// A tiny "alive" scanner icon: viewfinder corners with a beam that sweeps
// continuously — reads as active capture at 14px without any layout cost.
export default function LiveScanIcon({ size = 14, className = '' }) {
  return (
    <span
      className={`relative inline-block flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <g stroke="#5eead4" strokeWidth="2.4" strokeLinecap="round">
          <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8" />
          <path d="M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8" />
          <path d="M21 16v2.5A2.5 2.5 0 0 1 18.5 21H16" />
          <path d="M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
        </g>
        <line
          x1="5.5" y1="12" x2="18.5" y2="12"
          stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round"
          style={{ animation: 'scan-beam 1.9s cubic-bezier(0.45,0,0.55,1) infinite' }}
        />
      </svg>
      <style>{`@keyframes scan-beam{0%,100%{transform:translateY(-4px);opacity:.35}50%{transform:translateY(4px);opacity:1}}`}</style>
    </span>
  );
}