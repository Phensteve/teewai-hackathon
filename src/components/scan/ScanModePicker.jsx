// Scan type picker (quick vs full) + family-member selector for family-plan
// owners scanning for a child.
export default function ScanModePicker({
  scanMode,
  setScanMode,
  isFamily,
  subscription,
  memberIdx,
  setMemberIdx,
}) {
  return (
    <>
      <div className="mb-4">
        <label className="text-caption font-medium mb-3 block">Scan type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setScanMode('quick')}
            className={`text-left p-4 rounded-2xl border transition-all ${
              scanMode === 'quick'
                ? 'border-olo bg-olo/5 olo-glow'
                : 'border-border hover:border-olo/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-caption whitespace-nowrap">Quick scan</span>
              <span className="text-label text-olo bg-olo/10 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                1 scan
              </span>
            </div>
            <p className="text-caption text-muted-foreground">
              One photo. A fast whiteness and health score.
            </p>
          </button>
          <button
            onClick={() => setScanMode('full')}
            className={`text-left p-4 rounded-2xl border transition-all ${
              scanMode === 'full'
                ? 'border-olo bg-olo/5 olo-glow'
                : 'border-border hover:border-olo/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-caption whitespace-nowrap">Full scan</span>
              <span className="text-label text-olo bg-olo/10 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                3 scans
              </span>
            </div>
            <p className="text-caption text-muted-foreground">
              5 angles. A complete picture of your whole mouth.
            </p>
          </button>
        </div>
      </div>

      {isFamily &&
        (() => {
          const raw = subscription?.members || [];
          const slots = raw.length > 0 ? raw : Array.from({ length: 5 }, () => ({ name: '' }));
          // Only show members without a link — linked members scan from their
          // own devices. Children (no link) are scanned by the admin on this device.
          const unlinked = slots
            .map((m, i) => ({ ...m, _idx: i }))
            .filter((m) => !m.link && m.name);
          if (unlinked.length === 0) return null;
          const cur = slots[memberIdx] || slots[0];
          return (
            <div className="mb-4">
              <label className="text-caption font-medium mb-3 block">Scanning for a child?</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {unlinked.map((m) => (
                  <button
                    key={m._idx}
                    onClick={() => setMemberIdx(m._idx)}
                    className={`px-3 py-2.5 rounded-xl text-caption font-medium transition-all truncate ${
                      memberIdx === m._idx
                        ? 'bg-olo text-white olo-glow'
                        : 'bg-card border border-border hover:border-olo/40'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="truncate">{m.name}</span>
                      {m.role && m.role !== 'other' && (
                        <span className="text-label opacity-70 capitalize">{m.role}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-caption text-muted-foreground">
                {cur?.name || `Member ${memberIdx + 1}`}
                {cur?.role && cur.role !== 'other' ? ` · ${cur.role}` : ''} ·{' '}
                {cur?.scans_used || 0}/{cur?.scans_limit || 30} scans used this month
              </p>
              <p className="mt-1 text-label text-muted-foreground">
                Linked members scan from their own devices. Only children appear here.
              </p>
            </div>
          );
        })()}
    </>
  );
}