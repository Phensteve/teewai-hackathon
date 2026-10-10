import AnalysisRitual from '@/components/scan/AnalysisRitual';

// An opaque analysis request cannot truthfully report internal sub-steps.
const STAGES = [{ label: 'Analyzing your photo', desc: 'Waiting for the scan engine to finish processing' }];

export default function ScanRitualOverlay({ loading, sessionId }) {
  return <AnalysisRitual stages={STAGES} activeStep={0} loading={loading} sessionId={sessionId} variant="dark" overlay />;
}