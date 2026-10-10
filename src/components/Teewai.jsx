// The brand word, always rendered the same way: olo-tinted with a soft glow.
export default function Teewai({ className = '' }) {
  return (
    <span className={`text-olo olo-text-glow font-600 ${className}`}>teewai</span>
  );
}