import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function ConsentDialog({ open, dentist, assignmentType, onConsent, onCancel, loading }) {
  if (!dentist) return null;
  const isPrimary = assignmentType === 'primary';
  const name = dentist.full_name || dentist.clinic_name || 'this dentist';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-olo" />
            Consent to share your scan data
          </DialogTitle>
          <DialogDescription className="text-left pt-2 space-y-3">
            <p>
              <strong className="text-foreground">{name}</strong> will be your{' '}
              <strong className="text-foreground">{isPrimary ? 'primary' : 'secondary'}</strong> dentist.
            </p>
            {isPrimary ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Eye className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
                  <span>They'll see <strong className="text-foreground">all your scan reports</strong>: whiteness scores, shade matching, recommendations, AI feedback, and gamification progress.</span>
                </div>
                <div className="flex items-start gap-2">
                  <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span>They will <strong className="text-foreground">not</strong> see your scan photos unless you explicitly turn on photo access after consenting.</span>
                </div>
                <div className="flex items-start gap-2">
                  <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span>You can revoke access at any time. They immediately lose all access to your data.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Eye className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
                  <span>They'll only see scans you <strong className="text-foreground">individually share</strong> with them, not your full scan history.</span>
                </div>
                <div className="flex items-start gap-2">
                  <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span>For each shared scan, you choose whether to include photos or share the report only.</span>
                </div>
                <div className="flex items-start gap-2">
                  <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span>You can unshare any scan or revoke access at any time.</span>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConsent} disabled={loading} className="bg-olo text-white hover:bg-olo/90">
            {loading ? 'Saving…' : 'I consent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}