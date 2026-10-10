export default function BriefTabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1.5 mt-4 p-1 rounded-2xl bg-muted/50">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
            active === t.key
              ? 'bg-olo text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}