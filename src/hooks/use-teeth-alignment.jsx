import { useEffect, useRef, useState } from 'react';
import { measureImageQuality, frameMovement } from '@/lib/imageQuality';

export default function useTeethAlignment(videoRef, active, mirrored = false, position = 'front') {
  const idle = { aligned: false, level: 'idle', message: "Let's get your smile in the frame", sampledAt: 0 };
  const [state, setState] = useState(idle);
  const previous = useRef(null);
  useEffect(() => {
    previous.current = null;
    if (!active) { setState(idle); return; }
    let lastVideoTime = -1;
    const id = setInterval(() => {
      const video = videoRef.current;
      if (!video?.videoWidth || video.readyState < 2) return;
      // A frozen feed cannot accumulate 'stable' evidence.
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      try {
        const q = measureImageQuality(video, { mouth: true });
        const movement = frameMovement(q.luminance, previous.current);
        previous.current = q.luminance;
        let message = q.message;
        if (!message && q.toothRatio < .06) message = 'Show your teeth clearly inside the guide';
        // Color alone cannot identify teeth: require some surrounding oral tissue
        // for automation, while leaving manual capture available.
        else if (!message && q.tissueRatio < .015) message = 'Include the edges of your lips or gums in the frame';
        else if (!message && q.toothRatio > .85) message = 'Move back slightly to show the whole area';
        else if (!message && position === 'front' && (Math.abs(q.cx - .5) > .20 || Math.abs(q.cy - .5) > .25)) {
          const left = mirrored ? q.cx > .5 : q.cx < .5;
          message = Math.abs(q.cx - .5) > .20 ? (left ? 'Just a tiny bit to the left' : 'Just a tiny bit to the right') : (q.cy < .5 ? 'Just a tiny bit up' : 'Just a tiny bit down');
        } else if (!message && (q.focus < 24 || q.edgeRatio < .035)) message = 'Hold still and wait for focus';
        else if (!message && movement > 7) message = 'Hold steady for the photo';
        setState({ aligned: !message, level: message ? 'hint' : 'good', message: message || 'Hold steady — ready to capture', sampledAt: Date.now(), brightness: Math.round(q.mean) });
      } catch {
        setState({ ...idle, level: 'warn', message: 'Camera check unavailable — use manual capture or upload' });
      }
    }, 300);
    return () => clearInterval(id);
  }, [active, videoRef, mirrored, position]);
  return state;
}