import { COMMUNITY_GUIDELINES } from '@/lib/communityGuidelines';

// The "house rules" section of the Common Room welcome page — friendly, premium
// cards. Mirrors the Blog's quiet card aesthetic so the two content pages feel
// like sisters, while the guideline framing keeps community distinct.
export default function CommunityGuidelines() {
  return (
    <section className="mb-12 sm:mb-16">
      <span className="text-olo font-semibold text-xs sm:text-sm uppercase tracking-widest">House rules</span>
      <h2 className="mt-2 font-heading font-700 text-2xl sm:text-3xl tracking-tight text-balance">
        A few friendly guidelines
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-2xl text-balance">
        So the Common Room stays a safe, welcoming space for everyone on their smile journey.
      </p>
      <div className="mt-6 grid sm:grid-cols-2 gap-4 sm:gap-5">
        {COMMUNITY_GUIDELINES.map((g) => {
          const Icon = g.icon;
          return (
            <div
              key={g.title}
              className="p-5 rounded-2xl border border-border bg-card hover:border-olo/30 hover:shadow-lg hover:shadow-olo/5 transition-all duration-300"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-olo" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-600 text-base leading-snug">{g.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{g.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}