import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, LifeBuoy, Camera, CreditCard, ShieldCheck, Rocket, MessageSquare, Utensils } from 'lucide-react';
import BackButton from '@/components/BackButton';
import HelpChat from '@/components/HelpChat';

const CATEGORIES = [
  {
    id: 'start',
    label: 'Getting started',
    icon: Rocket,
    items: [
      { q: 'How do I take my first scan?', a: 'Create a free account, open the Dashboard, and tap "Scan my teeth". Point your camera at your smile in good lighting, snap a photo, and teewai analyzes it in seconds. Your first scans are free — no credit card needed.' },
      { q: 'What do I need for a good scan?', a: 'Good natural lighting, a clear front-facing photo of your teeth, and ideally a white index card or VITA shade tab in frame for color calibration. teewai will tell you exactly what to fix if the photo isn\u2019t usable.' },
      { q: 'Is teewai a medical device?', a: 'No. teewai is a wellness companion — it guides your cosmetic whitening journey. Always see your dentist for clinical concerns, checkups, and diagnosis.' },
    ],
  },
  {
    id: 'scans',
    label: 'Scans & scores',
    icon: Camera,
    items: [
      { q: 'How does teewai score my teeth?', a: 'teewai\u2019s vision engine maps each tooth in your photo, measures brightness and shade against the VITA Classical scale (the same one dentists use), and checks for stains, plaque, and enamel wear. The result is a 0\u2013100 whiteness score, broken down per tooth.' },
      { q: 'Why did teewai ask for another photo?', a: 'If the image is blurry, poorly lit, or doesn\u2019t show all your teeth, teewai tells you exactly what to fix and requests a retake — so you never waste a scan on a bad photo.' },
      { q: 'How accurate is the shade reading?', a: 'Best results come with a white reference card or VITA shade tab in frame. Without one, teewai still works, but consistent natural lighting matters a lot.' },
      { q: 'What are streaks, MMR, and shields?', a: 'Scanning regularly builds your streak and Smile MMR (your ranking score). Streak shields protect your streak when you miss a day. You earn rewards and milestones as you progress.' },
    ],
  },
  {
    id: 'food',
    label: 'Food & stain tracking',
    icon: Utensils,
    items: [
      { q: 'What is the food scan?', a: 'Snap a photo of your meal and teewai identifies every item on the plate, then scores each on the three properties that stain teeth: chromogenicity (color intensity), acidity, and tannins. The numbers roll up into your daily stain load \u2014 a running total of how much staining pressure your teeth are under.' },
      { q: 'Does the food scan track calories and macros?', a: 'Yes. teewai estimates the visible portion from the plate and utensils, then reports calories plus protein, carbs, and fat for each item. It is a portion-aware estimate, not a lab measurement \u2014 use it to spot patterns, not to count every gram.' },
      { q: 'Why log what I eat?', a: 'Your teeth scan shows where your shade is today; your food scan shows what is pulling it darker tomorrow. Logging a few meals lets teewai connect the two, so your whitening plan accounts for what you actually consume \u2014 not an idealized diet.' },
      { q: 'What is a "stain load"?', a: 'Your daily stain load is the sum of every food and drink you log, weighted by how staining each one is. Coffee, tea, and red wine score high; water and cheese score low. A high load doesn\u2019t mean your teeth are doomed \u2014 a water rinse, a straw, or spacing your cups apart offsets most of it.' },
      { q: 'teewai misidentified my food \u2014 what do I do?', a: 'The vision model is good but not perfect, especially with mixed or covered dishes. If it logs the wrong item, delete the entry from the stain tracker and log it manually, or scan again from a clearer angle.' },
    ],
  },
  {
    id: 'billing',
    label: 'Plans & billing',
    icon: CreditCard,
    items: [
      { q: 'What plans are available?', a: 'Free (2 scans), scan packs (2, 15, or 30 scans with no subscription), Pro monthly (unlimited scans), and Pro yearly (unlimited, 16% cheaper than monthly).' },
      { q: 'How do I pay?', a: 'We accept cards and local payment methods via Paystack, in USD or Naira. Choose your currency on the pricing page.' },
      { q: 'Can I cancel anytime?', a: 'Yes. Scan packs never expire and have no recurring billing. Subscriptions can be canceled anytime and remain active until the end of the billing period.' },
      { q: 'I paid but my scans didn\u2019t appear — what do I do?', a: 'Payments usually reflect instantly. If yours didn\u2019t, contact us through Customer Service with your payment reference and we\u2019ll fix it fast.' },
    ],
  },
  {
    id: 'account',
    label: 'Account & privacy',
    icon: ShieldCheck,
    items: [
      { q: 'Is my photo private?', a: 'Yes. Your scans are encrypted and tied to your account alone. You can delete any scan or your entire history at any time. We never sell your photos and never use them to train models.' },
      { q: 'How do I reset my password?', a: 'On the login page, tap "Forgot password?" and enter your email. We\u2019ll send you a secure reset link.' },
      { q: 'Can I change my username or name?', a: 'Yes — open your Profile from the app menu to update your username, name, and preferences.' },
      { q: 'How do I delete my account?', a: 'Contact us via Customer Service and we\u2019ll process your deletion request, including all your scans and data.' },
    ],
  },
];

export default function HelpCenter() {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((c) => ({
      ...c,
      items: c.items.filter((it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)),
    })).filter((c) => c.items.length);
  }, [query]);

  return (
    <div className="min-h-screen bg-background text-foreground safe-area-inset-top">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <BackButton fallback="/" className="mb-8" />
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
            <LifeBuoy className="w-6 h-6 text-olo" />
          </div>
          <h1 className="font-heading font-700 text-3xl sm:text-4xl tracking-tight">Help Center</h1>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto text-sm">
            Answers to the most common questions about scans, scores, plans, and your account.
          </p>
          <div className="relative max-w-md mx-auto mt-6">
            <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for answers…"
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:border-olo transition-colors"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            No results for “{query}”. Try a different term or <Link to="/support" className="text-olo hover:underline">contact us</Link>.
          </p>
        ) : (
          <div className="space-y-8">
            {filtered.map((cat) => (
              <section key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  <cat.icon className="w-4 h-4 text-olo" />
                  <h2 className="font-heading font-600 text-sm uppercase tracking-wider text-muted-foreground">{cat.label}</h2>
                </div>
                <div className="space-y-2">
                  {cat.items.map((it) => {
                    const id = `${cat.id}-${it.q}`;
                    const open = openId === id;
                    return (
                      <div key={id} className="rounded-2xl border border-border bg-card overflow-hidden">
                        <button
                          onClick={() => setOpenId(open ? null : id)}
                          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                        >
                          <span className="text-sm font-medium">{it.q}</span>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                        {open && (
                          <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{it.a}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* AI assistant — grounded in the FAQ above */}
        <div className="mt-12 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-olo" />
            <h2 className="font-heading font-600 text-sm uppercase tracking-wider text-muted-foreground">Ask the assistant</h2>
          </div>
          <HelpChat faq={CATEGORIES} />
        </div>

        <div className="p-6 sm:p-8 rounded-3xl border border-olo/25 bg-olo/5 text-center">
          <MessageSquare className="w-8 h-8 text-olo mx-auto mb-3" />
          <h3 className="font-heading font-600 text-lg mb-1">Still need help?</h3>
          <p className="text-sm text-muted-foreground mb-5">Our team reads every message and replies by email.</p>
          <a
            href="https://teewai.base44.app/support"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-olo text-white text-sm font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Contact Customer Service
          </a>
        </div>
      </div>
    </div>
  );
}