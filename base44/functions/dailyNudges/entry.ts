import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Daily push-notification nudges — fires 8 times a day via the DailyNudges
// workflow (7am, 9am, 11am, 1pm, 3pm, 5pm, 7pm, 9pm Africa/Lagos). Each slot
// sends a different reminder: morning brush, water, daily tip, food scan,
// water, streak, teeth scan, night brush.
//
// Reaches users on the teewai native mobile app with push credentials
// configured. SendPushNotification silently no-ops for web users and
// unconfigured builds, so only native app users receive these.

const NUDGE_SCHEDULE = [
  { hour: 7, type: "brush_morning" },
  { hour: 9, type: "water" },
  { hour: 11, type: "daily_tip" },
  { hour: 13, type: "food_scan" },
  { hour: 15, type: "water" },
  { hour: 17, type: "streak" },
  { hour: 19, type: "teeth_scan" },
  { hour: 21, type: "brush_night" },
];

// Condensed tip pool (mirrors src/lib/dailyTips.js). The push notification
// shows a short teaser; the user opens the app to read the full tip.
const TIP_POOL = [
  { title: "The purple strip trick", body: "Purple strips and serums don't whiten, they paint." },
  { title: "What VITA shade letters mean", body: "A is reddish brown, B is reddish yellow, C is gray, D is reddish gray." },
  { title: "How whitening actually works", body: "Peroxide breaks stain molecules into smaller, colorless pieces." },
  { title: "What causes most stains", body: "Chromogens from coffee, tea, and wine. Tannins help them stick to enamel." },
  { title: "Why teeth yellow with age", body: "Enamel thins over time and the yellow dentin shows through." },
  { title: "Why reference cards matter", body: "A white card next to your teeth calibrates the color reading." },
  { title: "The bleached shade guide", body: "VITA has a separate guide for whitened teeth: 0M1, 0M2, 0M3." },
  { title: "Water helps your teeth", body: "Drinking water after staining foods rinses the surface and protects enamel." },
  { title: "Brush for two full minutes", body: "Split the time into 30 seconds per corner of your mouth." },
  { title: "Floss before you brush", body: "Flossing first loosens plaque so brushing clears it all away." },
  { title: "Wait 30 minutes after eating", body: "Acid softens enamel for about half an hour. Wait, then brush." },
  { title: "Clean your tongue daily", body: "Bacteria on your tongue cause most bad breath." },
  { title: "Use soft bristles", body: "Hard bristles damage gums and wear down enamel over time." },
  { title: "Spit, do not rinse after brushing", body: "Leave a thin layer of fluoride on your teeth overnight." },
  { title: "Drink water after coffee", body: "A few sips wash away dark pigments before they settle into enamel." },
];

// Deterministic daily pick — same tip every user sees on the same day.
function getDailyTip() {
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return TIP_POOL[Math.abs(hash) % TIP_POOL.length];
}

function getLagosHour() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    hour12: false,
  });
  return parseInt(fmt.format(new Date()), 10);
}

function buildNudge(type: string) {
  switch (type) {
    case "brush_morning":
      return {
        title: "Morning brush time",
        content: "Start your day with a clean smile. Two minutes, gentle circles.",
        action_label: "Open teewai",
        action_url: "https://teewai.app/dashboard",
      };
    case "water":
      return {
        title: "Time for a glass of water",
        content: "Water keeps your saliva flowing and your enamel protected.",
        action_label: "Open teewai",
        action_url: "https://teewai.app/dashboard",
      };
    case "daily_tip": {
      const tip = getDailyTip();
      const teaser = tip.body.length > 80 ? tip.body.slice(0, 77) + "..." : tip.body;
      return {
        title: `Today's tip: ${tip.title}`,
        content: `${teaser} Open teewai to read the full tip.`,
        action_label: "Read more",
        action_url: "https://teewai.app/dashboard",
      };
    }
    case "food_scan":
      return {
        title: "Log your meal",
        content: "Snap your food to see what is staining your smile today.",
        action_label: "Scan food",
        action_url: "https://teewai.app/scan",
      };
    case "streak":
      return {
        title: "Keep your streak alive",
        content: "A quick scan today keeps your streak going. It takes seconds.",
        action_label: "Scan now",
        action_url: "https://teewai.app/scan",
      };
    case "teeth_scan":
      return {
        title: "Time for your evening scan",
        content: "See how your smile held up today. One photo takes seconds.",
        action_label: "Scan now",
        action_url: "https://teewai.app/scan",
      };
    case "brush_night":
      return {
        title: "Night brush",
        content: "Brush before bed so stains don't sit on your teeth all night.",
        action_label: "Open teewai",
        action_url: "https://teewai.app/dashboard",
      };
    default:
      return null;
  }
}

export default async function (req: Request) {
  try {
    const unrufld = createClientFromRequest(req);

    const hour = getLagosHour();
    const slot = NUDGE_SCHEDULE.find((s) => s.hour === hour);
    if (!slot) {
      return Response.json({ skipped: true, reason: `No nudge scheduled for hour ${hour}` });
    }

    const nudge = buildNudge(slot.type);
    if (!nudge) {
      return Response.json({ skipped: true, reason: "Unknown nudge type" });
    }

    let users: any[] = [];
    try {
      users = (await unrufld.asServiceRole.entities.User.list("-created_date", 10000)) || [];
    } catch {}

    let pushed = 0;
    let failed = 0;

    for (const u of users) {
      if (!u.id || !u.email) continue;
      if (u.account_status === "deleted" || u.account_status === "suspended") continue;

      try {
        await unrufld.asServiceRole.integrations.Core.SendPushNotification({
          user_id: u.id,
          title: nudge.title,
          content: nudge.content,
          action_label: nudge.action_label,
          action_url: nudge.action_url,
        });
        pushed++;
      } catch {
        failed++;
      }
    }

    return Response.json({
      nudge_type: slot.type,
      hour,
      pushed,
      failed,
      totalUsers: users.length,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}