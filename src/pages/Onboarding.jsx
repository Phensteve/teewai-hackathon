import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumeAuthDestination } from '@/lib/authNavigation';
import { resolvePostLoginDest } from '@/lib/portalRouting';
import { unrufld } from '@/api/unrufldClient';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, Check, SkipForward, Target, CalendarClock, Megaphone, Heart, Smile, MapPin } from 'lucide-react';
import { userProfile } from '@/lib/insforgeDb';
import Logo from '@/components/Logo';
import CountrySelect from '@/components/onboarding/CountrySelect';

const GOALS = [
  { value: 'whiten', label: 'A whiter smile', icon: Smile, desc: 'Brighten your shade' },
  { value: 'healthier_gums', label: 'Healthier gums', icon: Heart, desc: 'Improve gum health' },
  { value: 'track_progress', label: 'Track my progress', icon: Target, desc: 'See improvement over time' },
  { value: 'curiosity', label: 'Just curious', icon: Megaphone, desc: 'Try it out' },
];

const FREQUENCY = [
  { value: 'daily', label: 'Every day' },
  { value: 'few_week', label: 'A few times a week' },
  { value: 'rarely', label: 'Rarely' },
];

const HOW_FOUND = [
  { value: 'friend', label: 'Friend or family' },
  { value: 'social', label: 'Social media' },
  { value: 'search', label: 'Google search' },
  { value: 'dentist', label: 'My dentist' },
  { value: 'app_store', label: 'App store' },
  { value: 'from_owner', label: 'From the owner' },
  { value: 'other', label: 'Other' },
];

const MOTIVATION = [
  { value: 'confidence', label: 'Feel more confident', icon: Smile },
  { value: 'event', label: 'An upcoming event', icon: CalendarClock },
  { value: 'health', label: 'Better dental health', icon: Heart },
  { value: 'social', label: 'Look good in photos', icon: Megaphone },
];

const APPLIANCE_OPTIONS = [
  { value: 'none', label: 'No', desc: 'No braces or retainer' },
  { value: 'metal_braces', label: 'Metal braces', desc: 'Traditional brackets' },
  { value: 'ceramic_braces', label: 'Ceramic braces', desc: 'Clear brackets' },
  { value: 'lingual_braces', label: 'Lingual braces', desc: 'Behind the teeth' },
  { value: 'clear_aligners', label: 'Clear aligners', desc: 'Like Invisalign' },
  { value: 'hawley_retainer', label: 'Hawley retainer', desc: 'Wire + acrylic' },
  { value: 'clear_retainer', label: 'Clear retainer', desc: 'Plastic tray' },
  { value: 'fixed_retainer', label: 'Fixed retainer', desc: 'Bonded wire' },
];

