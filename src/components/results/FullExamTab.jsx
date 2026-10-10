import ExamHeader from './fullexam/ExamHeader';
import PriorityPlan from './fullexam/PriorityPlan';
import SextantChart from './fullexam/SextantChart';
import HiddenFindings from './fullexam/HiddenFindings';
import BalanceCard from './fullexam/BalanceCard';
import BiteCard from './fullexam/BiteCard';
import AngleBreakdown from './fullexam/AngleBreakdown';

// Comprehensive exam only a 5-angle scan produces.
export default function FullExamTab({ scan }) {
  const r = scan.full_report;
  if (!r) {
    return (
      <div className="p-5 rounded-2xl border border-border bg-card text-caption text-muted-foreground">
        This full scan was taken before the full-mouth exam existed. Your next full scan will include the mouth map, hidden findings, bite check and priorities.
      </div>
    );
  }
  return (
    <>
      <ExamHeader report={r} />
      <PriorityPlan priorities={r.priorities} />
      <SextantChart sextants={r.sextants} />
      <HiddenFindings items={r.hidden_findings || []} />
      <BalanceCard symmetry={r.symmetry} />
      <BiteCard bite={r.bite} consensus={r.consensus} />
      <AngleBreakdown angles={r.angles} imageUrls={scan.image_urls} />
    </>
  );
}