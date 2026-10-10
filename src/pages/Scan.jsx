import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { unrufld } from '@/api/unrufldClient';
import ScanUploader from '@/components/ScanUploader';
import { createScanProgress, TEETH_SCAN_STAGES } from '@/lib/scanProgress';
import FullScanStepper from '@/components/scan/FullScanStepper';
import ScanReference from '@/components/scan/ScanReference';
import ScanProcessing from '@/components/scan/ScanProcessing';
import ScanLimitState from '@/components/scan/ScanLimitState';
import ScanModePicker from '@/components/scan/ScanModePicker';
import ScanGuidance from '@/components/scan/ScanGuidance';
import ScanRewards from '@/components/scan/ScanRewards';
import {
  Camera,
  RotateCcw,
  Users,
  Sun,
  Brush,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { initAudio, playShutter, playAnalyzing } from '@/lib/sounds';
import {
  scans as insforgeScans,
  photos as insforgePhotos,
  dentistClients,
  deleteScan,
  compressImage,
} from '@/lib/insforgeDb';
import { getCachedSubscription } from '@/lib/subscriptionCache';
import { buildScanPayload, preAnalyze } from '@/lib/unrufldteeth';
import {
  playGamificationCues,
  buildRewardState,
  isNetworkError,
  applyColorimetricConsensus,
  applyVioletCastDetection,
} from '@/lib/scanFlow';
import { applyStainAnalysis } from '@/lib/stainAnalysis';
import { FREE_SCANS } from '@/lib/payment';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { checkLighting } from '@/lib/lightingCheck';
import { plantBloomForScan } from '@/lib/bloom';
import { useSubscription, SUBSCRIPTION_KEY } from '@/hooks/use-subscription';
import { useUserProfile } from '@/hooks/use-user-profile';
import { SCANS_KEY, ALL_SCANS_KEY } from '@/hooks/use-scans';

const POSITIONS = [
  { key: 'front', label: 'front of your teeth', desc: 'Smile straight at the camera' },
  { key: 'top', label: 'the top of your teeth', desc: 'Tilt your head back to show upper teeth' },
  { key: 'left', label: 'the left side', desc: 'Show the left side of your smile' },
  { key: 'right', label: 'the right side', desc: 'Show the right side of your smile' },
];

const APPLIANCE_LABELS = {
  metal_braces: 'metal braces',
  ceramic_braces: 'ceramic braces',
  lingual_braces: 'lingual braces',
  clear_aligners: 'clear aligners',
  hawley_retainer: 'Hawley retainer',
  clear_retainer: 'clear retainer',
  fixed_retainer: 'fixed retainer',
};

// Drop-survival polling: if the analyzeScan call drops, the backend keeps
// running and persists the scan + gamification server-side. Poll the scan
// record until it's completed, then recover the result for the reward reveal.
const pollScanResult = (scanId, timeoutMs = 150000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(id);
        reject(new Error('timeout'));
        return;
      }
      try {
        const s = await insforgeScans.get(scanId);
        if (s && s.status === 'completed') {
          clearInterval(id);
          resolve(s);
        }
      } catch {
        /* keep polling */
      }
    }, 5000);
  });

