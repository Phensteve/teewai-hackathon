import { useState } from 'react';
import { Check, Loader2, Sparkles, Stethoscope, Brush, Wrench, Anchor, Zap, Crown, Smile, FileText } from 'lucide-react';

// Treatment type options — maps each procedure to an icon + label so the
// dentist can quickly record what was done. Used both in the recording form
// and in the read-only treatment summary.
export const TREATMENT_TYPES = [
  { key: 'checkup', label: 'Checkup', icon: Stethoscope },
  { key: 'cleaning', label: 'Cleaning / Scaling', icon: Brush },
  { key: 'whitening', label: 'Whitening', icon: Sparkles },
  { key: 'filling', label: 'Filling', icon: Wrench },
  { key: 'extraction', label: 'Extraction', icon: Anchor },
  { key: 'root_canal', label: 'Root Canal', icon: Zap },
  { key: 'braces', label: 'Braces', icon: Smile },
  { key: 'aligners', label: 'Aligners', icon: Smile },
  { key: 'crown', label: 'Crown', icon: Crown },
  { key: 'other', label: 'Other', icon: FileText },
];

export const treatmentLabel = (key) => TREATMENT_TYPES.find((t) => t.key === key)?.label || key || '';
export const TreatmentIcon = ({ type, className = 'w-4 h-4' }) => {
  const t = TREATMENT_TYPES.find((t) => t.key === type);
  const Icon = t?.icon || FileText;
  return <Icon className={className} />;
};

// Inline form the dentist fills in when marking an appointment as completed.
// Records: treatment type, teeth treated, and notes. On submit, calls
// onSave with the treatment data — the parent updates the appointment status
// to 'completed' and persists the treatment fields.
export default function TreatmentRecordForm({ onSave, onCancel, saving = false, appointment }) {
  const [treatmentType, setTreatmentType] = useState(appointment?.treatment_type || '');
  const [teethTreated, setTeethTreated] = useState(appointment?.teeth_treated || '');
  const [treatmentNotes, setTreatmentNotes] = useState(appointment?.treatment_notes || appointment?.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!treatmentType) return;
    onSave({
      treatment_type: treatmentType,
      teeth_treated: teethTreated.trim(),
      treatment_notes: treatmentNotes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-2xl border border-olo/30 bg-olo/5 space-y-4">
      <div className="flex items-center gap-2">
        <Check className="w-4 h-4 text-olo" />
        <h3 className="font-heading font-600 text-sm">Record treatment</h3>
      </div>

      {/* Treatment type — chip selector */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">What was done *</label>
        <div className="flex flex-wrap gap-2">
          {TREATMENT_TYPES.map((t) => {
            const Icon = t.icon;
            const selected = treatmentType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTreatmentType(t.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors border ${
                  selected
                    ? 'bg-olo text-white border-olo'
                    : 'bg-card border-border text-muted-foreground hover:border-olo/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Teeth treated — FDI notation or plain language */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Teeth treated</label>
        <input
          value={teethTreated}
          onChange={(e) => setTeethTreated(e.target.value)}
          placeholder="e.g. 11, 21, 36  or  'upper front teeth'"
          className="w-full h-11 px-3 rounded-xl border border-border bg-card focus:border-olo focus:outline-none text-sm"
        />
        <p className="text-[10px] text-muted-foreground mt-1">FDI tooth numbers (comma-separated) or a short description.</p>
      </div>

      {/* Treatment notes */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Treatment notes</label>
        <textarea
          value={treatmentNotes}
          onChange={(e) => setTreatmentNotes(e.target.value)}
          rows={3}
          placeholder="Describe what you did, materials used, next steps…"
          className="w-full p-3 rounded-xl border border-border bg-card focus:border-olo focus:outline-none resize-none text-sm"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !treatmentType}
          className="flex-1 bg-olo text-white font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Complete & record
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-border text-muted-foreground px-4 rounded-xl hover:text-foreground text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}