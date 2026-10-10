export default function AuthProgress({ steps, current }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-4">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-6 rounded-full transition-colors ${i <= current ? 'bg-olo' : 'bg-muted'}`}
          />
        </div>
      ))}
    </div>
  );
}