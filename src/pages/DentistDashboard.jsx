import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { dentistProfiles, dentistClients, scans as insforgeScans } from '@/lib/insforgeDb';
import DentistOnboarding from '@/components/DentistOnboarding';
import { Stethoscope, Users, Smile, HeartPulse, Camera, Plus, ArrowRight, StickyNote, Activity } from 'lucide-react';

export default function DentistDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newClient, setNewClient] = useState({ client_name: '', client_email: '' });
  const [expanded, setExpanded] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});

  const load = () => {
    setLoading(true);
    (async () => {
      try {
        const me = await unrufld.auth.me();
        setUser(me);
        const [profiles, clientList] = await Promise.all([
          dentistProfiles.filter({}),
          dentistClients.filter({ dentist_id: me.id }),
        ]);
        const myProfile = profiles.find((p) => p.user_id === me.id) || null;
        setProfile(myProfile);
        setClients(clientList);
        // Fetch scans only for this dentist's own clients (server-side scoped to
        // those patient emails) instead of reading every scan in the table.
        const clientEmails = clientList.map((c) => c.client_email).filter(Boolean);
        const scanList = clientEmails.length
          ? await insforgeScans.filter({ patient_email: { in: clientEmails } }, '-created_date', 200)
          : [];
        setScans(scanList);
      } finally {
        setLoading(false);
      }
    })();
  };

  useEffect(() => { load(); }, []);

  const addClient = async (e) => {
    e.preventDefault();
    await dentistClients.create({
      ...newClient,
      dentist_id: user.id,
    });
    setNewClient({ client_name: '', client_email: '' });
    setShowAdd(false);
    load();
  };

  const saveNotes = async (client) => {
    const text = notesDraft[client.id];
    if (text === undefined) return;
    await dentistClients.update(client.id, { notes: text });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-olo rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <DentistOnboarding user={user} onCreated={load} />;
  }

  const clientScans = (email) => scans.filter((s) => s.patient_email === email);
  const avgWhiteness = scans.length ? Math.round(scans.reduce((a, s) => a + (s.score || 0), 0) / scans.length) : 0;
  const avgHealth = scans.length ? Math.round(scans.reduce((a, s) => a + (s.dental_health_score || 0), 0) / scans.length) : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-olo text-sm font-medium mb-1">
            <Stethoscope className="w-4 h-4" /> Dentist portal
          </div>
          <h1 className="font-heading font-700 text-3xl tracking-tight">{profile.clinic_name}</h1>
          <p className="text-muted-foreground mt-1">{profile.specialization || 'Dental professional'}</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow"
        >
          <Plus className="w-4 h-4" /> Add client
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addClient} className="p-5 rounded-2xl border border-border bg-card mb-6 grid sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Name</label>
            <input
              value={newClient.client_name}
              onChange={(e) => setNewClient({ ...newClient, client_name: e.target.value })}
              required
              placeholder="Jane Doe"
              className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={newClient.client_email}
              onChange={(e) => setNewClient({ ...newClient, client_email: e.target.value })}
              required
              placeholder="jane@email.com"
              className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none"
            />
          </div>
          <button type="submit" className="h-11 bg-olo text-white font-semibold rounded-xl hover:opacity-90">
            Add to roster
          </button>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            When this client scans their teeth, their results will automatically appear here.
          </p>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl border border-border bg-card">
          <Users className="w-5 h-5 text-olo mb-2" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Clients</p>
          <p className="mt-1 text-3xl font-heading font-700 text-olo">{clients.length}</p>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <Smile className="w-5 h-5 text-olo mb-2" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg whiteness</p>
          <p className="mt-1 text-3xl font-heading font-700">{avgWhiteness || '—'}</p>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <HeartPulse className="w-5 h-5 text-olo mb-2" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg dental health</p>
          <p className="mt-1 text-3xl font-heading font-700">{avgHealth || '—'}</p>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <Activity className="w-5 h-5 text-olo mb-2" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Scans monitored</p>
          <p className="mt-1 text-3xl font-heading font-700">{scans.length}</p>
        </div>
      </div>

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-3xl border border-border bg-card">
          <div className="w-16 h-16 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-olo" />
          </div>
          <h3 className="font-heading font-600 text-xl mb-1">No clients yet</h3>
          <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto">
            Add your first client by email. Their scans will show up here automatically.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-transform olo-glow"
          >
            <Plus className="w-5 h-5" /> Add your first client
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-heading font-600 text-xl">Your clients</h2>
          {clients.map((c) => {
            const cScans = clientScans(c.client_email).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            const latest = cScans[0];
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-olo/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-olo/10 flex items-center justify-center font-heading font-700 text-olo flex-shrink-0">
                    {c.client_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.client_email}</p>
                  </div>
                  {latest ? (
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-heading font-700 text-olo text-lg">{latest.score ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">whiteness</p>
                      </div>
                      <div className="text-center">
                        <p className="font-heading font-700 text-emerald-500 text-lg">{latest.dental_health_score ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">health</p>
                      </div>
                      <div className="text-center">
                        <p className="font-heading font-700 text-lg">{cScans.length}</p>
                        <p className="text-xs text-muted-foreground">scans</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground hidden sm:block">No scans yet</span>
                  )}
                  <ArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                  <div className="p-4 border-t border-border bg-muted/30 space-y-4">
                    {latest && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                        <img src={latest.image_url} alt="Scan" className="w-14 h-14 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Latest scan · {new Date(latest.created_date).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">
                            Shade {latest.shade || '—'} · Gum {latest.gum_health || '—'} · Plaque {latest.plaque_level || '—'}
                          </p>
                          {latest.dental_health_issues?.length > 0 && (
                            <p className="text-xs text-amber-500 mt-0.5">Issues: {latest.dental_health_issues.join(', ')}</p>
                          )}
                        </div>
                        <Link
                          to={`/results/${latest.id}`}
                          className="text-xs font-medium text-olo hover:underline flex-shrink-0"
                        >
                          View
                        </Link>
                      </div>
                    )}

                    {cScans.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Scan history</p>
                        {cScans.map((s) => (
                          <Link
                            key={s.id}
                            to={`/results/${s.id}`}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border hover:border-olo/40 transition-colors"
                          >
                            <img src={s.image_url} alt="Scan" className="w-9 h-9 rounded-lg object-cover" />
                            <span className="text-xs text-muted-foreground flex-1">
                              {new Date(s.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-xs font-medium text-olo">{s.score ?? '—'} W</span>
                            <span className="text-xs font-medium text-emerald-500">{s.dental_health_score ?? '—'} H</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <StickyNote className="w-3 h-3" /> Clinical notes
                      </label>
                      <textarea
                        defaultValue={c.notes || ''}
                        onChange={(e) => setNotesDraft({ ...notesDraft, [c.id]: e.target.value })}
                        rows={2}
                        placeholder="Add your observations…"
                        className="w-full p-3 rounded-xl border border-border bg-card focus:border-olo focus:outline-none resize-none text-sm"
                      />
                      <button
                        onClick={() => saveNotes(c)}
                        className="text-xs font-medium text-olo hover:underline"
                      >
                        Save notes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}