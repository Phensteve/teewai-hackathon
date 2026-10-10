import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchBriefData, buildDailyBrief, getDailyBriefHistory, getCompletedWeeklyBriefs, getCompletedMonthlyBriefs, getCompletedYearlyBriefs, getCurrentDailyTitle, markBriefRead } from '@/lib/briefData';
import { Calendar, ArrowRight } from 'lucide-react';
import PageSkeleton from '@/components/loading/PageSkeleton';
import DailyBrief from '@/components/briefs/DailyBrief';
import WeeklyBrief from '@/components/briefs/WeeklyBrief';
import MonthlyBrief from '@/components/briefs/MonthlyBrief';
import YearlyBrief from '@/components/briefs/YearlyBrief';
import BriefRollupSection from '@/components/briefs/BriefRollupSection';

const dayStr = (d) => d.toISOString().slice(0, 10);

function formatDailyDate(d) {
  return new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function Briefs() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBriefData()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
    // Opening the Briefs page counts as reading the current briefs
    markBriefRead('daily');
    markBriefRead('weekly');
    markBriefRead('monthly');
    markBriefRead('yearly');
  }, []);

  if (loading) return <PageSkeleton title="Your briefs" className="max-w-2xl" />;

  const daily = buildDailyBrief(data);
  const todayKey = dayStr(new Date());
  const pastDailies = getDailyBriefHistory(data).filter(item => item.dayKey !== todayKey);
  const weeklyBriefs = getCompletedWeeklyBriefs(data).filter(item => item.brief.hasData);
  const monthlyBriefs = getCompletedMonthlyBriefs(data).filter(item => item.brief.hasData);
  const yearlyBriefs = getCompletedYearlyBriefs(data).filter(item => item.brief.hasData);

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5">
        <ArrowRight className="w-4 h-4 rotate-180" /> Back to dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-olo" />
        </div>
        <div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">Your briefs</h1>
          <p className="text-sm text-muted-foreground">Your dental health, summarized.</p>
        </div>
      </div>

      {/* Today's daily brief */}
      <div className="p-5 rounded-3xl border border-border bg-card mb-4">
        <h2 className="font-heading font-600 text-sm mb-3">{getCurrentDailyTitle()}</h2>
        <DailyBrief data={daily} />
      </div>

      {/* Completed weekly briefs */}
      {weeklyBriefs.length > 0 && (
        <div className="space-y-3 mb-6">
          {weeklyBriefs.map(item => (
            <BriefRollupSection key={item.key} title={item.title} data={item.brief}>
              <WeeklyBrief data={item.brief} />
            </BriefRollupSection>
          ))}
        </div>
      )}

      {/* Completed monthly briefs */}
      {monthlyBriefs.length > 0 && (
        <div className="space-y-3 mb-6">
          {monthlyBriefs.map(item => (
            <BriefRollupSection key={item.key} title={item.title} data={item.brief}>
              <MonthlyBrief data={item.brief} />
            </BriefRollupSection>
          ))}
        </div>
      )}

      {/* Completed yearly briefs */}
      {yearlyBriefs.length > 0 && (
        <div className="space-y-3 mb-6">
          {yearlyBriefs.map(item => (
            <BriefRollupSection key={item.key} title={item.title} data={item.brief}>
              <YearlyBrief data={item.brief} />
            </BriefRollupSection>
          ))}
        </div>
      )}

      {/* Past daily briefs */}
      {pastDailies.length > 0 && (
        <div>
          <h2 className="font-heading font-600 text-sm mb-3">Past daily briefs</h2>
          <div className="space-y-3">
            {pastDailies.map(item => (
              <BriefRollupSection key={item.dayKey} title={formatDailyDate(item.date)} data={item.brief}>
                <DailyBrief data={item.brief} />
              </BriefRollupSection>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}