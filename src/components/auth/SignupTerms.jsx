import { Link } from 'react-router-dom';

export default function SignupTerms({ checked, onChange }) {
  return (
    <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 w-4 h-4 accent-olo shrink-0" />
      <span>I agree to the <Link to="/terms" target="_blank" className="text-primary underline">Terms</Link> and <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>.</span>
    </label>
  );
}