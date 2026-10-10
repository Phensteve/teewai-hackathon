// Standardized section header: small uppercase muted-foreground label above a
// large Recoleta heading, with an optional subtitle. Used by every new and
// restyled Zoah-inspired landing section for a consistent editorial rhythm.
export default function SectionLabel({ label, title, subtitle, align = 'center', onDark = false, className = '' }) {
  const alignCls = align === 'left' ? 'items-start text-left' : 'items-center text-center';
  const muted = onDark ? 'text-white/55' : 'text-muted-foreground';
  return (
    <div className={`flex flex-col ${alignCls} ${className}`}>
      <span className={`text-label ${muted}`}>{label}</span>
      <h2 className={`font-heading font-700 text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance mt-2.5 ${onDark ? 'text-white' : ''}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-3 text-sm sm:text-lg ${muted} text-balance max-w-2xl`}>{subtitle}</p>
      )}
    </div>
  );
}