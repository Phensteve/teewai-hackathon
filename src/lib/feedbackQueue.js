import { unrufld } from '@/api/unrufldClient';

// Offline feedback queue — used by the APK. When a feedback submission fails
// because the device is offline, the message is saved to localStorage and
// replayed automatically once a connection returns.

const QUEUE_KEY = 'teewai:feedback:queue';

export function getQueuedFeedback() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function queueFeedback(form) {
  const q = getQueuedFeedback();
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    form,
    queued_at: new Date().toISOString(),
  };
  q.push(item);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch { /* storage full / unavailable */ }
  return item;
}

export function removeQueuedFeedback(id) {
  const q = getQueuedFeedback().filter((i) => i.id !== id);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch { /* ignore */ }
}

// Drain the queue — send each queued feedback, removing the ones that succeed.
// Returns the number successfully sent. Failures stay queued for the next try.
export async function replayFeedbackQueue() {
  const q = getQueuedFeedback();
  if (!q.length) return 0;
  let sent = 0;
  for (const item of q) {
    try {
      const res = await unrufld.functions.invoke('submitFeedback', item.form);
      if (res?.data?.ok) {
        removeQueuedFeedback(item.id);
        sent += 1;
      }
    } catch {
      // Leave in queue — will retry on the next online event / app load.
    }
  }
  return sent;
}