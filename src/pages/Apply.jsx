import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Stethoscope, PenLine } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import MedicalVerificationCard from '@/components/profile/MedicalVerificationCard';
import BlogVerificationCard from '@/components/profile/BlogVerificationCard';
import Spinner from '@/components/Spinner';

// Auth-gated applications page. Hosts the two verification applications that
// used to clutter the profile: medical professional + verified blogger.
// Inaccessible to anyone who isn't signed in (route is under ProtectedRoute).
export default function Apply() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    unrufld.auth.me().then((u) => setMe(u)).catch(() => setMe(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center min-h-[60vh]"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5">
        <ArrowRight className="w-4 h-4 rotate-180" /> Back to profile
      </Link>
      <div className="mb-6">
        <h1 className="font-heading font-700 text-2xl tracking-tight">Applications & verification</h1>
        <p className="text-sm text-muted-foreground mt-1">Apply to be recognised as a medical professional or a verified teewai blogger. Each application is reviewed by our team.</p>
      </div>
      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-4 h-4 text-olo" />
            <h2 className="font-heading font-600 text-lg">Medical professional</h2>
          </div>
          <MedicalVerificationCard user={me} />
        </section>
        <section>
          <div className="flex items-center gap-2 mb-3">
            <PenLine className="w-4 h-4 text-olo" />
            <h2 className="font-heading font-600 text-lg">Verified blogger</h2>
          </div>
          <BlogVerificationCard user={me} />
        </section>
      </div>
    </div>
  );
}