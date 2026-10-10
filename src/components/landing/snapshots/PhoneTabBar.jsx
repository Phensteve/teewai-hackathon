import { LayoutDashboard, Camera, Trophy, CreditCard, Users, User } from 'lucide-react';

const ITEMS = [
  { icon: LayoutDashboard, label: 'Home' },
  { icon: Camera, label: 'Scan' },
  { icon: Trophy, label: 'Rank' },
  { icon: CreditCard, label: 'Plan' },
  { icon: Users, label: 'Family' },
  { icon: User, label: 'Profile' },
];

// The app's real bottom tab bar at true device scale, including the iOS home
// indicator. `active` is the index of the highlighted tab.
export default function PhoneTabBar({ active = 0, dark = false }) {
  return (
    <div
      className={`shrink-0 border-t ${dark ? 'border-white/10 bg-olo-deep' : 'border-border bg-card'}`}
    >
      <div className="flex items-start justify-around px-2 pt-2.5">
        {ITEMS.map(({ icon: Icon, label }, i) => {
          const on = i === active;
          const idle = dark ? 'text-white/35' : 'text-muted-foreground/55';
          return (
            <div key={label} className="flex flex-col items-center gap-1 w-[54px]">
              <Icon className={`w-[22px] h-[22px] ${on ? 'text-olo' : idle}`} strokeWidth={on ? 2.4 : 1.9} />
              <span className={`text-[10px] leading-none ${on ? 'text-olo font-semibold' : idle}`}>{label}</span>
            </div>
          );
        })}
      </div>
      {/* Home indicator */}
      <div className="h-[22px] flex items-end justify-center pb-[7px]">
        <div className={`w-[134px] h-[5px] rounded-full ${dark ? 'bg-white/35' : 'bg-foreground/25'}`} />
      </div>
    </div>
  );
}