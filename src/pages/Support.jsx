import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Send, CheckCircle2, AlertCircle, MessageSquare, Lightbulb, HelpCircle, Loader2, WifiOff } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import BackButton from '@/components/BackButton';
import { isNativeApp } from '@/lib/isNativeApp';
import { queueFeedback, replayFeedbackQueue } from '@/lib/feedbackQueue';

const FEEDBACK_TYPES = [
  { value: 'Complaint', icon: AlertCircle, color: '#f87171' },
  { value: 'Suggestion', icon: Lightbulb, color: '#fbbf24' },
  { value: 'Question', icon: HelpCircle, color: '#0d9f8e' },
  { value: 'Other', icon: MessageSquare, color: '#94a3b8' },
];

export default function Support() {
  const [form, setForm] = useState({ name: '', email: '', type: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const isNative = isNativeApp();

  useEffect(() => {
    // APK only: drain any feedback queued while offline as soon as we're online.
    if (isNative) {
      const drain = () => { if (navigator.onLine) replayFeedbackQueue(); };
      drain();
      window.addEventListener('online', drain);
      return () => window.removeEventListener('online', drain);
    }
  }, [isNative]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.type || !form.message) {
      setStatus('error');
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const response = await unrufld.functions.invoke('submitFeedback', form);
      if (response.data?.ok) {
        setStatus('success');
        setForm({ name: '', email: '', type: '', subject: '', message: '' });
      } else {
        setStatus('error');
        setErrorMsg(response.data?.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      // APK offline: save the message locally and confirm to the user — it'll
      // send automatically once the device reconnects.
      if (isNative && !navigator.onLine) {
        queueFeedback(form);
        setStatus('queued');
        setForm({ name: '', email: '', type: '', subject: '', message: '' });
        return;
      }
      setStatus('error');
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to submit. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground safe-area-inset-top">
      {/* Top bar */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <BackButton fallback="/" className="mb-8" />
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-[11px] uppercase tracking-[0.2em] text-olo font-semibold">We're listening</span>
          <h1 className="font-heading font-300 text-3xl sm:text-5xl tracking-tight mt-3">
            Customer <span className="font-600 text-olo">Service</span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto font-light">
            Got a complaint, a suggestion, or just a question? We read every message — and we act on them.
            Looking for quick answers? Try the <Link to="/help" className="text-olo hover:underline">Help Center</Link> first.
          </p>
        </div>

        {/* Contact info cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto">
          <a href="mailto:help-desk@teewai.app" className="group p-6 rounded-2xl border border-border bg-card hover:border-olo/40 transition-colors">
            <div className="w-10 h-10 rounded-xl border border-olo/30 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-olo" />
            </div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email us</p>
            <p className="text-sm font-medium group-hover:text-olo transition-colors">help-desk@teewai.app</p>
          </a>
          <a href="tel:+2349067100255" className="group p-6 rounded-2xl border border-border bg-card hover:border-olo/40 transition-colors">
            <div className="w-10 h-10 rounded-xl border border-olo/30 flex items-center justify-center mb-4">
              <Phone className="w-5 h-5 text-olo" />
            </div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Call us</p>
            <p className="text-sm font-medium group-hover:text-olo transition-colors">+234 906 710 0255</p>
          </a>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          {status === 'success' || status === 'queued' ? (
            <div className="p-8 rounded-2xl border border-olo/30 bg-olo/5 text-center">
              {status === 'queued' ? (
                <WifiOff className="w-12 h-12 text-olo mx-auto mb-4" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-olo mx-auto mb-4" />
              )}
              <h3 className="font-heading font-500 text-xl mb-2">
                {status === 'queued' ? 'Saved offline' : 'Message sent'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {status === 'queued'
                  ? "You're offline, so we've saved your message. It'll send automatically the next time you're connected."
                  : 'Thank you for reaching out. Our team will get back to you at the email address you provided.'}
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="text-sm text-olo hover:opacity-80 transition-opacity font-medium"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Feedback type selector */}
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 block">
                  What's this about? <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FEEDBACK_TYPES.map(({ value, icon: Icon, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleChange('type', value)}
                      className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                        form.type === value
                          ? 'border-olo bg-olo/10'
                          : 'border-border bg-card hover:border-olo/30'
                      }`}
                    >
                      <Icon className="w-5 h-5" style={{ color: form.type === value ? color : '#94a3b8' }} />
                      <span className={`text-xs font-medium ${form.type === value ? 'text-foreground' : 'text-muted-foreground'}`}>{value}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name + Email */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 block">
                    Your name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-olo transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 block">
                    Your email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-olo transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 block">
                  Subject
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  placeholder="Brief summary of your message"
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-olo transition-colors"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 block">
                  Your message <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-olo transition-colors resize-none"
                  required
                />
              </div>

              {/* Error message */}
              {status === 'error' && (
                <div className="flex items-center gap-2 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{errorMsg}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3.5 rounded-xl bg-olo text-white text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send message
                  </>
                )}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                Your message goes directly to our help desk at{' '}
                <a href="mailto:help-desk@teewai.app" className="text-olo hover:underline">help-desk@teewai.app</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}