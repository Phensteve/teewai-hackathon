export default function DashboardTabBar({ tabs, tab, onTabChange }) {
  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] lg:top-10 z-40 -mx-4 lg:-mx-10 px-4 lg:px-10 py-2 mb-4 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex gap-1 bg-muted/80 rounded-2xl p-1 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }, i) => (
          <button
            key={id}
            onClick={() => onTabChange(id, i)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}