const QUESTIONS = ['appliance', 'goal', 'frequency', 'how_found', 'motivation', 'location'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [frequency, setFrequency] = useState('');
  const [howFound, setHowFound] = useState('');
  const [motivation, setMotivation] = useState('');
  const [appliance, setAppliance] = useState('');
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const finish = async (skip = false) => {
    setError('');
    setSaving(true);
    try {
      const payload = skip
        ? { onboarding_completed: true }
        : {
            smile_goal: goal || undefined,
            care_frequency: frequency || undefined,
            how_found: howFound || undefined,
            motivation: motivation || undefined,
            wears_appliance: appliance ? appliance !== 'none' : undefined,
            appliance_type: appliance || undefined,
            country: country || undefined,
            state: stateName || undefined,
            city: city || undefined,
            onboarding_completed: true,
          };
      try { await userProfile.update(payload); } catch {}
      navigate(resolvePostLoginDest({ hasDentistProfile: false, originalReturnTo: consumeAuthDestination() }), { replace: true });
    } catch (e) {
      setError(e?.message || 'Something went wrong');
      setSaving(false);
    }
  };

  // Every step is skippable — the Next button is always enabled. When
  // nothing is selected, the label changes to "Skip" so it's obvious.
  const hasSelection = step === 0 ? !!appliance : step === 1 ? !!goal : step === 2 ? !!frequency : step === 3 ? !!howFound : step === 4 ? !!motivation : true;

  return (
    <div className="relative min-h-screen bg-olo-deep flex flex-col items-center justify-center px-4 py-10 text-white overflow-hidden safe-area-inset-top">
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-olo/25 rounded-full blur-[90px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <Logo size={48} className="mx-auto mb-3 olo-glow" />
          <h1 className="font-heading font-700 text-2xl tracking-tight">Let's personalize teewai</h1>
          <p className="text-white/60 text-sm mt-1">A few quick questions to tailor your experience.</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-6">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-8 bg-olo' : 'w-4 bg-white/20'}`} />
          ))}
        </div>

        <div className="glass rounded-3xl p-6">
          {error && <div className="mb-4 p-3 rounded-lg bg-destructive/20 text-destructive text-sm text-center">{error}</div>}

          {step === 0 && (
            <Question title="Do you wear braces or a retainer?" subtitle="We'll tailor your brushing advice and scan insights.">
              <div className="grid grid-cols-2 gap-2.5">
                {APPLIANCE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setAppliance(o.value)}
                    className={`text-left p-3.5 rounded-2xl border transition-all ${appliance === o.value ? 'border-olo bg-olo/15 ring-2 ring-olo/40' : 'border-white/15 bg-white/5 hover:border-white/30'}`}
                  >
                    <Smile className={`w-4 h-4 mb-1.5 ${appliance === o.value ? 'text-olo' : 'text-white/60'}`} />
                    <p className="font-medium text-sm leading-tight">{o.label}</p>
                    <p className="text-xs text-white/50 mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
            </Question>
          )}
          {step === 1 && (
            <Question title="What's your main smile goal?" subtitle="We'll focus your plan around this.">
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((o) => <Option key={o.value} {...o} active={goal === o.value} onClick={() => setGoal(o.value)} />)}
              </div>
            </Question>
          )}
          {step === 2 && (
            <Question title="How often do you care for your teeth?" subtitle="Be honest. We'll set realistic targets.">
              <div className="space-y-2.5">
                {FREQUENCY.map((o) => <ListOption key={o.value} label={o.label} active={frequency === o.value} onClick={() => setFrequency(o.value)} />)}
              </div>
            </Question>
          )}
          {step === 3 && (
            <Question title="How did you hear about us?" subtitle="Helps us reach more smiles.">
              <div className="space-y-2.5">
                {HOW_FOUND.map((o) => <ListOption key={o.value} label={o.label} active={howFound === o.value} onClick={() => setHowFound(o.value)} />)}
              </div>
            </Question>
          )}
          {step === 4 && (
            <Question title="What motivates you most?" subtitle="We'll keep your reminders on point.">
              <div className="grid grid-cols-2 gap-3">
                {MOTIVATION.map((o) => <Option key={o.value} {...o} active={motivation === o.value} onClick={() => setMotivation(o.value)} />)}
              </div>
            </Question>
          )}
          {step === 5 && (
            <Question title="Where are you based?" subtitle="Optional — helps us find dentists near you.">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Country</label>
                  <CountrySelect value={country} onChange={(v) => { setCountry(v); if (!v) { setStateName(''); setCity(''); } }} />
                </div>
                {country && (
                  <>
                    <div>
                      <label className="text-xs text-white/50 mb-1.5 block">State / Province <span className="text-olo">*</span></label>
                      <input
                        type="text"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="e.g. Lagos, California, Ontario"
                        className="w-full px-4 py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-olo focus:ring-2 focus:ring-olo/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/50 mb-1.5 block">City / Town <span className="text-white/30">(optional)</span></label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Ikeja, Los Angeles, Toronto"
                        className="w-full px-4 py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-olo focus:ring-2 focus:ring-olo/30 transition-all"
                      />
                    </div>
                  </>
                )}
                {!country && (
                  <p className="text-xs text-white/40 flex items-center gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5" /> Skip this step by tapping Finish without selecting a country.
                  </p>
                )}
              </div>
            </Question>
          )}

          <div className="flex items-center gap-3 mt-6">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="h-12 bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            )}
            {step < 5 ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)} className="flex-1 h-12 font-medium bg-olo text-white hover:bg-olo/90">
                {hasSelection ? 'Next' : 'Skip'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="button" onClick={() => finish(false)} disabled={saving} className="flex-1 h-12 font-medium bg-olo text-white hover:bg-olo/90">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {saving ? 'Saving…' : 'Finish'}
              </Button>
            )}
          </div>

          <button onClick={() => finish(true)} disabled={saving} className="w-full mt-4 text-xs text-white/50 hover:text-white/80 inline-flex items-center justify-center gap-1.5">
            <SkipForward className="w-3.5 h-3.5" /> Skip all remaining questions
          </button>
        </div>
      </div>
    </div>
  );
}

function Question({ title, subtitle, children }) {
  return (
    <div>
      <h2 className="font-heading font-600 text-lg mb-1">{title}</h2>
      <p className="text-sm text-white/50 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function Option({ label, desc, icon: Icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-2xl border transition-all ${active ? 'border-olo bg-olo/15 ring-2 ring-olo/40' : 'border-white/15 bg-white/5 hover:border-white/30'}`}
    >
      {Icon && <Icon className={`w-5 h-5 mb-2 ${active ? 'text-olo' : 'text-white/60'}`} />}
      <p className="font-medium text-sm">{label}</p>
      {desc && <p className="text-xs text-white/50 mt-0.5">{desc}</p>}
    </button>
  );
}

function ListOption({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center justify-between p-3.5 rounded-2xl border transition-all ${active ? 'border-olo bg-olo/15' : 'border-white/15 bg-white/5 hover:border-white/30'}`}
    >
      <span className="font-medium text-sm">{label}</span>
      <span className={`w-4 h-4 rounded-full border-2 ${active ? 'border-olo bg-olo' : 'border-white/30'}`} />
    </button>
  );
}