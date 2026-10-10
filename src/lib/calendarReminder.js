// Generates an .ics file with a daily recurring "Teewai Smile Scan" event and
// triggers a download. On the Android APK, the downloaded .ics file is offered
// to open in the phone's native calendar app — the user just taps "Add" and
// the daily recurring event (with a built-in alarm) is saved to their phone.
// On web, the file downloads for manual import into Google/Apple Calendar.
//
// This is the most reliable cross-platform approach: no OAuth, no plan-gated
// connector, works offline, and survives app reinstalls because the event
// lives in the phone's own calendar database.

function pad(n) {
  return String(n).padStart(2, '0');
}

// Format a Date as local ICS datetime (no Z suffix = local floating time).
// Using local time (not UTC) means the reminder fires at the same wall-clock
// hour regardless of timezone changes — what the user expects.
function formatICSLocal(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

// Format a Date as UTC ICS datetime (for DTSTAMP).
function formatICSUTC(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

export function generateTeewaiICS(hour = 8, minute = 0) {
  const now = new Date();

  // Next occurrence at the chosen time (today if still in the future, else tomorrow).
  const start = new Date(now);
  start.setHours(hour, minute, 0, 0);
  if (start <= now) {
    start.setDate(start.getDate() + 1);
  }

  // 5-minute event window.
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 5);

  const dtstart = formatICSLocal(start);
  const dtend = formatICSLocal(end);
  const dtstamp = formatICSUTC(now);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//teewai//smile scan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:teewai-daily-scan-${Date.now()}@teewai.app`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:🦷 Teewai Smile Scan',
    'DESCRIPTION:Time for your daily smile scan! Open teewai and scan your teeth to keep your streak alive.\\n\\nOpen: https://teewai.app/scan',
    'LOCATION:teewai app',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT0S',
    'ACTION:DISPLAY',
    'DESCRIPTION:Time for your Teewai smile scan!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadTeewaiCalendarReminder(hour = 8, minute = 0) {
  const ics = generateTeewaiICS(hour, minute);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teewai-daily-scan.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}