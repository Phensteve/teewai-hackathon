import React from 'react';
import { RotateCcw, ArrowRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Facebook Messenger pattern: wrap independent sections so a render error in
// one component never white-screens the entire app. Must be a class component
// — React requires getDerivedStateFromError / componentDidCatch lifecycle.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for debugging — could be wired to a reporting service.
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Context-aware recovery: pick the primary next step from where the
      // crash happened, so the user always has a specific way forward
      // instead of a generic "try again".
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      let heading = 'This screen hit a snag';
      let body = "The page couldn't finish loading, but your scans and data are safe. Head to your dashboard and open it again from there.";
      let primaryLabel = 'Go to dashboard';
      let primaryTo = '/dashboard';
      if (path.startsWith('/results/')) {
        heading = "This result wouldn't load";
        body = "We couldn't open this scan report, but the scan itself is safe. Open My Scans and tap the result again — it usually loads on a second try.";
        primaryLabel = 'Go to My Scans';
        primaryTo = '/my-scans';
      } else if (path.startsWith('/scan') || path.startsWith('/braces-check')) {
        heading = 'The scan page stumbled';
        body = "Something interrupted the scan setup, but no scan credit was used. Go back to your dashboard and start a fresh scan.";
        primaryLabel = 'Go to dashboard';
        primaryTo = '/dashboard';
      } else if (path.startsWith('/dashboard')) {
        heading = 'Your dashboard hit a snag';
        body = "We couldn't pull up your latest scans and stats, but your history is safe. Reload the page — it usually clears up on the second try.";
        primaryLabel = 'Reload dashboard';
        primaryTo = '/dashboard';
      }

      // Compact fallback for nested/section-level boundaries — names the
      // section that failed and offers its own retry, so a render error in
      // one card never reads as a dead end.
      if (this.props.compact) {
        return (
          <div className="p-6 rounded-2xl border border-border bg-card text-center">
            <p className="text-sm text-muted-foreground mb-3">This section couldn't load — the rest of the page is fine.</p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 text-sm font-medium text-olo hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try this section again
            </button>
          </div>
        );
      }

      // Full-page fallback for top-level boundaries.
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-danger-soft flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7 text-danger" />
            </div>
            <h2 className="font-heading font-700 text-xl mb-2">{heading}</h2>
            <p className="text-sm text-muted-foreground mb-6">{body}</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to={primaryTo}
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:scale-105 transition-transform olo-glow"
              >
                <ArrowRight className="w-4 h-4" /> {primaryLabel}
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 border border-border font-medium px-5 py-2.5 rounded-xl text-sm hover:bg-accent transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}