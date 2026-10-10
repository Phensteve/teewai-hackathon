// Single canonical loader used across teewai so every loading state feels
// identical (page chunks, form submits, sign-out, scan waiting, etc.).
// Keeps a fixed 4px ring so it scales cleanly from 24px up to 56px.
export default function Spinner({ size = 40, className = '' }) {
  return (
    <div
      className={`rounded-full border-4 border-muted border-t-olo animate-spin ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}