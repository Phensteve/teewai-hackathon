// Stripe wordmark rendered as styled text in the Stripe brand blurple
// (#635BFF). The Stripe logo is a lowercase geometric-sans wordmark, so a
// styled "stripe" in the brand color reads as the Stripe logo while staying
// reliable across browsers (no external font/asset dependencies).
export default function StripeLogo({ className = "", onDark = false }) {
  return (
    <span
      className={`font-semibold lowercase tracking-[-0.02em] ${className}`}
      style={{ color: onDark ? "#ffffff" : "#635BFF", fontFamily: "'Sora', ui-sans-serif, system-ui, sans-serif" }}
    >
      stripe
    </span>
  );
}