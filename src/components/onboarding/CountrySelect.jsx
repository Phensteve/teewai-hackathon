import { COUNTRIES } from '@/lib/countries';
import SelectSheet from '@/components/SelectSheet';

export default function CountrySelect({ value, onChange }) {
  const options = [
    { value: '', label: 'Select your country…' },
    ...COUNTRIES.map((c) => ({ value: c, label: c })),
  ];
  return (
    <SelectSheet
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Select your country…"
      title="Choose your country"
      className="border-white/15 bg-white/5 text-white"
    />
  );
}