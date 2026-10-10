import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { influencerCall } from '@/lib/influencers';
import InvitationManager from '@/components/influencers/InvitationManager';
import InfluencerPayouts from '@/components/influencers/InfluencerPayouts';
import { adminAuth } from '@/lib/adminAuth';
import CouponManager from '@/components/CouponManager';
import AdminManagement from '@/components/AdminManagement';
import IdentityMirrorPanel from '@/components/IdentityMirrorPanel';
import UserManagement from '@/components/UserManagement';
import LiveScans from '@/components/LiveScans';
import LiveVisitors from '@/components/admin/LiveVisitors';
import TrafficChart from '@/components/admin/TrafficChart';
import AdminAuditLog from '@/components/AdminAuditLog';
import DormantFeaturesPanel from '@/components/DormantFeaturesPanel';
import HeroVariantSwitcher from '@/components/admin/HeroVariantSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import AdminSecurity from '@/components/AdminSecurity';
import PhotoAuditTable from '@/components/PhotoAuditTable';
import MedicalReviewPanel from '@/components/admin/MedicalReviewPanel';
import AdminTierManager from '@/components/admin/AdminTierManager';
import IpBanPanel from '@/components/admin/IpBanPanel';
import AppealsPanel from '@/components/admin/AppealsPanel';
import BlogReviewPanel from '@/components/admin/BlogReviewPanel';
import CommunityPanel from '@/components/admin/CommunityPanel';
import TipsPanel from '@/components/admin/TipsPanel';
import ReferralPanel from '@/components/admin/ReferralPanel';
import { ShieldCheck, Tag, Users, Database, LogOut, BarChart3, ScrollText, FlaskConical, LayoutTemplate, Lock, Image as ImageIcon, Stethoscope, UserCog, ShieldOff, Newspaper, MessageCircle, Gavel, Lightbulb, Gift } from 'lucide-react';

const TABS = [
  { id: 'users', label: 'Users', icon: BarChart3 },
  { id: 'photos', label: 'Photos', icon: ImageIcon },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'invitations', label: 'Invitations', icon: Users },
  { id: 'payouts', label: 'Payouts', icon: Gift },
  { id: 'admins', label: 'Admins', icon: Users },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'activity', label: 'Activity', icon: ScrollText },
  { id: 'mirror', label: 'Identity mirror', icon: Database },
  { id: 'features', label: 'Features', icon: FlaskConical, superOnly: true },
  { id: 'hero', label: 'Hero', icon: LayoutTemplate, superOnly: true },
  { id: 'medical', label: 'Medical', icon: Stethoscope, medOnly: true },
  { id: 'tiers', label: 'Tiers', icon: UserCog, superOnly: true },
  { id: 'ips', label: 'IP Bans', icon: ShieldOff, ipOnly: true },
  { id: 'appeals', label: 'Appeals', icon: Gavel, ipOnly: true },
  { id: 'community', label: 'Community', icon: MessageCircle, modOnly: true },
  { id: 'blogs', label: 'Blogs', icon: Newspaper, blogOnly: true },
  { id: 'tips', label: 'Tips', icon: Lightbulb, superOnly: true },
  { id: 'referrals', label: 'Referrals', icon: Gift },
];

export default function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState('users');
  const user = adminAuth.getUser();
  const role = adminAuth.getRole();
  const [campaignTarget, setCampaignTarget] = useState(null);
  const payoutCount = useQuery({ queryKey: ['influencer-payout-count'], queryFn: () => influencerCall('payoutCount', {}, true), refetchInterval: 30000 });

  return (
    <div className="min-h-screen bg-background safe-area-inset-top">
      {/* Sticky header — title + tab bar stay pinned at the top while the
          panel content scrolls underneath, like the app's menu bar. */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-olo" />
              </div>
              <div>
                <h1 className="font-heading font-700 text-2xl tracking-tight">Admin</h1>
                <p className="text-muted-foreground text-sm capitalize">Signed in as {user || 'admin'} · {role.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            {TABS.filter((t) => {
              if (t.superOnly) return role === 'super_admin';
              if (t.medOnly) return role === 'super_admin' || role === 'medical_admin';
              if (t.ipOnly) return role === 'super_admin' || role === 'admin';
              if (t.modOnly) return ['super_admin', 'medical_admin', 'content_admin', 'admin'].includes(role);
              if (t.blogOnly) return role === 'super_admin' || role === 'content_admin';
              return true;
            }).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 py-2 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  tab === id ? 'bg-olo text-white shadow-sm' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {id === 'payouts' && payoutCount.data?.pending > 0 && <span role="status" className="rounded-full bg-destructive text-destructive-foreground px-2 text-xs">{payoutCount.data.pending}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-8" style={{ '--admin-nav-h': '129px' }}>
        {tab === 'users' && (<><LiveVisitors /><TrafficChart /><LiveScans /><UserManagement /></>)}
        {tab === 'photos' && <PhotoAuditTable />}
        {payoutCount.data?.pending > 0 && tab !== 'payouts' && <button onClick={() => setTab('payouts')} className="mb-4 w-full rounded-xl border border-warning bg-warning-soft p-3 text-warning text-sm text-left">{payoutCount.data.pending} influencer payout request(s) awaiting settlement. View payouts</button>}
        {tab === 'coupons' && <CouponManager callerRole={role} campaignTarget={campaignTarget} onLinked={() => setCampaignTarget(null)} />}
        {tab === 'invitations' && <InvitationManager callerRole={role} onDiscount={campaign => { setCampaignTarget(campaign); setTab('coupons'); }} />}
        {tab === 'payouts' && <InfluencerPayouts callerRole={role} />}
        {tab === 'admins' && <AdminManagement callerRole={role} />}
        {tab === 'security' && <AdminSecurity callerRole={role} />}
        {tab === 'activity' && <AdminAuditLog />}
        {tab === 'mirror' && <IdentityMirrorPanel />}
        {tab === 'features' && role === 'super_admin' && <DormantFeaturesPanel />}
        {tab === 'hero' && role === 'super_admin' && <HeroVariantSwitcher />}
        {tab === 'medical' && (role === 'super_admin' || role === 'medical_admin') && <MedicalReviewPanel callerRole={role} />}
        {tab === 'tiers' && role === 'super_admin' && <AdminTierManager />}
        {tab === 'ips' && (role === 'super_admin' || role === 'admin') && <IpBanPanel />}
        {tab === 'appeals' && (role === 'super_admin' || role === 'admin') && <AppealsPanel />}
        {tab === 'community' && ['super_admin', 'medical_admin', 'content_admin', 'admin'].includes(role) && <CommunityPanel callerRole={role} />}
        {tab === 'blogs' && (role === 'super_admin' || role === 'content_admin') && <BlogReviewPanel callerRole={role} />}
        {tab === 'tips' && role === 'super_admin' && <TipsPanel />}
        {tab === 'referrals' && <ReferralPanel />}
      </div>
    </div>
  );
}