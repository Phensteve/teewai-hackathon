import { useState, useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';
import DentistCard from '@/components/dentist/DentistCard';
import DentistMiniApp from '@/components/dentist/DentistMiniApp';
import Spinner from '@/components/Spinner';
import BackButton from '@/components/BackButton';
import { Search, Stethoscope, BadgeCheck } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// Manual directory: profiles without locations remain browsable here.
// Nearby distance ordering belongs only to the rebuilt finder.
export default function DentistDirectory() {
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [user, setUser] = useState(null);
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const me = await unrufld.auth.me();
        setUser(me);
        const list = await unrufld.entities.DentistProfile.list('-created_date', 100);
        setDentists(list);
        try {
          const myAssignments = await unrufld.entities.DentistAssignment.filter({ created_by_id: me.id, status: 'active' });
          setAssignments(myAssignments);
        } catch {}
      } catch { /* non-fatal */ } finally { setLoading(false); }
    })();
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (d) => {
    if (!q) return true;
    return [d.full_name, d.practice_name, d.clinic_name, d.specialization, d.address, d.city]
      .some((f) => f && f.toLowerCase().includes(q));
  };

  const teewai = dentists.filter(matches);

  const handleAdd = async (dentist) => {
    try {
      await unrufld.entities.DentistAssignment.create({
        patient_id: user.id,
        patient_email: user.email,
        patient_name: user.full_name || user.email,
        dentist_id: dentist.id,
        dentist_user_id: dentist.user_id,
        dentist_name: dentist.full_name || dentist.clinic_name,
        assignment_type: 'secondary',
        initiated_by: 'patient',
        status: 'active',
        consent_given: true,
      });
      setAssignments((prev) => [...prev, { dentist_id: dentist.id }]);
      toast({ title: 'Dentist added', description: `${dentist.full_name || dentist.clinic_name} is now in your care team` });
    } catch {
      toast({ title: 'Could not add dentist', description: 'Please try again', variant: 'destructive' });
    }
  };

  const isAdded = (d) => assignments.some((a) => a.dentist_id === d.id);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <BackButton fallback="/dashboard" className="mb-4" />
      <div className="flex items-center gap-2 mb-1">
        <Stethoscope className="w-5 h-5 text-olo" />
        <h1 className="font-heading font-700 text-2xl tracking-tight">Dentist</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Search for dentists on teewai and assign one to share your scan reports.
      </p>
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, practice, specialization, or city"
          className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none"
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : teewai.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No teewai dentists found. Try a different search.
        </p>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-1.5 mb-2.5 px-1">
              <BadgeCheck className="w-3.5 h-3.5 text-olo" />
              <h2 className="text-xs font-semibold text-olo uppercase tracking-wider">Teewai dentists</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {teewai.map((d) => (
                <DentistCard
                  key={d.id}
                  dentist={d}
                  onClick={() => setSelectedDentist(d)}
                  onAdd={() => handleAdd(d)}
                  added={isAdded(d)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <DentistMiniApp
        open={!!selectedDentist}
        dentist={selectedDentist}
        user={user}
        onClose={() => setSelectedDentist(null)}
      />
    </div>
  );
}