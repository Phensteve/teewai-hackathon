// Bordered phone-frame mockup — a device bezel around a real-scale teewai
// screenshot. The screens render their own iOS status bar and dynamic island
// (see DeviceCanvas), so the frame draws no notch of its own.
export default function PhoneFrame({ children, label }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-[260px] rounded-[2.2rem] border-[3px] border-foreground/10 bg-foreground p-1.5 shadow-2xl shadow-olo/15">
        <div className="relative rounded-[1.7rem] overflow-hidden bg-background aspect-[390/844]">
          {children}
        </div>
      </div>
      {label && (
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      )}
    </div>
  );
}