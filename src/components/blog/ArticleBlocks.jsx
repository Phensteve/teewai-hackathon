// Rich block renderers for the teewai blog. Each article is an ordered list of
// typed sections so posts can carry tables, charts, shade swatches and
// conference callouts alongside prose — the kind of supporting evidence that
// makes a research-grounded article read as authentic.
import { ExternalLink, Table as TableIcon, BarChart3, Palette, Info, Mic } from 'lucide-react';

export function Paragraph({ text }) {
  return <p className="text-[0.95rem] sm:text-base text-foreground/85 leading-relaxed">{text}</p>;
}

export function Table({ title, headers, rows, note }) {
  return (
    <figure className="my-1">
      {title && (
        <figcaption className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-olo mb-2">
          <TableIcon className="w-3.5 h-3.5" /> {title}
        </figcaption>
      )}
      <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-olo/10">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`text-left font-heading font-700 px-3.5 py-2.5 text-foreground/90 border-b border-border ${
                    i === 0 ? 'sticky left-0 bg-olo/10 z-10' : ''
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={i} className="bg-card even:bg-muted/30 hover:bg-olo/5 transition-colors">
                {r.map((c, j) =>
                  j === 0 ? (
                    // First column = row header, so the vertical axis is labelled
                    // (scope="row") for semantics and visually distinguished.
                    <th
                      key={j}
                      scope="row"
                      className="text-left font-heading font-600 px-3.5 py-2.5 align-top text-foreground whitespace-nowrap sticky left-0 bg-card even:bg-muted/30 z-10 border-r border-border"
                    >
                      {c}
                    </th>
                  ) : (
                    <td key={j} className="px-3.5 py-2.5 align-top text-foreground/80 break-words min-w-[8rem]">
                      {c}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{note}</p>}
    </figure>
  );
}

export function BarChart({ title, bars, unit = '', caption }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <figure className="my-1">
      {title && (
        <figcaption className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-olo mb-3">
          <BarChart3 className="w-3.5 h-3.5" /> {title}
        </figcaption>
      )}
      <div className="space-y-2">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2.5">
            <span className="w-28 sm:w-32 text-xs text-muted-foreground truncate">{b.label}</span>
            <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(b.value / max) * 100}%`, backgroundColor: b.color || 'hsl(var(--olo))' }}
              />
            </div>
            <span className="w-12 text-right text-xs font-semibold tabular-nums text-foreground/80">{b.value}{unit}</span>
          </div>
        ))}
      </div>
      {caption && <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">{caption}</p>}
    </figure>
  );
}

export function Swatches({ title, items }) {
  return (
    <figure className="my-1">
      {title && (
        <figcaption className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-olo mb-3">
          <Palette className="w-3.5 h-3.5" /> {title}
        </figcaption>
      )}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {items.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <div
              className="w-full aspect-square rounded-lg border border-border shadow-sm"
              style={{ backgroundColor: s.hex }}
              aria-label={s.label}
            />
            <span className="text-[10px] font-heading font-600 text-foreground/80">{s.label}</span>
            {s.note && <span className="text-[9px] text-muted-foreground leading-none text-center">{s.note}</span>}
          </div>
        ))}
      </div>
    </figure>
  );
}

// Only allow safe URL schemes in blog callout links — blog content is
// admin-approved, but defense-in-depth blocks javascript:/data: payloads
// that could otherwise execute from a clickable href.
const SAFE_HREF = /^(https?:|mailto:|tel:)/i;

export function Callout({ variant = 'info', title, text, href, linkText }) {
  const isConference = variant === 'conference';
  const safeHref = href && SAFE_HREF.test(href) ? href : null;
  return (
    <div
      className={`my-1 p-4 rounded-2xl border flex items-start gap-3 ${
        isConference
          ? 'bg-gradient-to-br from-olo-deep to-[#062a30] border-olo/30 text-white'
          : 'bg-olo/5 border-olo/20 text-foreground'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isConference ? 'bg-olo/20' : 'bg-olo/15'}`}>
        {isConference ? <Mic className="w-4 h-4 text-olo-glow" /> : <Info className="w-4 h-4 text-olo" />}
      </div>
      <div className="flex-1">
        {title && (
          <p className={`font-heading font-700 text-sm mb-1 ${isConference ? 'text-olo-glow' : 'text-olo'}`}>{title}</p>
        )}
        <p className={`text-sm leading-relaxed ${isConference ? 'text-white/75' : 'text-muted-foreground'}`}>{text}</p>
        {safeHref && (
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline ${isConference ? 'text-olo-glow' : 'text-olo'}`}
          >
            {linkText || 'Read more'} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function List({ items, ordered }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag
      className={`my-1 ${ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1.5 text-[0.95rem] text-foreground/85 leading-relaxed marker:text-olo`}
    >
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </Tag>
  );
}

export function SectionRenderer({ section }) {
  switch (section.type) {
    case 'p': return <Paragraph text={section.text} />;
    case 'table': return <Table {...section} />;
    case 'chart': return <BarChart {...section} />;
    case 'swatches': return <Swatches {...section} />;
    case 'callout': return <Callout {...section} />;
    case 'list': return <List {...section} />;
    default: return null;
  }
}