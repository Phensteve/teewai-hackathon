import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, AlertTriangle, RotateCcw, Upload } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { scans as insforgeScans, photos as insforgePhotos, compressImage } from '@/lib/insforgeDb';

const STAGES = ['Uploading', 'Analyzing', 'Scoring', 'Building plan'];

export default function Scan() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  // Reset hidden input value so the same file can be re-picked.
  useEffect(() => () => setPreview(null), []);

  const pickFile = () => inputRef.current?.click();

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileRef.current = file;
    setPreview(URL.createObjectURL(file));
    setError('');
    runScan(file);
  };

  const runScan = async (file) => {
    setLoading(true);
    setError('');
    setStage(0);
    try {
      // 1. Compress + upload photo
      let blob = file;
      let contentType = 'image/jpeg';
      try {
        const c = await compressImage(file);
        blob = c.blob;
        contentType = c.contentType;
      } catch { /* use original */ }

      const up = await insforgePhotos.uploadBlob(blob, contentType);
      const imageUrl = up?.url;
      if (!imageUrl) throw new Error('Photo upload failed');

      // The analyzeScan backend fetches from private InsForge storage and
      // re-uploads to a short-lived signed URL for the vision call, so the
      // photo never needs to be public.
      const analysisUrl = imageUrl;

      setStage(1);

      // 2. Create an "analyzing" scan row
      const live = await insforgeScans.create({
        image_url: imageUrl,
        capture_position: 'front',
        status: 'analyzing',
      });
      const scanId = live?.id || null;

      setStage(2);

      // 3. Run the AI analysis (backend persists the result to the scan row)
      const { data: result } = await unrufld.functions.invoke('analyzeScan', {
        file_url: analysisUrl,
        image_url: imageUrl,
        position: 'front',
        scan_id: scanId,
        scan_mode: 'teeth',
      });

      if (result?.needs_another_photo) {
        throw new Error(result.ai_feedback || 'This photo is not readable. Retake it in even light.');
      }

      setStage(3);

      // The backend persisted the completed scan; navigate to results.
      const finalId = result?._scan?.id || scanId;
      if (finalId) {
        navigate(`/results/${finalId}`);
      } else {
        throw new Error('Scan completed but could not be saved.');
      }
    } catch (e) {
      setError(e?.message || "We couldn't analyze this photo. Try again in good light.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-heading text-2xl font-700 tracking-tight">New scan</h1>
      <p className="mt-1 text-body text-muted-foreground">
        Snap a clear, well-lit close-up of your front teeth. teewai's AI will score your whiteness and dental health.
      </p>

      {/* Upload zone */}
      <div className="mt-6">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
        />

        {loading ? (
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
            {preview && (
              <img src={preview} alt="preview" className="h-64 w-full object-cover opacity-40" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-card via-card/80 to-transparent">
              <Loader2 className="h-8 w-8 animate-spin text-olo" />
              <p className="font-heading text-base font-700">{STAGES[stage]}…</p>
              <div className="mt-1 flex gap-1.5">
                {STAGES.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-8 rounded-full transition-colors ${i <= stage ? 'bg-olo' : 'bg-muted'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={pickFile}
            className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card p-10 text-center transition-colors hover:border-olo/40 hover:bg-olo/5"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-olo/10 text-olo">
              <Camera className="h-7 w-7" />
            </span>
            <p className="font-heading text-base font-600">Take or upload a photo</p>
            <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <Upload className="h-3.5 w-3.5" />
              Front teeth, good lighting, no flash
            </p>
          </button>
        )}
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="flex-1">
            <p className="font-heading text-sm font-600 text-danger">Scan failed</p>
            <p className="mt-0.5 text-caption text-muted-foreground">{error}</p>
            {fileRef.current && (
              <button
                onClick={() => fileRef.current && runScan(fileRef.current)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-olo px-3 py-1.5 text-label font-semibold text-white transition-opacity hover:opacity-90"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="font-heading text-sm font-600">For the best reading</p>
        <ul className="space-y-1.5 text-caption text-muted-foreground">
          <li>• Face a window or bright light, no direct flash</li>
          <li>• Smile naturally to show your front teeth</li>
          <li>• Hold steady, about an arm's length away</li>
        </ul>
      </div>

      <p className="mt-4 text-center text-label text-muted-foreground">
        teewai is a wellness companion, not a medical device.
      </p>
    </div>
  );
}