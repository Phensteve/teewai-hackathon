import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense, lazy, useState } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import VisitorHeartbeat from './components/VisitorHeartbeat';
import DeviceSync from '@/components/DeviceSync';
import InvitationAttribution from '@/components/influencers/InvitationAttribution';
import OfflineIndicator from '@/components/OfflineIndicator';
import ConsentBanner from '@/components/ConsentBanner';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';


import { isNativeApp } from '@/lib/isNativeApp';
// Keep the authenticated workspace out of the public landing bundle.
const AppShell = lazyWithRetry(() => import('@/components/AppShell'));
import ErrorBoundary from '@/components/ErrorBoundary';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import PageSkeleton from '@/components/loading/PageSkeleton';

const NativeIntro = lazyWithRetry(() => import('@/pages/NativeIntro'));
const Login = lazyWithRetry(() => import('@/pages/Login'));
const Register = lazyWithRetry(() => import('@/pages/Register'));
const ForgotPassword = lazyWithRetry(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazyWithRetry(() => import('@/pages/ResetPassword'));

// Route-level code splitting — each page loads its own JS chunk on demand.
// This keeps the initial bundle small (faster TTI on slow connections, which
// is critical for mobile users in emerging markets). lazyWithRetry handles
// chunk-load failures by auto-reloading once (poor connectivity recovery).
const Landing = lazyWithRetry(() => import('@/pages/Landing'));
const HomeTest = lazyWithRetry(() => import('@/pages/HomeTest'));
const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'));
const Scan = lazyWithRetry(() => import('@/pages/Scan'));
const Results = lazyWithRetry(() => import('@/pages/Results'));
const Subscription = lazyWithRetry(() => import('@/pages/Subscription'));
const ComingSoon = lazyWithRetry(() => import('@/pages/ComingSoon'));
const FindDentist = lazyWithRetry(() => import('@/pages/FindDentist'));
const Terms = lazyWithRetry(() => import('@/pages/Terms'));
const Privacy = lazyWithRetry(() => import('@/pages/Privacy'));
const Support = lazyWithRetry(() => import('@/pages/Support'));
const HelpCenter = lazyWithRetry(() => import('@/pages/HelpCenter'));
const Sitemap = lazyWithRetry(() => import('@/pages/Sitemap'));
const ReferenceMaterial = lazyWithRetry(() => import('@/pages/ReferenceMaterial'));
const Leaderboard = lazyWithRetry(() => import('@/pages/Leaderboard'));
const Profile = lazyWithRetry(() => import('@/pages/Profile'));
const EditProfile = lazyWithRetry(() => import('@/pages/EditProfile'));
const Checkout = lazyWithRetry(() => import('@/pages/Checkout'));
const ThankYou = lazyWithRetry(() => import('@/pages/ThankYou'));
const Admin = lazyWithRetry(() => import('@/pages/Admin'));
const MyScans = lazyWithRetry(() => import('@/pages/MyScans'));
const Onboarding = lazyWithRetry(() => import('@/pages/Onboarding'));
const BracesCheck = lazyWithRetry(() => import('@/pages/BracesCheck'));
const CompleteProfile = lazyWithRetry(() => import('@/pages/CompleteProfile'));
const Family = lazyWithRetry(() => import('@/pages/Family'));
const HomeWhitening = lazyWithRetry(() => import('@/pages/HomeWhitening'));
const StainTracker = lazyWithRetry(() => import('@/pages/StainTracker'));
const FoodHistory = lazyWithRetry(() => import('@/pages/FoodHistory'));
const VitaTimeline = lazyWithRetry(() => import('@/pages/VitaTimeline'));
const Blog = lazyWithRetry(() => import('@/pages/Blog'));
const NewsUpdates = lazyWithRetry(() => import('@/pages/NewsUpdates'));
const Community = lazyWithRetry(() => import('@/pages/Community'));
const BlogWrite = lazyWithRetry(() => import('@/pages/BlogWrite'));
const Apply = lazyWithRetry(() => import('@/pages/Apply'));
const SmileTimeMachine = lazyWithRetry(() => import('@/pages/SmileTimeMachine'));
const TeewaiWorld = lazyWithRetry(() => import('@/pages/TeewaiWorld'));
const DentistPortal = lazyWithRetry(() => import('@/pages/DentistPortal'));
const SmileGoal = lazyWithRetry(() => import('@/pages/SmileGoal'));
const CalibrationCard = lazyWithRetry(() => import('@/pages/CalibrationCard'));
const FreeScan = lazyWithRetry(() => import('@/pages/FreeScan'));
const Pricing = lazyWithRetry(() => import('@/pages/Pricing'));
const Refunds = lazyWithRetry(() => import('@/pages/Refunds'));
const Cookies = lazyWithRetry(() => import('@/pages/Cookies'));
const DentistDirectory = lazyWithRetry(() => import('@/pages/DentistDirectory'));
const DentistProfilePage = lazyWithRetry(() => import('@/pages/DentistProfilePage'));
const MyDentists = lazyWithRetry(() => import('@/pages/MyDentists'));
const DentistWorkspace = lazyWithRetry(() => import('@/pages/DentistWorkspace'));
const DentistShell = lazyWithRetry(() => import('@/components/dentist/DentistShell'));
const DentistOverviewPage = lazyWithRetry(() => import('@/pages/DentistOverviewPage'));
const DentistPending = lazyWithRetry(() => import('@/pages/DentistPending'));
const DentistBilling = lazyWithRetry(() => import('@/pages/DentistBilling'));
const DentistPracticeProfile = lazyWithRetry(() => import('@/pages/DentistPracticeProfile'));
const DentistSettings = lazyWithRetry(() => import('@/pages/DentistSettings'));
const DentistAppointmentsPage = lazyWithRetry(() => import('@/pages/DentistAppointmentsPage'));
const DentistReviewRequests = lazyWithRetry(() => import('@/pages/DentistReviewRequests'));
const SecuritySettings = lazyWithRetry(() => import('@/pages/SecuritySettings'));
const ShadeTracker = lazyWithRetry(() => import('@/pages/ShadeTracker'));
const Briefs = lazyWithRetry(() => import('@/pages/Briefs'));
const PostLogin = lazyWithRetry(() => import('@/pages/PostLogin'));
const TipHistory = lazyWithRetry(() => import('@/pages/TipHistory'));
const Collection = lazyWithRetry(() => import('@/pages/Collection'));
const Referrals = lazyWithRetry(() => import('@/pages/Referrals'));
const ReferralPolicy = lazyWithRetry(() => import('@/pages/ReferralPolicy'));
const Routine = lazyWithRetry(() => import('@/pages/Routine'));
const AskTeewai = lazyWithRetry(() => import('@/pages/AskTeewai'));
const ReferralFlyer = lazyWithRetry(() => import('@/pages/ReferralFlyer'));
const InfluencerProgress = lazyWithRetry(() => import('@/pages/InfluencerProgress'));

// Loading fallback for lazy-loaded routes
const PageLoader = () => <PageSkeleton withNavigation />;

const AuthenticatedApp = () => {
  const { authError } = useAuth();
  const location = useLocation();

  // APK onboarding intro — the literal first screen on a fresh install,
  // before any sign in or sign up screen. Once per device (device-local
  // flag), never on web. Skip available from slide 1, "Get started" CTA
  // at the end.
  const [showIntro, setShowIntro] = useState(() => {
    try { return isNativeApp() && !localStorage.getItem('teewai_onboarding_done'); } catch { return false; }
  });
  if (showIntro) {
    return (
      <Suspense fallback={<PageLoader />}>
      <NativeIntro
        onDone={() => {
          try { localStorage.setItem('teewai_onboarding_done', '1'); } catch { /* */ }
          setShowIntro(false);
        }}
      />
      </Suspense>
    );
  }

  // Handle authentication errors
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app.
  // Page transitions are handled INSIDE each shell (AppShell / DentistShell)
  // via <PageTransition>, so the top bar, bottom nav and desktop sidebar stay
  // mounted and never animate or shift on navigation.
  return (
    <ErrorBoundary>
    <OfflineIndicator />
    <ConsentBanner />
    <Suspense fallback={<PageLoader />}>
    <Routes location={location}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Landing />} />
      <Route path="/free-scan" element={<FreeScan />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/refunds" element={<Refunds />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/referral-policy" element={<ReferralPolicy />} />
      <Route path="/referral-flyer" element={<ReferralFlyer />} />
      <Route path="/influencer-progress" element={<InfluencerProgress />} />
      <Route path="/hometest" element={<HomeTest />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/news" element={<NewsUpdates />} />
      <Route path="/community" element={<Community />} />
      <Route path="/teewai-world" element={<TeewaiWorld />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/support" element={<Support />} />
      <Route path="/help" element={<HelpCenter />} />
      <Route path="/sitemap" element={<Sitemap />} />
      <Route path="/reference-material" element={<ReferenceMaterial />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/dentist" element={<Navigate to="/dentist-dashboard" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/post-login" element={<PostLogin />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-scans" element={<MyScans />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/braces-check" element={<BracesCheck />} />
          <Route path="/results/:id" element={<ErrorBoundary><Results /></ErrorBoundary>} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/family" element={<Family />} />
          <Route path="/home-whitening" element={<HomeWhitening />} />
          <Route path="/stain-tracker" element={<StainTracker />} />
          <Route path="/shade-tracker" element={<ShadeTracker />} />
          <Route path="/briefs" element={<Briefs />} />
          <Route path="/food-history" element={<FoodHistory />} />
          <Route path="/timeline" element={<VitaTimeline />} />
          <Route path="/time-machine" element={<SmileTimeMachine />} />
          <Route path="/find-dentist" element={<FindDentist />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/write" element={<BlogWrite />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/smile-goal" element={<SmileGoal />} />
          <Route path="/calibration-card" element={<CalibrationCard />} />
          <Route path="/dentists" element={<DentistDirectory />} />
          <Route path="/dentists/:id" element={<DentistProfilePage />} />
          <Route path="/my-dentists" element={<MyDentists />} />
          <Route path="/my-care-team" element={<Navigate to="/find-dentist" replace />} />
          <Route path="/security-settings" element={<SecuritySettings />} />
          <Route path="/tip-history" element={<TipHistory />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/ask-teewai" element={<AskTeewai />} />
        </Route>
        <Route element={<DentistShell />}>
          <Route path="/dentist-dashboard" element={<DentistOverviewPage />} />
          <Route path="/dentist-patients" element={<DentistWorkspace />} />
          <Route path="/dentist-pending" element={<DentistPending />} />
          <Route path="/dentist-appointments" element={<DentistAppointmentsPage />} />
          <Route path="/dentist-reviews" element={<DentistReviewRequests />} />
          <Route path="/dentist-billing" element={<DentistBilling />} />
          <Route path="/dentist-profile" element={<DentistPracticeProfile />} />
          <Route path="/dentist-settings" element={<DentistSettings />} />
        </Route>
        <Route path="/dentist-test" element={<DentistPortal />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <VisitorHeartbeat />
          <DeviceSync />
          <InvitationAttribution />
          <AuthenticatedApp />
          <Toaster />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App