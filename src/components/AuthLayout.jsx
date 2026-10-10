import React from "react";
import { LOGO_URL } from "@/components/Logo";
import { isNativeApp } from "@/lib/isNativeApp";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  // The APK viewport is short, so auth screens are rendered in a compact
  // variant (see .auth-compact in index.css) that fits on a single screen.
  // Mobile web gets a responsive compact layout too — less padding, smaller
  // logo/title — so the form fits comfortably without feeling zoomed in.
  const compact = isNativeApp();
  return (
    <div
      className={`relative flex items-center justify-center bg-olo-deep px-4 overflow-hidden ${compact ? "auth-compact safe-area-inset-top py-4" : "py-4 sm:py-10"}`}
      style={{ minHeight: '100dvh' }}
    >
      <div className="absolute inset-0 grid-pattern opacity-20" />
      {/* Short top glow — the teal base color fills the full 100vh */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[200px] sm:w-[520px] sm:h-[260px] bg-olo/25 rounded-full blur-[90px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-4 sm:mb-7">
          <img src={LOGO_URL} alt="teewai" className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl mx-auto mb-2.5 sm:mb-4 olo-glow" />
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="text-white/60 mt-1 sm:mt-2 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-xl border border-border p-4 sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-xs sm:text-sm text-white/60 mt-3 sm:mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}