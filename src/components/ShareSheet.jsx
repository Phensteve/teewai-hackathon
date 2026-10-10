import { useState } from 'react';
import { Instagram, MessageCircle, Send, Share2, Download, Copy, Check, X } from 'lucide-react';

// Custom share sheet — a bottom sheet with app icons that properly attaches
// the image via the Web Share API (navigator.share with files). On mobile,
// this opens the native share sheet with the image pre-attached, so picking
// Instagram (or any app) actually includes the photo. On desktop (no file
// share), it downloads the image and opens the app for manual upload.
//
// The sheet shows a grid of app icons for visual appeal. Clicking any app
// triggers navigator.share({ files }) which lets the OS handle the actual
// app selection and file attachment — the only reliable way to attach an
// image to another app from a web page.

const APPS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E1306C', url: 'https://www.instagram.com' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#25D366', url: 'https://wa.me' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: '#0088CC', url: 'https://t.me/share/url?url=' },
];

export default function ShareSheet({ file, fileName, caption, onClose }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const shareViaNative = async () => {
    if (!file) return;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: 'My teewai smile', text: caption || '', files: [file] });
      } catch {}
    } else {
      downloadFile();
    }
    onClose();
  };

  const shareToApp = async (app) => {
    if (!file) return;
    setBusy(true);
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: 'My teewai smile', text: caption || '', files: [file] });
      } catch {}
      setBusy(false);
      onClose();
    } else {
      downloadFile();
      setTimeout(() => {
        try { window.open(app.url, '_blank'); } catch {}
        setBusy(false);
        onClose();
      }, 400);
    }
  };

  const downloadFile = () => {
    if (!file) return;
    const link = document.createElement('a');
    link.download = fileName || 'teewai-smile.png';
    link.href = URL.createObjectURL(file);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-backdrop-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] animate-menu-drop-in shadow-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-700 text-lg">Share your smile</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* App icons — each triggers the native share sheet with the image attached */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {APPS.map((app) => (
            <button
              key={app.id}
              onClick={() => shareToApp(app)}
              disabled={busy}
              className="flex flex-col items-center gap-2 disabled:opacity-50"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: app.color }}
              >
                <app.icon className="w-7 h-7 text-white" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">{app.name}</span>
            </button>
          ))}
        </div>

        {/* Utility actions */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <button
            onClick={shareViaNative}
            disabled={busy}
            className="flex flex-col items-center gap-2 disabled:opacity-50"
          >
            <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
              <Share2 className="w-7 h-7 text-olo" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">More apps</span>
          </button>
          <button
            onClick={() => { downloadFile(); onClose(); }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
              <Download className="w-7 h-7 text-foreground" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Save</span>
          </button>
          <button
            onClick={copy}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
              {copied ? <Check className="w-7 h-7 text-olo" /> : <Copy className="w-7 h-7 text-foreground" />}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-5 leading-relaxed">
          {navigator.canShare && navigator.canShare({ files: [file] })
            ? 'Pick an app — your image will be attached automatically.'
            : 'Your image will be downloaded. Open the app and upload it manually.'}
        </p>
      </div>
    </div>
  );
}