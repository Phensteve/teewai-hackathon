// Real Google brand assets — official Google-hosted image for the Google Play
// badge, plus an inline Apple App Store badge SVG.

const PLAY_BADGE_URL = "https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png";

export function AppStoreBadge({ href = '#' }) {
  return (
    <a
      href={href}
      onClick={(e) => e.preventDefault()}
      className="relative inline-flex h-11 items-center gap-2.5 rounded-xl bg-black px-4 text-white transition-opacity hover:opacity-90"
      aria-label="Download on the App Store"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.37 12.43c-.02-2.05 1.67-3.03 1.75-3.08-.95-1.39-2.43-1.58-2.96-1.6-1.26-.13-2.46.74-3.1.74-.64 0-1.62-.72-2.66-.7-1.37.02-2.64.8-3.35 2.03-1.43 2.48-.36 6.16 1.02 8.18.67.98 1.47 2.09 2.52 2.05 1.01-.04 1.39-.66 2.61-.66 1.21 0 1.56.66 2.62.64 1.08-.02 1.77-.99 2.43-1.98.76-1.12 1.07-2.21 1.09-2.27-.02-.01-2.1-.81-2.13-3.2zM14.4 6.45c.55-.67.93-1.6.83-2.53-.8.03-1.78.53-2.36 1.2-.51.6-.96 1.55-.84 2.46.9.07 1.82-.46 2.37-1.13z" />
      </svg>
      <span className="flex flex-col text-left leading-none">
        <span className="text-[9px] uppercase tracking-wide opacity-80">Download on the</span>
        <span className="text-sm font-semibold">App Store</span>
      </span>
    </a>
  );
}

// Real Google Play badge — official Google-hosted "Get it on Google Play" image.
// The artwork ships with ~12% transparent padding, so it renders taller and is
// pulled in with negative margins to match the App Store button's 44px box.
export function PlayStoreBadge({ href = '#' }) {
  return (
    <a
      href={href}
      onClick={(e) => e.preventDefault()}
      aria-label="Get it on Google Play"
      className="relative transition-opacity hover:opacity-90 inline-block"
    >
      <img
        src={PLAY_BADGE_URL}
        alt="Get it on Google Play"
        className="h-14 w-auto -my-1.5"
        loading="lazy"
      />
    </a>
  );
}