export default function Scan() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- Server state via React Query (cached, deduped) ---
  // Seed subscription with the in-memory cache so the page renders instantly
  // (no spinner) on entry, then refetch in the background.
  const subscriptionQuery = useSubscription({
    initialData: getCachedSubscription() || undefined,
  });
  const profileQuery = useUserProfile();
  const subscription = subscriptionQuery.data || null;
  const me = profileQuery.data || null;
  const applianceType = me?.appliance_type || 'none';

  // --- Local UI state ---
  const [loading, setLoading] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [error, setError] = useState('');
  const [errorIsNetwork, setErrorIsNetwork] = useState(false);
  const [position, setPosition] = useState('front');
  const [reward, setReward] = useState(null);
  const [memberIdx, setMemberIdx] = useState(0);
  const [scanMode, setScanMode] = useState('quick');
  const [familyMembership, setFamilyMembership] = useState(null);
  // Server-side quota check — the single source of truth for whether the user
  // can scan. Replaces the old client-side limitReached calculation which
  // raced with familyResolve and didn't account for pack scans, causing the
  // plan page to show "15 left" while the scan page showed "no scans left".
  const [quotaCheck, setQuotaCheck] = useState({ loading: true, data: null });
  const [activeScan, setActiveScan] = useState(null);
  const scanTimeoutRef = useRef(null);
  const lastFileRef = useRef(null);
  const wasHiddenRef = useRef(false);
  const [lightingWarn, setLightingWarn] = useState(null);
  const [lastScanImage, setLastScanImage] = useState(null);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, []);

  // Load the user's latest scan image for the ghost thumbnail angle hint.
  useEffect(() => {
    insforgeScans
      .list('-created_date', 1)
      .then((s) => {
        if (s.length > 0) setLastScanImage(s[0].image_url || null);
      })
      .catch(() => {});
  }, []);

  // Track when the app gets backgrounded mid-scan so a dropped fetch shows a
  // clear "interrupted" message + retry instead of a confusing "network error".
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) wasHiddenRef.current = true;
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  // Linked family member? If the owner linked this user's email to a family
  // slot, they scan from their own login using the family pool.
  useEffect(() => {
    unrufld.functions
      .invoke('familyResolve', { op: 'resolve' })
      .then(({ data }) => {
        if (data?.found) setFamilyMembership(data);
      })
      .catch(() => {});
  }, []);

  // Server-side quota check — the authoritative source of truth for whether
  // the user can scan. This replaces the old client-side limitReached
  // calculation that used the user's own subscription + familyMembership,
  // which raced with familyResolve and didn't account for pack scans.
  // The scanQuota function resolves linked membership, pack precedence, and
  // family owner/member context server-side — the same logic that gates the
  // actual scan consumption — so the gate and the consume can never drift.
  const checkQuota = async (idx) => {
    setQuotaCheck((prev) => ({ loading: !prev.data, data: prev.data }));
    try {
      const { data } = await unrufld.functions.invoke('scanQuota', {
        op: 'check',
        cost: 1,
        member_index: idx ?? memberIdx,
      });
      setQuotaCheck({ loading: false, data });
    } catch {
      setQuotaCheck({ loading: false, data: null });
    }
  };
  useEffect(() => {
    checkQuota(memberIdx);
  }, [memberIdx]);

  // Detect a scan that's still analyzing from a previous visit.
  useEffect(() => {
    insforgeScans
      .filter({ status: 'analyzing' })
      .then((scans) => {
        if (scans.length > 0) setActiveScan(scans[0]);
      })
      .catch(() => {});
  }, []);

  // Poll the active scan until it completes, then auto-navigate to results.
  useEffect(() => {
    if (!activeScan) return;
    const start = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - start > 150000) {
        clearInterval(id);
        return;
      }
      try {
        const s = await insforgeScans.get(activeScan.id);
        if (s && s.status === 'completed') {
          setActiveScan(null);
          clearInterval(id);
          navigate(`/results/${s.id}`);
        }
      } catch {
        /* keep polling */
      }
    }, 5000);
    return () => clearInterval(id);
  }, [activeScan, navigate]);

  const isFamily = subscription?.plan === 'family_15' || subscription?.plan === 'family_pro';
  const scansLimit = subscription?.scans_limit || FREE_SCANS;
  const isFamilyMember = !!familyMembership;
  // limitReached is now driven by the server-side scanQuota check — the same
  // logic that gates the actual scan consumption. This eliminates the desync
  // between the plan page (which uses familyResolve + pack scans) and the
  // scan page (which used to use the user's own subscription only).
  const limitReached = !quotaCheck.loading && quotaCheck.data?.allowed === false;

  // Funnel analytics: fires once when a user hits the scan paywall.
  useEffect(() => {
    if (limitReached)
      unrufld.analytics.track({
        eventName: 'scan_paywall_view',
        properties: { plan: subscription?.plan || 'free' },
      });
  }, [limitReached]);

  // Invalidate the scan list + subscription queries so Dashboard / My Scans
  // reflect the new scan and updated quota immediately.
  const invalidateAfterScan = () => {
    queryClient.invalidateQueries({ queryKey: SCANS_KEY });
    queryClient.invalidateQueries({ queryKey: ALL_SCANS_KEY });
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    checkQuota(memberIdx);
  };

  const runScan = async (file) => {
    initAudio();
    playShutter();
    setError('');
    setErrorIsNetwork(false);
    setLoading(true);
    const progress = createScanProgress(setScanStage, TEETH_SCAN_STAGES);
    lastFileRef.current = file;
    wasHiddenRef.current = false;
    let liveScanId = null;
    const scanFor =
      isFamily && memberIdx > 0 ? (subscription?.members || [])[memberIdx]?.name || null : null;
    playAnalyzing();

    scanTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      setErrorIsNetwork(true);
      setError(
        'Analysis is taking longer than expected, but it may still be processing in the background. Check My Scans in a moment — your result will appear there automatically.'
      );
    }, 90000);

    try {
      const { data: quota } = await unrufld.functions.invoke('scanQuota', {
        op: 'check',
        cost: 1,
        member_index: memberIdx,
      });
      if (!quota?.allowed) {
        setError(quota?.reason || "You're out of scans. Grab a pack to keep scanning.");
        setLoading(false);
        return;
      }

      let me = null;
      let dentistId = null;
      try {
        me = await unrufld.auth.me();
      } catch {
        /* anon */
      }

      let isFirst = false;
      try {
        const existing = await insforgeScans.list('-created_date', 1, { user_id: me?.id });
        isFirst = existing.length === 0;
      } catch {
        /* */
      }

      try {
        if (me?.email) {
          const links = await dentistClients.filter({ client_email: me.email });
          if (links.length) dentistId = links[0].dentist_id;
        }
      } catch {
        /* */
      }

      let analysisBlob = file;
      let analysisContentType = 'image/jpeg';
      try {
        const c = await compressImage(file);
        analysisBlob = c.blob;
        analysisContentType = c.contentType;
      } catch {
        /* */
      }
      await progress.advance(1);
      const mirrorFile = new File([analysisBlob], 'scan.jpg', { type: analysisContentType });
      const [insUp, b44Up] = await Promise.all([
        insforgePhotos.uploadBlob(analysisBlob, analysisContentType),
        unrufld.integrations.Core.UploadPublicFile({ file: mirrorFile }).catch(() => null),
      ]);
      const file_url = insUp?.url;
      if (!file_url) throw new Error('Photo upload failed');
      let analysisUrl = b44Up?.file_url || file_url;

      try {
        const live = await insforgeScans.create({
          image_url: file_url,
          capture_position: position,
          patient_email: me?.email || null,
          scan_for: scanFor,
          status: 'analyzing',
        });
        liveScanId = live?.id || null;
      } catch {
        /* */
      }

      const preContextPromise = preAnalyze(file).catch(() => null);

      await progress.advance(2);
      const { data: result } = await unrufld.functions.invoke('analyzeScan', {
        file_url: analysisUrl,
        position,
        scan_id: liveScanId,
        dentist_id: dentistId,
        image_url: file_url,
        scan_mode: 'teeth',
        appliance_type: applianceType !== 'none' ? applianceType : undefined,
      });

      if (result?.needs_another_photo) throw new Error(result.ai_feedback || 'This photo is not readable. Retake it in even light; no scan credit was used.');
      let scan;
      if (result?._scan) {
        scan = result._scan;
        if (scanFor) {
          try {
            await insforgeScans.update(scan.id, { scan_for: scanFor });
          } catch {
            /* */
          }
        }
      } else {
        const scanPayload = buildScanPayload(result, {
          position,
          patientEmail: me?.email || null,
          dentistId,
          imageUrl: file_url,
          scanMode: 'teeth',
        });
        scan = liveScanId
          ? await insforgeScans.update(liveScanId, { ...scanPayload, scan_for: scanFor })
          : await insforgeScans.create({ ...scanPayload, scan_for: scanFor });
      }

      await progress.advance(3);
      const preContext = await preContextPromise;
      await applyColorimetricConsensus(scan, preContext, result, insforgeScans);
      await applyVioletCastDetection(scan, preContext, insforgeScans);
      await progress.advance(4);
      await applyStainAnalysis(scan, result, insforgeScans);
      await progress.advance(5);

      plantBloomForScan(scan, me);

      try {
        await unrufld.functions.invoke('scanQuota', {
          op: 'consume',
          cost: 1,
          member_index: memberIdx,
        });
      } catch {
        /* */
      }
      if (isFamilyMember) {
        try {
          const { data: fr } = await unrufld.functions.invoke('familyResolve', { op: 'resolve' });
          if (fr?.found) setFamilyMembership(fr);
        } catch {
          /* */
        }
      }
      invalidateAfterScan();

      const g = result?._gamification;
      playGamificationCues(g);
      clearTimeout(scanTimeoutRef.current);
      await progress.finish();
      setLoading(false);
      unrufld.analytics.track({
        eventName: 'scan_complete',
        properties: { scan_type: 'quick', is_first: isFirst },
      });
      setReward(buildRewardState({ g, scanId: scan.id, isFirst }));
    } catch (e) {
      clearTimeout(scanTimeoutRef.current);
      const msg = e?.message || '';
      const isNetwork = isNetworkError(e, wasHiddenRef.current);
      if (isNetwork && liveScanId) {
        try {
          const completed = await pollScanResult(liveScanId);
          const g = completed?.gamification;
          playGamificationCues(g);
          setLoading(false);
          invalidateAfterScan();
          setReward(buildRewardState({ g, scanId: completed.id }));
          return;
        } catch {
          setErrorIsNetwork(true);
          setError(
            'Your scan is still processing in the background. Check My Scans in a moment. Your result will appear there automatically.'
          );
          setLoading(false);
          return;
        }
      }
      setErrorIsNetwork(isNetwork);
      if (!isNetwork && liveScanId) {
        try {
          await deleteScan(liveScanId);
        } catch {
          /* */
        }
      }
      setError(
        isNetwork
          ? 'Your scan was interrupted, but it may still be processing. Check My Scans in a moment. Your result will appear there automatically.'
          : msg || "We couldn't finish analyzing this photo. No scan credit was used — retake it in good, even light and try again."
      );
      setLoading(false);
    }
  };

  const handleQuickFile = async (file) => {
    const v = await checkLighting(file).catch(() => ({ level: 'unknown' }));
    if (!v || v.level === 'good' || v.level === 'unknown') {
      runScan(file);
      return;
    }
    setLightingWarn({ ...v, file });
  };
  const scanAnyway = () => {
    const f = lightingWarn?.file;
    setLightingWarn(null);
    if (f) runScan(f);
  };

  const pos = POSITIONS.find((p) => p.key === position);

  const runFullScan = async (photos) => {
    initAudio();
    playShutter();
    setError('');
    setErrorIsNetwork(false);
    setLoading(true);
    const progress = createScanProgress(setScanStage, TEETH_SCAN_STAGES);
    wasHiddenRef.current = false;
    let liveScanId = null;
    const scanFor =
      isFamily && memberIdx > 0 ? (subscription?.members || [])[memberIdx]?.name || null : null;
    playAnalyzing();

    const preContextPromise = photos.front ? preAnalyze(photos.front).catch(() => null) : null;

    scanTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      setErrorIsNetwork(true);
      setError(
        'Full scan analysis is taking longer than expected, but it may still be processing in the background. Check My Scans in a moment. Your result will appear there automatically.'
      );
    }, 120000);

    try {
      const COST = 3;
      const { data: quota } = await unrufld.functions.invoke('scanQuota', {
        op: 'check',
        cost: COST,
        member_index: memberIdx,
      });
      if (!quota?.allowed) {
        setError(
          quota?.reason ||
            `A full scan needs ${COST} scans, but you don't have enough. Grab a pack or run a quick scan (1 scan).`
        );
        setLoading(false);
        return;
      }

      let me = null;
      let dentistId = null;
      try {
        me = await unrufld.auth.me();
      } catch {
        /* */
      }
      let isFirst = false;
      try {
        const existing = await insforgeScans.list('-created_date', 1, { user_id: me?.id });
        isFirst = existing.length === 0;
      } catch {
        /* */
      }
      try {
        if (me?.email) {
          const links = await dentistClients.filter({ client_email: me.email });
          if (links.length) dentistId = links[0].dentist_id;
        }
      } catch {
        /* */
      }

      await progress.advance(1);
      const order = ['front', 'top', 'lower', 'left', 'right'];
      const present = order.filter((k) => photos[k]);
      const uploaded = await Promise.all(
        present.map(async (key) => {
          let blob = photos[key];
          let contentType = 'image/jpeg';
          try {
            const c = await compressImage(photos[key]);
            blob = c.blob;
            contentType = c.contentType;
          } catch {
            /* */
          }
          const [insUp, b44Up] = await Promise.all([
            insforgePhotos.uploadBlob(blob, contentType),
            unrufld.integrations.Core.UploadPublicFile({
              file: new File([blob], `${key}.jpg`, { type: contentType }),
            }).catch(() => null),
          ]);
          return { key, fileUrl: insUp?.url, analysisUrl: b44Up?.file_url || insUp?.url };
        })
      );
      const valid = uploaded.filter((u) => u.fileUrl);
      const fileUrls = valid.map((u) => u.fileUrl);
      const analysisUrls = valid.map((u) => u.analysisUrl);
      const frontUrl = fileUrls[0] || null;

      try {
        const live = await insforgeScans.create({
          image_url: frontUrl,
          image_urls: fileUrls,
          scan_type: 'full',
          capture_position: 'front',
          patient_email: me?.email || null,
          scan_for: scanFor,
          status: 'analyzing',
        });
        liveScanId = live?.id || null;
      } catch {
        /* */
      }

      await progress.advance(2);
      const { data: result } = await unrufld.functions.invoke('analyzeScan', {
        file_urls: analysisUrls,
        image_urls: fileUrls,
        image_url: frontUrl,
        scan_type: 'full',
        position: 'front',
        scan_id: liveScanId,
        dentist_id: dentistId,
        scan_mode: 'teeth',
        appliance_type: applianceType !== 'none' ? applianceType : undefined,
      });

      if (result?.needs_another_photo) throw new Error(result.ai_feedback || 'This photo is not readable. Retake it in even light; no scan credit was used.');
      let scan;
      if (result?._scan) {
        scan = result._scan;
        if (scanFor) {
          try {
            await insforgeScans.update(scan.id, { scan_for: scanFor });
          } catch {
            /* */
          }
        }
      } else {
        const scanPayload = buildScanPayload(result, {
          position: 'front',
          patientEmail: me?.email || null,
          dentistId,
          imageUrl: frontUrl,
          imageUrls: fileUrls,
          scanMode: 'teeth',
          scanType: 'full',
        });
        scan = liveScanId
          ? await insforgeScans.update(liveScanId, { ...scanPayload, scan_for: scanFor })
          : await insforgeScans.create({ ...scanPayload, scan_for: scanFor });
      }

      await progress.advance(3);
      const preContext = await preContextPromise;
      await applyColorimetricConsensus(scan, preContext, result, insforgeScans);
      await applyVioletCastDetection(scan, preContext, insforgeScans);
      await progress.advance(4);
      await applyStainAnalysis(scan, result, insforgeScans);
      await progress.advance(5);

      plantBloomForScan(scan, me);

      try {
        await unrufld.functions.invoke('scanQuota', {
          op: 'consume',
          cost: COST,
          member_index: memberIdx,
        });
      } catch {
        /* */
      }
      if (isFamilyMember) {
        try {
          const { data: fr } = await unrufld.functions.invoke('familyResolve', { op: 'resolve' });
          if (fr?.found) setFamilyMembership(fr);
        } catch {
          /* */
        }
      }
      invalidateAfterScan();

      const g = result?._gamification;
      playGamificationCues(g);
      clearTimeout(scanTimeoutRef.current);
      await progress.finish();
      setLoading(false);
      unrufld.analytics.track({
        eventName: 'scan_complete',
        properties: { scan_type: 'full', is_first: isFirst },
      });
      setReward(buildRewardState({ g, scanId: scan.id, isFirst }));
    } catch (e) {
      clearTimeout(scanTimeoutRef.current);
      const msg = e?.message || '';
      const isNetwork = isNetworkError(e, wasHiddenRef.current);
      if (isNetwork && liveScanId) {
        try {
          const completed = await pollScanResult(liveScanId);
          const g = completed?.gamification;
          playGamificationCues(g);
          setLoading(false);
          invalidateAfterScan();
          setReward(buildRewardState({ g, scanId: completed.id }));
          return;
        } catch {
          setErrorIsNetwork(true);
          setError(
            'Your full scan is still processing in the background. Check My Scans in a moment. Your result will appear there automatically.'
          );
          setLoading(false);
          return;
        }
      }
      setErrorIsNetwork(isNetwork);
      if (!isNetwork && liveScanId) {
        try {
          await deleteScan(liveScanId);
        } catch {
          /* */
        }
      }
      setError(
        isNetwork
          ? 'Your full scan was interrupted, but it may still be processing. Check My Scans in a moment.'
          : msg || "We couldn't finish analyzing your full scan. No scan credit was used — retake the five photos in good, even light and try again."
      );
      setLoading(false);
    }
  };

  // --- Early-return screens ---

  if (activeScan) {
    return <ScanProcessing onDismiss={() => setActiveScan(null)} />;
  }

  if (quotaCheck.loading) return <PageSkeleton />;

  if (limitReached) {
    return (
      <ScanLimitState
        isFamilyMember={isFamilyMember || quotaCheck.data?.context === 'linked_member'}
        familyMembership={familyMembership}
        scansLimit={scansLimit}
        quotaReason={quotaCheck.data?.reason}
        onGetPack={() => navigate('/subscription')}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-h1 mb-2">New teeth scan</h1>
      <p className="text-body text-muted-foreground mb-4">
        Snap a clear photo and teewai will research and score both your whiteness and dental
        health, then build a real plan.
      </p>

      {applianceType && applianceType !== 'none' && (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-olo/10 text-olo text-caption font-medium border border-olo/20">
          <Brush className="w-3.5 h-3.5 flex-shrink-0" />
          Analysis tailored for your {APPLIANCE_LABELS[applianceType] || 'appliance'}
        </div>
      )}

      {isFamilyMember &&
        (() => {
          const famPackRemaining = Math.max(0, Number(quotaCheck.data?.pack_remaining ?? familyMembership.pack_scans_remaining ?? 0));
          // personal_remaining is the member's OWN allocation only (15 + bonus -
          // used), without the shared family pack. This is what the member
          // actually sees as "my scans left" — not the inflated family total.
          const famPersonalRemaining = Math.max(
            0,
            quotaCheck.data?.personal_remaining ??
              ((familyMembership.scans_limit || 15) - (familyMembership.scans_used || 0))
          );
          return (
            <div className="mb-4 p-4 rounded-2xl border border-olo/30 bg-olo/5 flex items-center gap-3">
              <span className="icon-tool">
                <Users />
              </span>
              <div className="min-w-0">
                <p className="text-caption font-semibold text-olo">
                  Family plan, {familyMembership.member_name || 'Member'}
                </p>
                <p className="text-caption text-muted-foreground">
                  {familyMembership.plan === 'family_pro'
                    ? 'Unlimited scans · Family Unlimited'
                    : `${famPersonalRemaining} scan${famPersonalRemaining !== 1 ? 's' : ''} left this month${famPackRemaining > 0 ? ` + ${famPackRemaining} shared family pack` : ''}`}
                </p>
              </div>
            </div>
          );
        })()}

      <ScanModePicker
        scanMode={scanMode}
        setScanMode={setScanMode}
        isFamily={isFamily}
        subscription={subscription}
        memberIdx={memberIdx}
        setMemberIdx={setMemberIdx}
      />

      {scanMode === 'quick' && <ScanGuidance />}

      {scanMode === 'quick' ? (
        <>
          <ScanReference position={position} />
          <ScanUploader
            onFile={handleQuickFile}
            loading={loading}
            position={position}
            positionLabel={pos.label}
            lastScanImageUrl={lastScanImage}
            ritualStages={TEETH_SCAN_STAGES}
            ritualActiveStep={scanStage}
          />
        </>
      ) : (
        <FullScanStepper onComplete={runFullScan} loading={loading} activeStep={scanStage} />
      )}

      <div className="mt-4 flex items-center justify-center">
        <Link
          to="/braces-check"
          className="inline-flex items-center gap-2 text-caption text-muted-foreground hover:text-olo transition-colors"
        >
          <Brush className="w-4 h-4 text-olo" /> Do I need braces? Try Braces Check
        </Link>
      </div>

      {lightingWarn && (
        <div className="mt-4 p-4 rounded-xl bg-warning-soft border border-warning/30 flex items-start gap-3">
          <Sun className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-caption font-semibold text-warning">{lightingWarn.message}</p>
            <p className="text-caption text-muted-foreground mt-0.5">{lightingWarn.hint}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setLightingWarn(null)}
                className="inline-flex items-center gap-1.5 bg-warning text-white text-label font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                <Camera className="w-3.5 h-3.5" /> Retake
              </button>
              <button
                onClick={scanAnyway}
                className="inline-flex items-center gap-1.5 border border-border text-foreground text-label font-medium px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                Scan anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-2xl border border-danger/30 bg-danger-soft flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-caption font-heading font-600 text-danger mb-1">
              We couldn't complete this scan
            </p>
            <p className="text-caption text-muted-foreground">{error}</p>
            <div className="mt-3 flex gap-2">
              {errorIsNetwork ? (
                <Link
                  to="/my-scans"
                  className="inline-flex items-center gap-1.5 bg-olo text-white text-label font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Go to My Scans
                </Link>
              ) : (
                lastFileRef.current && (
                  <button
                    onClick={() => runScan(lastFileRef.current)}
                    className="inline-flex items-center gap-1.5 bg-olo text-white text-label font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retake scan
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <ScanRewards
        reward={reward}
        onClose={() => {
          const url = reward?.nextUrl;
          setReward(null);
          if (url) navigate(url);
        }}
      />

      {/* Medical disclaimer */}
      <div className="mt-4 p-3 rounded-xl bg-warning-soft border border-warning/20 text-warning text-caption text-center">
        teewai is a wellness companion, not a medical device. We strongly advise you to visit your
        dentist for professional care.
      </div>
    </div>
  );
}