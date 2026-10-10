// Canonical left-to-right order of the mobile bottom-nav destinations, used to
// give page transitions a spatial direction: going to a tab on the RIGHT makes
// the new page slide in from the right; going to one on the LEFT slides it in
// from the left. /family shares the find-dentist slot (they swap into the same
// nav position depending on family membership).
export const NAV_SLOTS = [
  '/dashboard',
  '/scan',
  '/leaderboard',
  '/stain-tracker',
  '/find-dentist',
  '/profile',
];

export function navSlot(pathname) {
  if (!pathname) return -1;
  if (pathname === '/family' || pathname.startsWith('/family/')) return 4;
  for (let i = 0; i < NAV_SLOTS.length; i++) {
    const p = NAV_SLOTS[i];
    if (pathname === p || pathname.startsWith(p + '/')) return i;
  }
  return -1;
}