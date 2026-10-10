// Premium teewai verified badge — a scalloped seal with a checkmark in the
// brand olo gradient. Used next to verified members' names across the app
// (Common Room, leaderboards, profiles). Sleek, not loud.

export default function VerifiedBadge({ size = 14, className = '', title = 'Verified member' }) {
  const id = 'olo-verify-seal';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`inline-block flex-shrink-0 ${className}`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={id} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(174 100% 42%)" />
          <stop offset="1" stopColor="hsl(190 95% 38%)" />
        </linearGradient>
      </defs>
      {/* Scalloped seal */}
      <path
        d="M12 1.6l2.46 1.77 3.05-.31 1.18 2.86 2.86 1.18-.31 3.05L23.1 12l-1.86 2.46.31 3.05-2.86 1.18-1.18 2.86-3.05-.31L12 22.4l-2.46-1.77-3.05.31-1.18-2.86-2.86-1.18.31-3.05L.9 12l1.86-2.46-.31-3.05 2.86-1.18 1.18-2.86 3.05.31z"
        fill={`url(#${id})`}
      />
      <path
        d="M8 12.2l2.8 2.8 5.4-5.8"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}