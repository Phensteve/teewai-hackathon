// teewai version history — real landmark changes with real dates. Displayed
// on the News & Updates page as a timeline. Ordered newest-first.
// teewai officially launched on July 26, 2026.

export const NEWS_UPDATES = [
  {
    version: '1.7.0',
    date: '2026-08-24',
    title: 'Food Scan on the Landing Page',
    tag: 'content',
    summary: 'A live food-scan section on the landing page and a blog post explaining how the stain tracker works. The food scan itself shipped in 1.2.0.',
    changes: [
      'Landing page section showing how a plate photo becomes a per-item stain score.',
      'Blog post: How teewai Reads Your Plate — the food scan behind your stain load.',
      'Cover images added across every blog post.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-08-19',
    title: 'Common Room & Verified Badges',
    tag: 'feature',
    summary: 'A community space with public rooms, verified badges for vetted members, and a members-only Insider Updates room.',
    changes: [
      'Common Room: threaded discussion with public rooms and a members-only Insider Updates room.',
      'Verified badges — admins can mark vetted members with a teewai checkmark.',
      'Guests post as "Not signed in"; signed-in members show display name and username.',
      'Server-side profanity filtering on every message.',
      'This News & Updates page shipped here too.',
    ],
  },
  {
    version: null,
    date: '2026-08-17',
    title: 'Listed on StartupList Africa',
    tag: 'milestone',
    summary: 'teewai added to a curated directory of startups from the continent.',
    changes: [
      'Featured on StartupList Africa.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-08-15',
    title: 'Smile MMR & Leaderboards',
    tag: 'feature',
    summary: 'Scans now award MMR. Climb seasonal leaderboards, earn streak shields, and unlock traits.',
    changes: [
      'Smile MMR with seasonal resets and streak shields that protect a streak from one missed day.',
      'Global and friends leaderboards with per-user opt-out.',
      'Milestone tracking, lucky charms, and rare color badges on the Collection page.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-08-11',
    title: 'Family Plans & Find-a-Dentist',
    tag: 'launch',
    summary: 'Share scans across your household and search nearby dentists who are accepting new patients.',
    changes: [
      'Family subscriptions with a shared scan pool and per-member limits.',
      'Find-a-Dentist directory with map view and an accepting-patients filter.',
      'Dentist clinical portal for viewing patient scans and recording treatment.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-08-07',
    title: 'Research Blog & WASET',
    tag: 'content',
    summary: 'Evidence-backed articles on shade science, published CIE Lab methodology, and WASET conference participation.',
    changes: [
      'Research blog with articles on VITA shade science and whitening chemistry, each with citations.',
      'CIE Lab color space methodology published so shade measurement is reproducible and auditable.',
      'Participation in the World Academy of Science, Engineering and Technology (WASET) conference.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-03',
    title: 'Stain Tracker',
    tag: 'feature',
    summary: 'Log what you eat and drink and see the cumulative stain load for the day, with a 7-day history.',
    changes: [
      'Food scanning with multi-item identification — every component on the plate is logged separately.',
      'Nigerian and West African staple catalog (jollof, egusi, suya, zobo, and more).',
      '7-day stain load history with calorie tracking on a dual-axis chart.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-30',
    title: 'Full-Scan Multi-Angle Analysis',
    tag: 'improvement',
    summary: 'Five-photo composite scans for full smile-zone coverage, with per-tooth whitening targets.',
    changes: [
      'Full scan captures five angles (front, upper, lower, left, right) and composites them into one assessment.',
      'Per-tooth whitening targets with week-by-week projections.',
      'Reference card detection for active RGB color correction so shade readings stay calibrated.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-26',
    title: 'teewai Launches',
    tag: 'launch',
    summary: 'Instant shade analysis, whitening previews, and VITA Classical matching — live.',
    changes: [
      'AI shade analysis from a single phone photo, using computer vision on the smile zone.',
      'Instant whitening preview rendered on-canvas (deterministic, not AI-generated).',
      'VITA Classical 16-shade matching with calibrated hex values.',
      'Quick scan (1 credit) and full scan (3 credits).',
    ],
  },
];

// Tag pills — semantic tokens only (no hardcoded emerald/blue/purple/amber).
// Launch is the strongest (solid olo), milestone carries the champagne accent,
// the rest sit in restrained neutral tones so the page reads as a changelog,
// not a confetti board.
export const TAG_STYLES = {
  feature: { label: 'Feature', cls: 'bg-olo/15 text-olo border-olo/30' },
  launch: { label: 'Launch', cls: 'bg-olo/20 text-olo border-olo' },
  improvement: { label: 'Improvement', cls: 'bg-muted text-muted-foreground border-border' },
  content: { label: 'Content', cls: 'bg-foreground/5 text-foreground/80 border-foreground/15' },
  milestone: { label: 'Milestone', cls: 'bg-champagne/10 text-foreground border-champagne/50' },
};

export const formatDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });