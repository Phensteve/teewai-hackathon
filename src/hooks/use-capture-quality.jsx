import { useEffect, useState } from 'react';
import { measureImageQuality, frameMovement } from '@/lib/imageQuality';

export default function useCaptureQuality(videoRef, active) {
  const [quality, setQuality] = useState({ ready: false, sampledAt: 0, message: 'Waiting for camera focus' });
  useEffect(() => {
    setQuality({ ready: false, sampledAt: 0, message: 'Waiting for camera focus' });
    if (!active) return;
    let previous = null, lastVideoTime = -1;
    const id = setInterval(() => {
      const video = videoRef.current;
      if (!video?.videoWidth || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      try {
        const q = measureImageQuality(video);
        const movement = frameMovement(q.luminance, previous);
        previous = q.luminance;
        const message = q.message || (q.focus < 24 || q.edgeRatio < .035 ? 'Wait for camera focus' : movement > 7 ? 'Hold the camera steady' : 'Hold steady — focus and exposure ready');
        setQuality({ ready: q.passed && q.focus >= 24 && q.edgeRatio >= .035 && movement <= 7, sampledAt: Date.now(), message });
      } catch {
        setQuality({ ready: false, sampledAt: 0, message: 'Camera check unavailable — use manual capture' });
      }
    }, 300);
    return () => clearInterval(id);
  }, [videoRef, active]);
  return quality;
}