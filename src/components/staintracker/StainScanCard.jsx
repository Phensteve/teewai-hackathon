// AI food-scan card — camera + upload buttons, flash confirmation, error.
import { Camera, Upload, Check } from 'lucide-react';
import Spinner from '@/components/Spinner';
import FoodScanModal from '@/components/FoodScanModal';
import AnalysisRitual from '@/components/scan/AnalysisRitual';
import { FOOD_SCAN_STAGES } from '@/lib/scanProgress';

export default function StainScanCard({
  scanning,
  activeStep,
  modalOpen,
  setModalOpen,
  uploadRef,
  onUpload,
  flash,
  error,
  scanResult,
  onDismissResult,
  onCorrectName,
  onApplyStain,
}) {
  return (
    <div className="mt-4 p-5 rounded-3xl border border-olo/30 bg-olo/5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
          <Camera className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-heading font-600 text-sm">Scan a food or drink</p>
          <p className="text-xs text-muted-foreground">
            Snap it — teewai IDs the food, stain impact & calories. Uses 1 scan credit.
          </p>
        </div>
      </div>
      <div className="flex gap-2.5">
        <button
          onClick={() => setModalOpen(true)}
          disabled={scanning}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white text-sm font-semibold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-60"
        >
          {scanning ? <Spinner size={16} /> : <Camera className="w-4 h-4" />} Camera
        </button>
        <button
          onClick={() => uploadRef.current?.click()}
          disabled={scanning}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground text-sm font-semibold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-60"
        >
          <Upload className="w-4 h-4" /> Upload
        </button>
      </div>
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onUpload(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {scanning && !modalOpen && <div className="mt-5"><AnalysisRitual stages={FOOD_SCAN_STAGES} activeStep={activeStep} loading={scanning} variant="light" /></div>}
      {flash && !scanning && (
        <div className="mt-3 flex items-start gap-2 text-xs bg-olo/10 border border-olo/20 rounded-xl px-3 py-2">
          <Check className="w-3.5 h-3.5 flex-shrink-0 text-olo mt-0.5" />
          <span className="text-olo">
            {flash.items.length > 1
              ? `Identified ${flash.items.length} items: ${flash.items.map((i) => i.item.name).join(', ')}`
              : `${flash.items[0].matched ? 'Identified' : 'Scanned'}: ${flash.items[0].item.name} · ${flash.items[0].item.stain_level} stain${flash.items[0].item.calories ? ` · ${flash.items[0].item.calories} kcal` : ''}`}
          </span>
        </div>
      )}
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      <FoodScanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCapture={onUpload}
        scanning={scanning}
        activeStep={activeStep}
        result={scanResult}
        onDismissResult={onDismissResult}
        onCorrectName={onCorrectName}
        onApplyStain={onApplyStain}
      />
    </div>
  );
}