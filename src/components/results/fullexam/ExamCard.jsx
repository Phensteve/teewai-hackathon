export default function ExamCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="mb-4 p-4 sm:p-5 rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 mb-3">
        {Icon && <span className="icon-tool"><Icon /></span>}
        <div className="min-w-0">
          <h3 className="text-h3">{title}</h3>
          {subtitle && <p className="text-caption text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}