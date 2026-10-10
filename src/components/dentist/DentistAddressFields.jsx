export default function DentistAddressFields({ value, onChange }) {
  return <div className="grid gap-4">
    <label className="block text-sm font-medium">Clinic address
      <input value={value.address || ''} onChange={e => onChange({...value,address:e.target.value})} placeholder="Street and building number" className="mt-1.5 w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo" />
    </label>
    <label className="block text-sm font-medium">City and country
      <input value={value.city || ''} onChange={e => onChange({...value,city:e.target.value})} placeholder="City, country" className="mt-1.5 w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo" />
    </label>
    <p className="text-xs text-muted-foreground">Your public clinic address is located once when saved. If it cannot be located, your profile remains available in manual search.</p>
  </div>;
}