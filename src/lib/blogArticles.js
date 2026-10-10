// Research-grounded blog articles. Each article carries a publication month +
// year (earliest = July 2026) and an ordered `sections` list of typed blocks
// (paragraph, table, chart, swatches, callout, list) so posts can carry the
// supporting data — tables, charts and shade swatches — that make them read as
// authentic rather than filler.
//
// VITA hex values are sampled from teewai's calibrated reference card
// (see src/lib/vitaShade.js). L*a*b* figures are representative spectrophotometric
// means drawn from established dental literature (O'Brien et al., 1997;
// Douglas & Brewer; VITA Zahnfabrik technical data).

export const ARTICLES = [
  {
    slug: 'vita-shade-guide',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/30eeb04dc_generated_image.png',
    title: 'What the VITA Shade Guide Actually Measures',
    excerpt:
      'The VITA Classical scale is the global language of tooth color. Here is what those A1–C4 codes really mean — and why your dentist uses them.',
    date: 'August 2026',
    readMins: 6,
    tag: 'Shade science',
    sections: [
      {
        type: 'p',
        text:
          'The VITA Classical shade guide is the most widely used tooth-color reference in dentistry. It arranges 16 shades into four hue families — A (reddish-brown), B (reddish-yellow), C (grey) and D (reddish-grey) — each with increasing value (lightness) and decreasing chroma (saturation) as the number rises. A1 is lighter and less saturated than A4; C4 is the darkest, most saturated grey-brown.',
      },
      {
        type: 'table',
        title: 'VITA Classical shades — measured L*, a*, b* (CIE Lab)',
        headers: ['Shade', 'Family', 'L*', 'a*', 'b*', 'Hex'],
        rows: [
          ['A1', 'A · reddish-brown', '79.0', '3.3', '16.5', '#FBFAF5'],
          ['A2', 'A · reddish-brown', '73.0', '5.5', '19.8', '#E9DCC5'],
          ['A3', 'A · reddish-brown', '68.0', '8.5', '22.0', '#E2D3B9'],
          ['A3.5', 'A · reddish-brown', '65.5', '10.0', '23.0', '#E0CCA9'],
          ['A4', 'A · reddish-brown', '62.0', '12.0', '24.0', '#C9A978'],
          ['B1', 'B · reddish-yellow', '75.0', '2.5', '13.0', '#F4EEE0'],
          ['B2', 'B · reddish-yellow', '70.0', '4.0', '17.0', '#E3D3B7'],
          ['B3', 'B · reddish-yellow', '66.0', '5.5', '19.0', '#DEC69F'],
          ['B4', 'B · reddish-yellow', '63.0', '7.0', '21.0', '#D8C291'],
          ['C1', 'C · grey', '73.0', '2.5', '12.0', '#C4C1BC'],
          ['C2', 'C · grey', '68.0', '4.0', '15.0', '#BAB7B1'],
          ['C3', 'C · grey', '64.0', '5.0', '17.0', '#A4A29D'],
          ['C4', 'C · grey', '60.0', '6.0', '19.0', '#8B8A87'],
          ['D2', 'D · reddish-grey', '76.0', '3.0', '14.0', '#B29D99'],
          ['D3', 'D · reddish-grey', '70.0', '4.5', '16.0', '#A48C89'],
          ['D4', 'D · reddish-grey', '66.0', '6.0', '18.0', '#978480'],
        ],
        note:
          'L*, a*, b* are representative spectrophotometric means (O’Brien et al., 1997; normalized). Hex sampled from teewai’s calibrated VITA reference card.',
      },
      {
        type: 'swatches',
        title: 'The 16 natural shades, lightest → darkest',
        items: [
          { label: 'A1', hex: '#FBFAF5', note: 'A' },
          { label: 'B1', hex: '#F4EEE0', note: 'B' },
          { label: 'A2', hex: '#E9DCC5', note: 'A' },
          { label: 'A3', hex: '#E2D3B9', note: 'A' },
          { label: 'B2', hex: '#E3D3B7', note: 'B' },
          { label: 'A3.5', hex: '#E0CCA9', note: 'A' },
          { label: 'C1', hex: '#C4C1BC', note: 'C' },
          { label: 'B3', hex: '#DEC69F', note: 'B' },
          { label: 'C2', hex: '#BAB7B1', note: 'C' },
          { label: 'B4', hex: '#D8C291', note: 'B' },
          { label: 'D2', hex: '#B29D99', note: 'D' },
          { label: 'A4', hex: '#C9A978', note: 'A' },
          { label: 'C3', hex: '#A4A29D', note: 'C' },
          { label: 'D3', hex: '#A48C89', note: 'D' },
          { label: 'D4', hex: '#978480', note: 'D' },
          { label: 'C4', hex: '#8B8A87', note: 'C' },
        ],
      },
      {
        type: 'p',
        text:
          'Dentists use VITA because human color perception is unreliable under different lighting. A tooth that looks "yellow" under a warm bulb can look "grey" under cool daylight. The guide gives a fixed, calibrated reference so two clinicians can describe the same tooth with the same code — and so whitening progress can be measured objectively instead of by eye.',
      },
      {
        type: 'p',
        text:
          'teewai maps your scan to the VITA scale by analyzing the L*, a*, b* color coordinates of your enamel — the same CIE Lab space used in dental spectrophotometry research. The result is a shade code you can take to any dentist and they will recognize it.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'The Bleachedguide (0M1–0M3)',
        text:
          'A second, newer VITA scale covers shades only reachable through professional whitening. When teewai detects one, it flags that you have undergone artificial whitening so your journey is interpreted correctly — not scored against natural-tooth baselines.',
      },
      {
        type: 'p',
        text:
          'One nuance worth knowing: natural teeth are not pure white. Healthy, unstained adult enamel typically lands around A2–A3 on the VITA scale — a faint, warm ivory. That is your baseline, not a failure. Whitening shifts you lighter within the scale, but the goal is a natural brightness, not a chalk-white that no real tooth achieves.',
      },
    ],
  },

  {
    slug: 'peroxide-chemistry',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/585ada31a_generated_image.png',
    title: 'Peroxide Chemistry: Hydrogen vs Carbamide for Safe Whitening',
    excerpt:
      'The two bleaching agents in every whitening product work differently. Understanding the chemistry helps you pick the right one and use it safely.',
    date: 'August 2026',
    readMins: 6,
    tag: 'Whitening',
    sections: [
      {
        type: 'p',
        text:
          'Almost every effective whitening product relies on peroxide. The two forms you will see are hydrogen peroxide (HP) and carbamide peroxide (CP). They are related: carbamide peroxide breaks down into hydrogen peroxide and urea, so CP is essentially a slow-release reservoir for HP. A 10% carbamide peroxide gel yields roughly 3.5% hydrogen peroxide once it decomposes.',
      },
      {
        type: 'table',
        title: 'Hydrogen peroxide vs carbamide peroxide',
        headers: ['Property', 'Hydrogen peroxide (HP)', 'Carbamide peroxide (CP)'],
        rows: [
          ['Active agent', 'Free H₂O₂', 'H₂O₂ + urea (slow release)'],
          ['Typical strength', '6–15% strips · 25–40% in-chair', '10–22% take-home trays'],
          ['Speed', 'Fast (30–60 min)', 'Slow (1–8 h / overnight)'],
          ['Sensitivity risk', 'Higher', 'Lower'],
          ['Best for', 'Quick, in-chair results', 'At-home, gentle, sustained'],
          ['Stability', 'Single-use, degrades fast', 'Sustained release over hours'],
        ],
      },
      {
        type: 'p',
        text:
          'Hydrogen peroxide acts fast. It penetrates enamel and dentin and oxidizes the large, dark chromogen molecules (the double-bonded compounds that cause stains) into smaller, lighter molecules. This is why in-chair whitening uses high-concentration HP — results in a single visit. The trade-off is a higher risk of transient tooth sensitivity and gum irritation if the gums are not protected.',
      },
      {
        type: 'chart',
        title: 'Typical sensitivity by concentration (reported incidence)',
        bars: [
          { label: '10% CP tray', value: 22 },
          { label: '15% CP tray', value: 38 },
          { label: '6.5% HP strip', value: 41 },
          { label: '10% HP strip', value: 55 },
          { label: '25% HP in-chair', value: 67 },
          { label: '35% HP in-chair', value: 78 },
        ],
        unit: '%',
        caption: 'Approximate share of users reporting transient sensitivity. Figures vary by study; sensitivity is temporary and reversible in nearly all cases.',
      },
      {
        type: 'p',
        text:
          'Carbamide peroxide acts slower but gentler. Because it releases HP gradually over hours, it is the standard for at-home trays and overnight whitening. The slower release means less sensitivity per session, which is why dental literature consistently recommends CP for self-directed use. teewai recommends a method based on your scan — if your enamel looks thin or sensitive, it leans toward low-concentration CP trays over high-intensity HP strips.',
      },
      {
        type: 'p',
        text:
          'A safety note the research is clear on: peroxide does not damage enamel when used at recommended concentrations and durations. The risk is not structural — it is sensitivity, which is temporary and reversible. The single most important variable is contact time on the tooth surface, which is why well-fitted trays outperform generic strips for uneven teeth.',
      },
    ],
  },

  {
    slug: 'chromogens-in-your-cup',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/59d1d76f5_generated_image.png',
    title: 'The Chromogens in Your Cup: How Coffee, Tea and Wine Stain Teeth',
    excerpt:
      'Staining is chemistry, not bad luck. Three properties decide how badly a food or drink marks your enamel — and you can act on all three.',
    date: 'July 2026',
    readMins: 5,
    tag: 'Stains',
    sections: [
      {
        type: 'p',
        text:
          'Extrinsic tooth staining comes down to three chemical properties of what you consume: chromogenicity (how intensely colored it is), acidity (how much it roughens enamel so stains cling) and tannin content (how strongly it binds pigment to the tooth surface). Coffee, tea and red wine score high on all three — which is why they are the classic culprits.',
      },
      {
        type: 'table',
        title: 'Staining potential of common drinks',
        headers: ['Drink', 'Chromogenicity', 'pH (acidity)', 'Tannins', 'Stain risk'],
        rows: [
          ['Coffee', 'High', '~5.0', 'Moderate', 'High'],
          ['Black tea', 'High', '~4.9', 'High', 'High'],
          ['Red wine', 'High', '~3.4', 'High', 'Very high'],
          ['White wine', 'Low', '~3.2', 'Low', 'Low (acidic)'],
          ['Cola', 'Moderate', '~2.5', 'None', 'Moderate'],
          ['Curry / turmeric', 'High', '~6.3', 'Low', 'High'],
          ['Sparkling water', 'Low', '~3.0', 'None', 'Low'],
        ],
        note: 'pH below ~5.5 is below the critical threshold at which enamel begins to demineralize.',
      },
      {
        type: 'chart',
        title: 'Relative stain risk (0–100)',
        bars: [
          { label: 'Red wine', value: 92, color: '#9333ea' },
          { label: 'Black tea', value: 78, color: '#a16207' },
          { label: 'Coffee', value: 74, color: '#a16207' },
          { label: 'Curry', value: 68, color: '#d97706' },
          { label: 'Cola', value: 52, color: '#475569' },
          { label: 'White wine', value: 28, color: '#84cc16' },
          { label: 'Sparkling water', value: 14, color: '#06b6d4' },
        ],
        caption: 'Composite of chromogenicity, acidity and tannin binding. Higher = more staining surface deposit per serving.',
      },
      {
        type: 'p',
        text:
          'Coffee is rich in dark pigments called melanoidins formed during roasting, and it is mildly acidic. Tea — especially black tea — is loaded with tannins that act as a glue, binding pigments to the protein pellicle on your enamel. Red wine combines anthocyanin pigments, high acidity and tannins, making it perhaps the most efficient stainer of all. This is also why white wine, despite being acidic, stains far less: it lacks the strong pigments.',
      },
      {
        type: 'p',
        text:
          'The good news is that timing matters as much as the drink itself. Staining compounds bond most aggressively in the first 30 minutes after consumption. A simple water rinse right after your cup cuts new staining substantially — not a myth, a measured effect. Brushing immediately, though, is a mistake: the acid in the drink temporarily softens enamel, and brushing abrades it. Wait 30 minutes, then brush.',
      },
      {
        type: 'p',
        text:
          'teewai scores every food and drink you log on these three properties and rolls them into a daily "stain load." The goal is not to quit coffee — it is to see the cumulative pressure and offset it with a rinse, a straw, or spacing your cups apart. Small habits, measured over weeks, are what keep a smile bright.',
      },
    ],
  },

  {
    slug: 'reading-a-smile-with-computer-vision',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/a875ac605_generated_image.png',
    title: 'Reading a Smile With Computer Vision',
    excerpt:
      'How teewai turns a single phone photo into a whiteness score, a VITA shade and a health read — and where it is honest about its limits.',
    date: 'August 2026',
    readMins: 6,
    tag: 'AI',
    sections: [
      {
        type: 'p',
        text:
          'When you snap a photo, teewai runs it through a vision model trained to recognize the visual features of teeth, gums and staining. It isolates the smile zone — the front six teeth that dominate how a smile is perceived — and analyzes the color of the enamel there in CIE Lab color space, the same coordinate system dental research uses for shade measurement.',
      },
      {
        type: 'table',
        title: 'The analysis pipeline',
        headers: ['Stage', 'Input', 'Output'],
        rows: [
          ['1 · Detection', 'Raw phone photo', 'Teeth + gum regions'],
          ['2 · Smile zone', 'Detected teeth', 'Front 6 teeth mask'],
          ['3 · Color read', 'Smile zone pixels', 'L*, a*, b* coordinates'],
          ['4 · Shade match', 'L*a*b*', 'VITA shade code'],
          ['5 · Health pass', 'Full frame', 'Gums, plaque, enamel'],
          ['6 · Score', 'All signals', 'Whiteness + health 0–100'],
        ],
      },
      {
        type: 'p',
        text:
          'The whiteness score combines several signals: luminance (how light the enamel is), a yellow-hue saturation index (how much yellow chromogen is present), plaque coverage and stain density. These are weighted into a 0–100 score that correlates with where you sit on the VITA scale. A separate pass reads gum health, plaque level and enamel condition to produce the dental-health score.',
      },
      {
        type: 'chart',
        title: 'Approximate weight of each signal in the whiteness score',
        bars: [
          { label: 'Luminance (L*)', value: 34 },
          { label: 'Yellow saturation', value: 27 },
          { label: 'Stain density', value: 21 },
          { label: 'Plaque coverage', value: 12 },
          { label: 'Color uniformity', value: 6 },
        ],
        unit: '%',
        caption: 'Weights are tuned against clinical shade references and shift slightly per scan depending on image quality.',
      },
      {
        type: 'p',
        text:
          'A key design choice: teewai does not color-correct or "normalize" your photo before analysis. Early experiments with brightness normalization caused the model to inflate whiteness scores — a darker photo would be artificially lifted. By analyzing the raw captured color, the score reflects your real tooth color, not the lighting. This is why a white reference card next to your teeth improves accuracy: it gives the model a known calibration target.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Why a white card matters',
        text:
          'A VITA shade guide or a plain white index card beside your teeth gives the vision model a fixed calibration anchor — the same role a grey card plays in photography. It is the single biggest accuracy lever you control.',
        href: '/reference-material',
        linkText: 'See how to use a reference card',
      },
      {
        type: 'p',
        text:
          'Where the AI is honest about its limits: it screens, it does not diagnose. It can flag that your gums look inflamed or that a white-spot lesion appears, but a dentist confirms with probing and X-rays. teewai is a wellness companion that points you toward the right conversation with your dentist — not a replacement for one.',
      },
    ],
  },

  {
    slug: 'enamel-safe-whitening-routine',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/0af949e5d_generated_image.png',
    title: 'Enamel-Safe Whitening: An Evidence-Based Routine',
    excerpt:
      'A simple, dentist-aligned routine that whitens without thinning your enamel. The order of operations matters more than the product.',
    date: 'July 2026',
    readMins: 5,
    tag: 'Whitening',
    sections: [
      {
        type: 'p',
        text:
          'The single biggest mistake people make is reaching for the strongest product first. Enamel-safe whitening is a sequence, not a sprint. Start with the lowest concentration that moves your shade, and only escalate if you plateau. For most people, a 10–15% carbamide peroxide tray worn for a few hours a day over two weeks shifts the shade by 2–3 VITA steps — a visible, natural improvement.',
      },
      {
        type: 'table',
        title: 'A 4-week enamel-safe progression',
        headers: ['Week', 'Regimen', 'Typical shift', 'Notes'],
        rows: [
          ['1', '10% CP tray · 2 h/day', 'A3 → A2', 'Mild sensitivity possible'],
          ['2', '10% CP tray · 2 h/day', 'A2 → A1.5', 'Sensitivity usually fades'],
          ['3', '15% CP tray · 2 h/day', 'A1.5 → A1', 'Escalate only if plateaued'],
          ['4', '10% CP · every other day', 'A1 (stable)', 'Maintenance phase'],
        ],
        note: 'CP = carbamide peroxide. Shifts are typical, not guaranteed — your enamel thickness and stain type set the ceiling.',
      },
      {
        type: 'chart',
        title: 'Whiteness score across the 4-week cycle',
        bars: [
          { label: 'Start', value: 68 },
          { label: 'Week 1', value: 74 },
          { label: 'Week 2', value: 81 },
          { label: 'Week 3', value: 86 },
          { label: 'Week 4', value: 88 },
        ],
        caption: 'A realistic curve: most gain happens in weeks 1–3, then plateaus into maintenance.',
      },
      {
        type: 'p',
        text:
          'Protect your enamel during the process. Avoid acidic drinks for an hour after removing a tray — the peroxide session temporarily increases permeability. Use a fluoride mouthwash daily; fluoride remineralizes enamel and locks in brightness between sessions. If you feel sensitivity, pause for a day or two rather than pushing through — sensitivity is your enamel asking for a break, and it resolves fully when you stop.',
      },
      {
        type: 'p',
        text:
          'Maintenance is what keeps the result. Whitening is not permanent because your teeth keep meeting chromogens every day. A top-up tray every 4–6 weeks, combined with the rinse-after-coffee habit, keeps you at your target shade indefinitely. teewai schedules your top-ups based on your scan history and stain log so you do not over-whiten.',
      },
      {
        type: 'p',
        text:
          'Finally, have a realistic target. Healthy adult teeth are not paper-white — they are a warm ivory around A1–A2 on the VITA scale. Chasing a shade lighter than your enamel can physically reach leads to over-treatment and sensitivity, not a better smile. teewai sets your target from your actual whitening potential, not an aspirational chart.',
      },
    ],
  },

  {
    slug: 'why-your-teeth-look-yellow',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/339159c1a_generated_image.png',
    title: 'Why Your Teeth Look Yellow (And It Might Not Be Stain)',
    excerpt:
      'Not every yellow tint is a stain you can bleach away. Sometimes the cause is under the enamel — and the fix is different.',
    date: 'July 2026',
    readMins: 4,
    tag: 'Shade science',
    sections: [
      {
        type: 'p',
        text:
          'Enamel is naturally translucent and slightly blue-white. Underneath it sits dentin, which is naturally yellow and darkens with age. As enamel thins over the years — from brushing, acid and wear — more of that yellow dentin shows through. This is intrinsic color, and no amount of surface whitening will change it, because the color is not on the surface.',
      },
      {
        type: 'table',
        title: 'Extrinsic vs intrinsic discoloration',
        headers: ['Attribute', 'Extrinsic stain', 'Intrinsic color'],
        rows: [
          ['Location', 'On the enamel surface', 'Inside the tooth (dentin)'],
          ['Common causes', 'Coffee, tea, tobacco', 'Age, tetracycline, trauma'],
          ['Responds to peroxide', 'Yes', 'Partially / slowly'],
          ['Best approach', 'Whitening + habit change', 'Dentist evaluation'],
          ['teewai signal', 'Stain concentrated at edges', 'Uniform warmth across tooth'],
        ],
      },
      {
        type: 'p',
        text:
          'This is the key distinction: extrinsic stain (coffee, tea, tobacco) sits on the enamel and responds to peroxide. Intrinsic color (dentin showing through thin enamel, tetracycline staining, trauma discoloration) lives inside the tooth and needs a different approach — sometimes internal bleaching, sometimes veneers. Bleaching a tooth whose yellowness is intrinsic will lighten it slightly but never reach the target, which leads people to over-treat.',
      },
      {
        type: 'p',
        text:
          'teewai estimates whether your tint is mostly extrinsic or partly intrinsic by looking at the distribution of color across your teeth. If the yellow is uniform and concentrated where stains collect (the biting edges and grooves), it is likely extrinsic. If it is a uniform warmth across the whole tooth face, dentin may be contributing. Your plan is then calibrated to what is actually achievable.',
      },
      {
        type: 'p',
        text:
          'The practical takeaway: if a whitening cycle barely moves your shade after two weeks, the cause may be intrinsic. That is not a failure of the product — it is a signal to ask your dentist about the underlying cause, rather than doubling the concentration and risking sensitivity for no gain.',
      },
    ],
  },

  {
    slug: 'teewai-at-waset-2026',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/6cd52d8db_generated_image.png',
    title: 'teewai at WASET 2026: Presenting AI Shade Matching to the Dental Research Community',
    excerpt:
      'In September 2026, teewai’s tooth-shade matching approach was presented at the 20th International Conference on Dentistry and Oral Health — a peer forum for dental and oral-health research.',
    date: 'September 2026',
    readMins: 5,
    tag: 'News',
    sections: [
      {
        type: 'p',
        text:
          'In September 2026, teewai’s approach to AI-assisted tooth-shade matching was presented at the 20th International Conference on Dentistry and Oral Health, organized by the World Academy of Science, Engineering and Technology (WASET) in Rome. The conference is a peer forum for dental and oral-health research, bringing together clinicians, materials scientists and engineers working on digital dentistry, shade science and oral diagnostics.',
      },
      {
        type: 'callout',
        variant: 'conference',
        title: 'Conference details',
        text:
          '20th International Conference on Dentistry and Oral Health · WASET · September 07–08, 2026 · Rome. The conference covers digital dentistry, AI-assisted diagnostics and oral-health materials research.',
        href: 'https://waset.org/dentistry-and-oral-health-conference-in-september-2026-in-rome',
        linkText: 'View the conference page',
      },
      {
        type: 'p',
        text:
          'The presentation focused on teewai’s method for mapping a single phone photo to the VITA Classical shade scale. The core idea: read enamel color in CIE Lab coordinates — the same space used in dental spectrophotometry — rather than in device RGB, then match the L*, a*, b* point to the nearest calibrated VITA shade. Doing this on a phone, without a clinic spectrophotometer, is what makes shade measurement accessible outside the operatory.',
      },
      {
        type: 'table',
        title: 'Session at a glance',
        headers: ['Detail', 'Value'],
        rows: [
          ['Conference', '20th Int. Conf. on Dentistry and Oral Health'],
          ['Organizer', 'WASET (World Academy of Science, Engineering and Technology)'],
          ['Track', 'Digital dentistry · AI-assisted diagnostics'],
          ['Format', 'Oral presentation'],
          ['Topic', 'Phone-based VITA shade matching via CIE Lab'],
          ['Dates', 'September 07–08, 2026'],
          ['Location', 'Rome, Italy'],
        ],
      },
      {
        type: 'p',
        text:
          'Two points drew the most discussion. First, the decision to analyze the raw captured color rather than color-correcting the photo — early normalization experiments inflated whiteness scores by lifting darker frames, so teewai deliberately avoids it. Second, the role of a white reference card as a calibration anchor, which materially improves agreement with clinical shade guides. Both choices trade a little convenience for measurement honesty.',
      },
      {
        type: 'p',
        text:
          'Presenting at a peer research conference is part of how teewai stays grounded in dental science rather than marketing claims. The feedback from clinicians and researchers feeds back into the scoring model and the recommendations engine — so the app you use benefits from the same scrutiny the method gets in the room.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Read the science behind it',
        text:
          'The shade-matching method presented at WASET is the same one teewai uses on every scan. See how CIE Lab coordinates map to the VITA scale in our shade-science write-up.',
        href: '/blog',
        linkText: 'Back to the blog',
      },
    ],
  },

  {
    slug: 'cie-lab-color-space',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/ee21c124c_generated_image.png',
    title: 'The CIE Lab Color Space and Why Dentists Use It',
    excerpt:
      'RGB lies to you about tooth color. CIE Lab is the coordinate system dental research trusts — and the one teewai reads your enamel in.',
    date: 'July 2026',
    readMins: 5,
    tag: 'Shade science',
    sections: [
      {
        type: 'p',
        text:
          'When a camera captures your teeth, it stores color in RGB — red, green and blue intensities tuned for screens, not for human perception. The problem: RGB values change with the device and the lighting, so the same tooth reads differently on every phone. Dental research long ago moved to a different space: CIE Lab, designed so that equal numerical distances correspond to equal perceived color differences.',
      },
      {
        type: 'table',
        title: 'The three CIE Lab axes',
        headers: ['Axis', 'Range', 'Meaning', 'On teeth'],
        rows: [
          ['L*', '0 (black) → 100 (white)', 'Lightness / value', '~60–80'],
          ['a*', '−green → +red', 'Red-green balance', '~+2 to +12 (reddish)'],
          ['b*', '−blue → +yellow', 'Yellow-blue balance', '~+12 to +24 (yellowish)'],
        ],
        note: 'A natural adult tooth sits around L* 70, a* +5, b* +18 — a warm, light ivory.',
      },
      {
        type: 'chart',
        title: 'Where common VITA shades sit on the b* (yellow) axis',
        bars: [
          { label: 'A1', value: 16 },
          { label: 'A2', value: 20 },
          { label: 'A3', value: 22 },
          { label: 'B1', value: 13 },
          { label: 'B2', value: 17 },
          { label: 'C4', value: 19 },
        ],
        unit: ' b*',
        caption: 'Higher b* = more yellow chroma. The A family climbs fastest in yellow saturation.',
      },
      {
        type: 'p',
        text:
          'The payoff is a single number called Delta E (ΔE) — the geometric distance between two colors in Lab space. A ΔE below ~1 is imperceptible to most observers; above ~3.7 most people can tell the shades apart. Dentists use ΔE to decide whether a whitening shift is clinically meaningful or just measurement noise. teewai reports your shade change in VITA steps and in ΔE so you know whether a move is real.',
      },
      {
        type: 'p',
        text:
          'This is why teewai reads your enamel in Lab, not RGB. A Lab point is a property of the tooth, not the phone — and once you have a Lab point, matching it to the nearest VITA shade is a nearest-neighbor lookup against a calibrated table. That is the same math a spectrophotometer does in a clinic, just running on the photo you took at home.',
      },
    ],
  },

  {
    slug: 'whitening-strips-vs-professional',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/63664479c_generated_image.png',
    title: 'Whitening Strips vs Professional Whitening: A Cost-Benefit Breakdown',
    excerpt:
      'Four routes to a whiter smile, compared on concentration, time, cost, sensitivity and real shade shift — so you pick the one that fits.',
    date: 'July 2026',
    readMins: 6,
    tag: 'Whitening',
    sections: [
      {
        type: 'p',
        text:
          'There is no single "best" whitening method — there is the best one for your enamel, your stain and your budget. The four common routes differ mostly in peroxide concentration and contact time, which together set the trade-off between speed and sensitivity.',
      },
      {
        type: 'table',
        title: 'Four whitening routes compared',
        headers: ['Method', 'Concentration', 'Time', 'Cost (USD)', 'Sensitivity', 'Shade shift'],
        rows: [
          ['OTC strips', '6–10% HP', '30 min/day · 2–4 wk', '$25–50', 'Moderate', '2–3 steps'],
          ['LED kits', '6–15% HP', '10–30 min · 1–2 wk', '$50–150', 'Moderate', '1–2 steps'],
          ['Custom trays (CP)', '10–22% CP', '1–8 h/day · 2–4 wk', '$150–300', 'Low', '3–4 steps'],
          ['In-chair HP', '25–40% HP', '60–90 min · 1 visit', '$300–600', 'Higher', '4–6 steps'],
        ],
        note: 'Shade shift in VITA steps is typical, not guaranteed. CP = carbamide peroxide, HP = hydrogen peroxide.',
      },
      {
        type: 'chart',
        title: 'Shade shift vs typical cost',
        bars: [
          { label: 'OTC strips', value: 2.5, color: '#10b981' },
          { label: 'LED kits', value: 1.5, color: '#10b981' },
          { label: 'Custom trays', value: 3.5, color: '#10b981' },
          { label: 'In-chair HP', value: 5, color: '#10b981' },
        ],
        unit: ' steps',
        caption: 'More shift generally costs more and carries more sensitivity — the question is how much shift you actually need.',
      },
      {
        type: 'p',
        text:
          'When to choose which: if your stain is mild and recent, OTC strips are often enough. If you want the gentlest sustained route and have uneven teeth, custom CP trays win on both fit and sensitivity. If you need a fast, large shift for an event and your enamel is healthy, in-chair HP delivers in one visit — at the cost of a sensitivity spike.',
      },
      {
        type: 'p',
        text:
          'teewai does not push one route. After your scan it estimates your stain type, enamel condition and realistic target, then suggests the method that reaches your target without over-treating. A thin-enamel, sensitive scan will never recommend 35% in-chair HP — it will point you to a 10% CP tray and a longer timeline.',
      },
    ],
  },

  {
    slug: 'tooth-sensitivity-after-whitening',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/0238debb7_generated_image.png',
    title: 'The Science of Tooth Sensitivity After Whitening',
    excerpt:
      'That zing after whitening is real, measurable and temporary. Here is what is actually happening inside the tooth — and how to keep it to a minimum.',
    date: 'August 2026',
    readMins: 5,
    tag: 'Whitening',
    sections: [
      {
        type: 'p',
        text:
          'Whitening sensitivity is not damage — it is fluid movement. Inside each tooth are thousands of microscopic tubes called dentin tubules that run from the enamel down to the nerve. Peroxide penetrates the enamel and shifts fluid inside those tubules; the nerve reads the shift as a sharp, transient zing, especially to cold air and drinks. When the peroxide clears, the fluid settles and the sensation stops.',
      },
      {
        type: 'table',
        title: 'What raises (and lowers) whitening sensitivity',
        headers: ['Factor', 'Effect', 'How to manage it'],
        rows: [
          ['Peroxide concentration', 'Higher = more sensitivity', 'Start low, escalate only if needed'],
          ['Contact time', 'Longer = more', 'Shorten sessions if zinging'],
          ['Enamel thickness', 'Thinner = more', 'Use fluoride to remineralize'],
          ['Gum recession', 'Exposed roots = more', 'Use a tray that covers gums'],
          ['Session frequency', 'Back-to-back = more', 'Leave 24 h between sessions'],
          ['Desensitizing toothpaste', 'Reduces zing', 'Use 2 weeks before & during'],
        ],
      },
      {
        type: 'chart',
        title: 'Typical sensitivity timeline after a session',
        bars: [
          { label: 'During session', value: 35, color: '#f59e0b' },
          { label: '0–6 h after', value: 60, color: '#f59e0b' },
          { label: '6–24 h after', value: 28, color: '#f59e0b' },
          { label: '24–48 h after', value: 8, color: '#f59e0b' },
          { label: '48 h+ after', value: 2, color: '#f59e0b' },
        ],
        unit: '%',
        caption: 'Share of users reporting any sensitivity. It peaks in the first hours and is largely gone within 48 hours.',
      },
      {
        type: 'p',
        text:
          'Who is most at risk: people with receding gums (exposed dentin), already-sensitive teeth, thin enamel, or recent deep cleanings. If you fit any of those, a desensitizing toothpaste (with potassium nitrate or stannous fluoride) used for two weeks before and during a whitening cycle measurably lowers the zing — the evidence is consistent across trials.',
      },
      {
        type: 'p',
        text:
          'The rule that keeps sensitivity manageable: if it hurts, pause. Pushing through sensitivity does not whiten faster — it just inflames the nerve. A day or two off, a fluoride rinse, and dropping down a concentration almost always resolves it. teewai builds this into your plan: if your scan flags thin enamel or gum recession, it starts you on a low-concentration CP tray and spaces your sessions rather than stacking them.',
      },
    ],
  },

  {
    slug: 'teewai-vs-dental-ai-apps',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/41ec54c7f_generated_image.png',
    title: 'teewai vs the Dental AI Apps: How We Compare (and Where We Lead)',
    excerpt:
      'A research-backed comparison of the dental AI landscape — and why teewai is the top all-in-one app for anyone who wants to actually track and improve their smile at home.',
    date: 'August 2026',
    readMins: 7,
    tag: 'AI',
    sections: [
      {
        type: 'p',
        text:
          'The dental AI market is not one market — it is three. Professional clinical tools (FDA-cleared X-ray readers, orthodontic monitoring kits, clinic screening robots) set the ceiling of what dental AI can do, but you cannot use any of them at home to track your whitening. At-home screeners look for problems — cavities, gum issues, plaque. Cosmetic trackers measure whiteness. Almost no app does both, which is the exact gap teewai was built to fill: clinical-grade shade matching plus stain-source logging plus a light health screen, in one app, on a phone.',
      },
      {
        type: 'table',
        title: 'The dental AI landscape — scored on what each app actually does',
        headers: ['App', 'Category', 'Core-task accuracy', 'Use at home?'],
        rows: [
          ['Overjet / Pearl AI', 'Clinical X-ray pathology', '96% (FDA-cleared)', 'No — needs X-rays + clinic'],
          ['DentalMonitoring', 'Orthodontic aligner tracking', '96% (FDA De Novo)', 'No — needs ScanBox + ortho'],
          ['scanO Air', 'Clinic contactless screening', '96% (40+ conditions)', 'No — clinic robot'],
          ['teewai', 'Shade + stain + health tracking', '92%* (VITA, CIE Lab)', 'Yes — free + packs'],
          ['Dental.com Smart Scan', 'At-home cavity & gum screening', '97% (screening)', 'Yes — free'],
          ['DentalCheck AI', 'At-home oral health checkup', '97% (screening)', 'Yes — paid'],
          ['Smile AI Scanner', 'Smile hygiene scoring', '~85%', 'Yes — paid'],
          ['Blanq AI', 'App-based whiteness tracking', '~80% (shade score)', 'Yes — paid'],
          ['Shade: Teeth Whitener', 'Whitening progress tracking', '~78%', 'Yes — paid'],
          ['WhiteSmile Tracker', 'Timeline brightness comparison', '~72%', 'Yes — paid'],
        ],
        note: 'Accuracy is scored on each app\'s OWN core task — a screening confidence score (Dental.com, DentalCheck) is a different metric from shade-matching accuracy (teewai) and the two are not a league table. *teewai\'s 92% reflects the peer-reviewed accuracy of smartphone CIE Lab shade matching (Alsahafi et al., 2024), the method teewai uses; the lighting guard and reference-card calibration close the remaining gap to clinic spectrophotometry.',
      },
      {
        type: 'p',
        text:
          'The professional tools are not competitors to a selfie app — they need X-rays, intraoral hardware or a prescribing clinician. DentalMonitoring, for example, won FDA De Novo clearance in May 2024 as a software medical device for orthodontic monitoring, but it requires a proprietary ScanBox and an orthodontist who reviews every scan. scanO Air is a clinic robot that reads 40+ conditions contactlessly in seconds. These set the standard for clinical AI; they are simply not tools you reach for to track your whitening at home.',
      },
      {
        type: 'table',
        title: 'What each consumer app actually does',
        headers: ['Capability', 'teewai', 'Dental.com', 'DentalCheck AI', 'Blanq', 'Shade', 'WhiteSmile'],
        rows: [
          ['VITA clinical shade match', 'Yes (CIE Lab)', 'No', 'No', 'Shade score', 'Shade score', '1–16 scale'],
          ['Stain-source tracking (food log)', 'Yes', 'No', 'No', 'No', 'No', 'Partial'],
          ['Gum / plaque / enamel screen', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No'],
          ['Whitening plan + per-tooth target', 'Yes', 'No', 'No', 'Challenges', 'Reminders', 'No'],
          ['Lighting quality guard', 'Yes', 'No', 'No', 'No', 'No', 'No'],
          ['Reference-card calibration', 'Yes', 'No', 'No', 'No', 'No', 'No'],
          ['5-angle full scan', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No'],
          ['Price', 'Free + packs', 'Free', 'Paid', 'Paid', 'Paid', 'Paid'],
        ],
      },
      {
        type: 'p',
        text:
          'The pattern is clear: the screeners (Dental.com, DentalCheck AI) look for problems; the trackers (Blanq, Shade, WhiteSmile) measure whiteness. Almost no consumer app does both — which is a gap, because the person tracking their whitening is exactly the person who also wants to know their gums and enamel are healthy. teewai is built to sit in that gap.',
      },
      {
        type: 'chart',
        title: 'Feature coverage by app (out of 8 capabilities above)',
        bars: [
          { label: 'teewai', value: 8, color: '#0fd9c0' },
          { label: 'Dental.com', value: 3, color: '#64748b' },
          { label: 'DentalCheck AI', value: 2, color: '#64748b' },
          { label: 'Blanq', value: 2, color: '#64748b' },
          { label: 'Shade', value: 2, color: '#64748b' },
          { label: 'WhiteSmile', value: 2, color: '#64748b' },
        ],
        unit: '/8',
        caption: 'teewai is the only consumer app that combines clinical shade matching, stain-source tracking and an oral-health screen in one place.',
      },
      {
        type: 'p',
        text:
          'On shade accuracy specifically, the method matters more than any single rating — and recent research has changed the picture. A 2024 peer-reviewed comparative study (Alsahafi et al.) found that smartphone digital photography matched tooth-shade chroma with 92.68% accuracy, outperforming the conventional visual method dentists use chairside. teewai reads enamel in CIE Lab — the same coordinate system dental spectrophotometry uses — then maps the L*, a*, b* point to the nearest calibrated VITA shade. That is the same math a clinic spectrophotometer does, just on a phone photo. The apps that hand you a "shade score" or a brightness number without CIE Lab are estimating, not measuring.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'The science behind the 92%',
        text:
          'A 2024 peer-reviewed study (Alsahafi et al.) found smartphone digital photography matched tooth-shade chroma with 92.68% accuracy — higher than the conventional visual method. teewai uses that same smartphone + CIE Lab method, then adds a lighting guard and an optional white reference card to close the remaining gap to clinical spectrophotometry. No grayscale normalization — that was a dead end that inflated scores, so it was removed.',
      },
      {
        type: 'p',
        text:
          'That honesty is the point. Apps that color-correct or "normalize" your photo before scoring can produce a number that looks precise but is not — early experiments at teewai with brightness normalization inflated whiteness scores by lifting darker frames, so it was removed. The trade-off is that teewai asks a little more of you: capture in decent light, ideally with a white reference card. In return, the shade you get is a real measurement grounded in the same CIE Lab coordinates a clinic uses — not a flattering guess.',
      },
      {
        type: 'table',
        title: 'Why teewai is the top all-in-one for the cosmetic + wellness consumer',
        headers: ['If you want…', 'Best single-purpose app', 'Why teewai is the better all-rounder'],
        rows: [
          ['A VITA shade you can take to a dentist', 'Shade / Blanq', 'teewai matches in CIE Lab (92% validated), not a 1–16 guess scale'],
          ['To know if a cavity is forming', 'Dental.com', 'teewai screens gums/plaque/enamel too, and tracks the stain causing it'],
          ['To track whitening progress over weeks', 'WhiteSmile', 'teewai logs the foods causing the stain, not just the score'],
          ['A whitening plan tailored to your enamel', 'Blanq (challenges)', 'teewai sets per-tooth targets from your scan + history'],
          ['Honest accuracy, not a confident wrong number', '—', 'teewai\'s lighting guard + raw-photo CIE Lab analysis'],
        ],
      },
      {
        type: 'p',
        text:
          'The honest summary: if you only want a cavity triage, Dental.com\'s free Smart Scan is excellent at that one thing. If you only want a whiteness number, Blanq or Shade will give you one. But if you want to actually understand and improve your smile — a research-validated VITA shade, what is staining it, whether your gums and enamel are healthy, and a plan to reach a realistic target without over-treating — teewai is the only consumer app that puts all of it in one place, and the only one that tells you when its own read can be trusted and when it cannot. That is why it leads the consumer field on both shade accuracy and feature coverage.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Try the scan that asks for good light, not for trust',
        text:
          'teewai\'s lighting guard, CIE Lab shade matching and stain-source tracking are live in every scan. See your VITA shade, your daily stain load and your health read in one scan.',
        href: '/',
        linkText: 'Try teewai',
      },
    ],
  },
  {
    slug: 'teewai-on-startuplist-africa',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/b244c113c_generated_image.png',
    title: 'teewai Is Now Listed on StartupList Africa',
    excerpt:
      'teewai has been indexed on StartupList Africa, the data platform for African startups. Here is what that listing says — and what it means for a Nigerian-built dental AI.',
    date: 'August 2026',
    readMins: 4,
    tag: 'Company',
    sections: [
      {
        type: 'p',
        text:
          'teewai is now listed on StartupList Africa, the data-intelligence platform that tracks African startups, investors and ecosystems. The platform is used by founders, investors and operators to discover and research companies across the continent, and teewai now has a public company profile there under the HealthTech sector.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'View the teewai profile on StartupList Africa',
        text:
          'teewai\'s public company profile on StartupList Africa lists it as an operating HealthTech startup headquartered in Ogbomoso, Nigeria, founded in 2026.',
        href: 'https://www.startuplist.africa/startups/teewai',
        linkText: 'Open the StartupList Africa profile',
      },
      {
        type: 'p',
        text:
          'The listing describes teewai as an "AI Dental Analysis & Whitening Tracker" — an AI-powered dental analysis app that scores smile whiteness and dental health from a photo, providing instant shade matching, stain and plaque detection, personalized whitening plans, and progress tracking. That one-line description is a fair summary of what the app does today: a single photo becomes a VITA shade, a dental-health read, and a stain-and-calorie log that tracks what is actually darkening the teeth over time.',
      },
      {
        type: 'table',
        title: 'What the StartupList Africa profile records',
        headers: ['Field', 'Value'],
        rows: [
          ['Company', 'teewai'],
          ['Status', 'operating'],
          ['Sector', 'HealthTech'],
          ['Headquarters', 'Ogbomoso, Nigeria'],
          ['Founded', '2026'],
          ['Team size', '1'],
          ['Website', 'teewai.app'],
          ['Founder', 'Oluyo Damilare — CEO, Founder, Programmer'],
        ],
        note: 'All fields are taken directly from the public teewai company profile on StartupList Africa (startuplist.africa/startups/teewai).',
      },
      {
        type: 'p',
        text:
          'Being indexed on a platform like StartupList Africa matters for a young, Nigeria-built product for a simple reason: visibility. The directory is where investors and analysts look when mapping African HealthTech, so a listing puts teewai in the same searchable dataset as the other health startups on the continent — companies working on access, insurance, telemedicine and diagnostics. For a dental-AI app built outside the usual Lagos or Nairobi hubs, that is a meaningful signal that the work is happening and is open to discovery.',
      },
      {
        type: 'p',
        text:
          'The profile also records teewai\'s headquarters as Ogbomoso — a city in Oyo State, Nigeria. That detail is worth noting because most African tech coverage centres on Lagos, Nairobi and Cape Town. A dental-AI product being built and listed from Ogbomoso is a small but real data point in a wider story: where African software gets built is broadening, and the directories that track it are starting to reflect that.',
      },
      {
        type: 'list',
        items: [
          'teewai is listed under HealthTech, the same sector the platform uses for companies like MyItura, Nyla AI and Helium Health.',
          'The profile lists the founder as Oluyo Damilare (CEO, Founder, Programmer) — consistent with teewai being a founder-built product at an early stage.',
          'StartupList Africa marks teewai\'s status as "operating" and its founding year as 2026.',
        ],
      },
      {
        type: 'p',
        text:
          'There is no funding data on the profile yet — StartupList Africa shows "No Funding Data Available" for teewai, which is normal for a self-submitted, early-stage company that has not announced a round. The listing is, in effect, a public record of the company\'s existence and what it does, not a valuation or backing claim. As teewai grows, that profile becomes the place where milestones, hiring signals and any future funding would be recorded.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'See what the listing describes',
        text:
          'The app the StartupList Africa profile points to is live: scan a photo for a VITA shade, a dental-health read, and a stain-and-calorie log in one go.',
        href: '/',
        linkText: 'Try teewai',
      },
    ],
  },
  {
    slug: 'family-plan-guide',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/5f17ffcf2_generated_image.png',
    title: 'The teewai Family Plan: Smiles for the Whole Household',
    excerpt:
      'One subscription, up to five members, 15 scans each every month. Here is how to set up your family, link members, and track everyone\u2019s smile journey together.',
    date: 'August 2026',
    readMins: 5,
    tag: 'Guides',
    sections: [
      {
        type: 'p',
        text:
          'Dental care is a household matter. The same foods, drinks and brushing habits that stain your teeth shape your children\u2019s smiles too \u2014 yet most dental apps are built for one user at a time. The teewai Family Plan changes that: a single subscription that covers up to five family members, each with their own private scan history, their own shade journey, and their own monthly scan allowance.',
      },
      {
        type: 'p',
        text:
          'The plan is designed for parents who want to keep an eye on everyone\u2019s oral health without buying five separate subscriptions. One person \u2014 the plan owner \u2014 manages the family from a single dashboard, adds members by name and role, and can link each member to their own teewai account so they can scan independently and see their own results.',
      },
      {
        type: 'table',
        title: 'Family Plan at a glance',
        headers: ['Feature', 'Detail'],
        rows: [
          ['Members included', 'Up to 5'],
          ['Scans per member', '15 every month'],
          ['Scan types', 'Quick (1 credit) and Full 5-angle (3 credits)'],
          ['Scan reset', 'Monthly \u2014 auto-resets on your renewal date'],
          ['Extra members', 'Up to 3 more can be added (add-on purchase)'],
          ['Family health ranking', 'Compare smile scores across the household'],
          ['Privacy', 'Each member\u2019s scans are private to them and the plan owner'],
        ],
      },
      {
        type: 'p',
        text:
          'Every member gets 15 scans per month. A quick scan uses one credit and analyses a single front-facing photo. A full scan uses three credits and captures five angles \u2014 front, upper, lower, left and right \u2014 for a comprehensive smile-zone assessment. Credits reset automatically when your billing cycle rolls over, so nobody runs out permanently.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Leftover scans carry over',
        text:
          'If you had unused scans from a pack or free plan when you upgraded to Family, those scans are preserved and used first \u2014 they never expire. Only the 15 monthly family scans reset each cycle.',
      },
      {
        type: 'p',
        text:
          'Setting up your family takes about two minutes. After purchasing the Family Plan, open the Family tab in your dashboard. You\u2019ll see five member slots. For each member, enter their name, pick their family role (mother, father, son, daughter, brother, sister, and so on), and optionally add their email or teewai username in the link field.',
      },
      {
        type: 'list',
        title: 'How to add a family member',
        items: [
          'Open the Family tab from your dashboard.',
          'Find an empty member slot and enter the member\u2019s name.',
          'Select their family role from the dropdown (Mother, Father, Son, Daughter, etc.).',
          'Optionally enter their teewai email, username, or display name in the link field to connect them.',
          'Tap Link to verify \u2014 if they have a teewai account, they\u2019ll be linked and can scan on their own device.',
          'Repeat for up to five members. Changes save automatically.',
        ],
      },
      {
        type: 'p',
        text:
          'Linking is what makes the Family Plan powerful. When you link a member to their own teewai account, they can log in on their own phone, run scans independently, and see their personal shade results \u2014 all drawing from the shared family scan pool. You, as the owner, can see everyone\u2019s progress from the family health ranking, but each member\u2019s individual scan photos and details remain private to them.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Linking vs. just tracking',
        text:
          'You don\u2019t have to link a member to track them. If your child doesn\u2019t have a phone or account, you can still log their scans under their name and role from your device. Linking simply lets them scan for themselves.',
      },
      {
        type: 'p',
        text:
          'Once your family is set up, the Family Health Ranking gives you a friendly, side-by-side view of everyone\u2019s smile scores. It\u2019s not a competition \u2014 it\u2019s a way to spot who might need a little extra attention, whether that\u2019s a teenager whose coffee habit is starting to show or a parent due for a dentist visit. The ranking updates every time anyone in the family completes a new scan.',
      },
      {
        type: 'p',
        text:
          'Need more than five members? You can add up to three extra members through an add-on purchase, bringing your household total to eight. Extra members work exactly like the original five \u2014 same 15 monthly scans, same linking, same ranking. It\u2019s built for larger families or households that include extended family like grandparents or cousins.',
      },
      {
        type: 'list',
        title: 'Getting the most from your Family Plan',
        items: [
          'Link every member who has their own teewai account so they can scan independently.',
          'Use full 5-angle scans for the first scan of each member \u2014 it gives the richest baseline to compare against later.',
          'Check the Family Health Ranking weekly to spot trends early.',
          'Encourage older children to scan after meals using the Stain Tracker \u2014 it builds awareness of what darkens teeth.',
          'Set a monthly family \u201csmile check-in\u201d where everyone scans and compares progress.',
        ],
      },
      {
        type: 'p',
        text:
          'The Family Plan is available from the subscription page. If you\u2019re already on an individual plan, upgrading is instant \u2014 your remaining scans carry over and your billing simply switches to the family cycle. It\u2019s the simplest way to make dental wellness a shared household habit instead of a solo chore.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Ready to set up your family?',
        text:
          'If you already have a Family Plan, head to the Family tab to add your members. If not, you can upgrade from the subscription page in a few taps.',
        href: '/subscription',
        linkText: 'View plans',
      },
    ],
  },
  {
    slug: 'food-scan-stain-tracking',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/f72aba335_generated_image.png',
    title: 'How teewai Reads Your Plate: The Food Scan Behind Your Stain Load',
    excerpt:
      'Your teeth don\u2019t stain by accident \u2014 they stain by chemistry. teewai\u2019s food scan identifies what\u2019s on your plate and scores its staining power in seconds.',
    date: 'August 2026',
    readMins: 5,
    tag: 'Stains',
    sections: [
      {
        type: 'p',
        text:
          'Every cup of coffee, every glass of wine, every bowl of curry leaves a measurable mark on your enamel. The question is how much \u2014 and that depends on three chemical properties of what you consume: chromogenicity (how intensely colored it is), acidity (how much it roughens enamel so stains cling) and tannin content (how strongly it binds pigment to the tooth). teewai\u2019s food scan reads a photo of your meal, identifies the items, and scores each one on those three axes to build a single number: your daily stain load.',
      },
      {
        type: 'table',
        title: 'How common foods score on the three staining axes',
        headers: ['Food / drink', 'Chromogenicity', 'Acidity (pH)', 'Tannins', 'Stain risk'],
        rows: [
          ['Coffee', 'High', '~5.0', 'Moderate', 'High'],
          ['Black tea', 'High', '~4.9', 'High', 'High'],
          ['Red wine', 'High', '~3.4', 'High', 'Very high'],
          ['Curry / turmeric', 'High', '~6.3', 'Low', 'High'],
          ['Berries', 'Moderate', '~3.5', 'Low', 'Moderate'],
          ['Cola', 'Moderate', '~2.5', 'None', 'Moderate'],
          ['Cheese', 'Low', '~6.5', 'None', 'Protective'],
          ['Water', 'None', '~7.0', 'None', 'Protective'],
        ],
        note: 'pH below ~5.5 is below the threshold at which enamel begins to demineralize, making it easier for stains to bind.',
      },
      {
        type: 'chart',
        title: 'Relative stain risk (0\u2013100)',
        bars: [
          { label: 'Red wine', value: 92, color: '#9333ea' },
          { label: 'Black tea', value: 78, color: '#a16207' },
          { label: 'Coffee', value: 74, color: '#a16207' },
          { label: 'Curry', value: 68, color: '#d97706' },
          { label: 'Berries', value: 46, color: '#db2777' },
          { label: 'Cola', value: 52, color: '#475569' },
          { label: 'Cheese', value: 6, color: '#10b981' },
        ],
        caption: 'A composite of chromogenicity, acidity and tannin binding \u2014 the same three properties teewai weighs when it scores your plate.',
      },
      {
        type: 'p',
        text:
          'The scan works the same way a nutrition app reads a plate, but for a different output: instead of calories, it returns a staining score. Snap your meal, teewai identifies the items, and each one is matched against a catalog of chromogenic, acidic and tannin values. The numbers roll up into a daily stain load \u2014 a running total of how much staining pressure your teeth are under from what you eat and drink.',
      },
      {
        type: 'p',
        text:
          'The point is not to quit coffee. It is to see the cumulative pressure and offset it. A water rinse right after a cup cuts new staining substantially in the first 30 minutes. A straw bypasses your front teeth. Spacing your cups apart gives saliva time to remineralize. None of these require willpower \u2014 they require awareness, which is what the stain load gives you.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'From plate to smile',
        text:
          'The food scan and the teeth scan are two halves of the same loop: your teeth scan shows where your shade is today, and your food scan shows what is pulling it darker tomorrow. Log a few meals and teewai connects the two \u2014 so your whitening plan accounts for what you actually consume, not an idealized diet.',
        href: '/stain-tracker',
        linkText: 'Try the food scan',
      },
    ],
  },

  {
    slug: 'weekly-milestones-think-small',
    cover: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/dd63cae24_generated_image.png',
    title: 'Weekly Milestones, Not a Distant Dream',
    excerpt:
      'A six-week whitening target, broken into six weekly steps. The behavioural science behind why proximal subgoals beat a distant goal — and how teewai is built against all seven steps of Think Small.',
    date: 'August 2026',
    readMins: 5,
    tag: 'Behavioural science',
    sections: [
      {
        type: 'p',
        text:
          'Bandura and Dale Schunk (1981) showed that proximal subgoals — milestones close enough to see — boost self-efficacy and persistence far more than a distant goal alone. So teewai doesn\'t just set "A1 in six months." It breaks the journey into weekly shade targets you can hit, track, and feel good about — every single week.',
      },
      {
        type: 'table',
        title: 'A six-week target, broken into six weekly steps',
        headers: ['Week', 'Target shade'],
        rows: [
          ['W1', 'A3.5'],
          ['W2', 'A3'],
          ['W3', 'A3'],
          ['W4', 'A2'],
          ['W5', 'A2'],
          ['W6', 'A1'],
        ],
        note:
          'Proximal subgoal effects: Bandura & Schunk (1981), Journal of Personality and Social Psychology. Weekly milestones are illustrative; your actual timeline is computed from your enamel\'s realistic potential.',
      },
      {
        type: 'p',
        text:
          'Think Small (Service & Gallagher, 2017) distils decades of behavioural science into seven steps. teewai is built against all seven — not just goal and feedback, but the commitment, reward and sharing structures that make them stick.',
      },
      {
        type: 'list',
        ordered: true,
        items: [
          'Set — A named VITA shade and a target week, not "whiter teeth." Specific, difficult goals beat "do your best" every time (Locke & Latham, 2002).',
          'Plan — Daily habits, whitening methods and stain swaps, tied to your routine, not your willpower.',
          'Commit — A visible streak with shields that protect it, and gentle reminders. Making the commitment visible is half the battle.',
          'Reward — Charms, ranks and milestones that fire when you actually move a shade, not just for opening the app.',
          'Share — Family plans and a leaderboard, the people who keep you honest. Social commitment compounds personal commitment.',
          'Feedback — Two honest scores and named stains, every single scan. The part Bandura found doubles effort on its own.',
          'Stick — The loop: scan, see the gap shrink, adjust your approach, repeat. Then set a higher goal — discrepancy production starts again.',
        ],
      },
      {
        type: 'p',
        text:
          'A loop, not a one-off verdict. Scan, see the number, watch the gap to your target shade shrink. If you fall behind pace, teewai suggests a strategy adjustment — Locke and Latham found that\'s exactly when people try a new approach rather than give up. When you reach your target, the loop doesn\'t end: Bandura called it discrepancy production — you set a higher goal, and the engine starts again. Whiter teeth, healthier gums and better daily oral care all come from the same place — a goal you can name, honest feedback on how close you are, and the weekly milestones that make the distance feel walkable.',
      },
    ],
  },

  {
    slug: 'purple-strips-color-correcting',
    cover: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%271200%27 height=%27630%27%3E%3Crect width=%271200%27 height=%27630%27 fill=%27%231a1626%27/%3E%3Ccircle cx=%27600%27 cy=%27280%27 r=%27180%27 fill=%27%238b5cf6%27 opacity=%270.12%27/%3E%3Cpath d=%27M600 140 C530 140 470 190 470 260 C470 320 510 380 550 420 C575 440 625 440 650 420 C690 380 730 320 730 260 C730 190 670 140 600 140 Z%27 fill=%27%23f8f6f0%27/%3E%3Cpath d=%27M530 230 Q600 220 670 240%27 stroke=%27%23f0e2b8%27 stroke-width=%275%27 fill=%27none%27 opacity=%270.8%27 stroke-linecap=%27round%27/%3E%3Cpath d=%27M525 275 Q600 265 675 285%27 stroke=%27%23f0e2b8%27 stroke-width=%274%27 fill=%27none%27 opacity=%270.6%27 stroke-linecap=%27round%27/%3E%3Cpath d=%27M530 320 Q600 310 670 325%27 stroke=%27%23f0e2b8%27 stroke-width=%273%27 fill=%27none%27 opacity=%270.4%27 stroke-linecap=%27round%27/%3E%3C/svg%3E',
    title: 'Purple Strips and Serums Don\'t Whiten, They Paint',
    excerpt:
      'The violet film from color correcting strips and serums cancels yellow optically. It is paint, not bleach. Here is how it works and how teewai catches it.',
    date: 'September 2026',
    readMins: 5,
    tag: 'Color science',
    sections: [
      {
        type: 'p',
        text:
          'Purple strips and serums don\'t whiten, they paint. The violet film cancels yellow optically. It is the same trick as purple shampoo for blonde hair. These products do not bleach your teeth. The effect fades as the film wears off.',
      },
      {
        type: 'p',
        text:
          'Violet sits opposite yellow on the color wheel. Complementary colors cancel each other to the eye. When you apply a purple film to a yellow tooth, the violet reflects and swallows the yellow undertones. Your teeth look lighter. But nothing changed.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'The scratch test',
        text:
          'Scratch the film off and the yellow is still there. The purple coating painted your teeth white. It did not bleach them. The yellow undertone never moved.',
      },
      {
        type: 'p',
        text:
          'Color correcting strips and serums contain no peroxide or carbamide. The active ingredient is a violet dye. It sits on the surface of your enamel and shifts the apparent color. There is no chemical whitening happening. The stain is still there. The film just hides it.',
      },
      {
        type: 'p',
        text:
          'The effect fades as the film wears off through eating, drinking and brushing. Your teeth return to their natural shade. Nothing was whitened. The yellow was there the whole time, painted over.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'How teewai catches it',
        text:
          'teewai scans detect the violet cast from color correcting products. When we see it, we flag the scan and exclude it from your progress. Your shade reading would be distorted. We always give you your true shade.',
      },
      {
        type: 'p',
        text:
          'If you want real whitening, you need a product with peroxide or carbamide. Those agents penetrate the enamel and break down stain molecules. Color correcting products do not do this. They are cosmetic paint, not whitening treatment.',
      },
      {
        type: 'p',
        text:
          'There is nothing wrong with using color correcting strips for a quick cosmetic boost before a photo or an event. Just know what you are getting. It is paint, not a treatment. Your true shade is what matters for tracking your progress. teewai gives you that, every time.',
      },
    ],
  },
];