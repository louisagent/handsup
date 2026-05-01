// ============================================================
// Handsup — Upload Queue Service
// Queue uploads when offline, auto-retry when connection improves
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnline } from './network';
import { uploadClip } from './clips';

const QUEUE_KEY = 'handsup_upload_queue';
const RETRY_INTERVAL_MS = 10_000; // Check every 10 seconds

export interface QueuedUpload {
  id: string;
  // Store local file URIs for offline uploads
  videoUri: string;
  thumbnailUri: string | null;
  // Metadata
  artist: string;
  festival: string;
  location: string;
  date: string;
  description: string;
  trackName?: string;
  trackArtist?: string;
  trimStartMs?: number;
  trimEndMs?: number;
  eventId?: string;
  // Status tracking
  status: 'pending' | 'uploading' | 'failed' | 'completed';
  errorMessage?: string;
  createdAt: number;
  retryCount: number;
  clipId?: string; // Set after successful upload
}

let retryInterval: NodeJS.Timeout | null = null;
let listeners: Array<(queue: QueuedUpload[]) => void> = [];

// ── Queue Management ───────────────────────────────────────

export async function getQueue(): Promise<QueuedUpload[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    if (!data) return [];
    return JSON.parse(data) as QueuedUpload[];
  } catch {
    return [];
  }
}

export async function saveQueue(queue: QueuedUpload[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    notifyListeners(queue);
  } catch (error) {
    console.error('Failed to save upload queue:', error);
  }
}

export async function addToQueue(upload: Omit<QueuedUpload, 'id' | 'status' | 'createdAt' | 'retryCount'>): Promise<string> {
  const queue = await getQueue();
  const newUpload: QueuedUpload = {
    ...upload,
    id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'pending',
    createdAt: Date.now(),
    retryCount: 0,
  };
  queue.push(newUpload);
  await saveQueue(queue);
  
  // Start retry loop if not already running
  startRetryLoop();
  
  return newUpload.id;
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(u => u.id !== id);
  await saveQueue(filtered);
}

export async function updateQueueItem(id: string, updates: Partial<QueuedUpload>): Promise<void> {
  const queue = await getQueue();
  const index = queue.findIndex(u => u.id === id);
  if (index === -1) return;
  queue[index] = { ...queue[index], ...updates };
  await saveQueue(queue);
}

export async function clearCompletedUploads(): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(u => u.status !== 'completed');
  await saveQueue(filtered);
}

export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.filter(u => u.status === 'pending' || u.status === 'uploading').length;
}

// ── Upload Processing ──────────────────────────────────────

export async function processQueue(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  const queue = await getQueue();
  const pending = queue.filter(u => u.status === 'pending' || u.status === 'failed');

  for (const upload of pending) {
    await processUpload(upload);
  }
}

async function processUpload(upload: QueuedUpload): Promise<void> {
  try {
    await updateQueueItem(upload.id, { status: 'uploading' });

    // Note: The actual upload process (video file upload to storage + metadata insert)
    // is complex and happens in UploadScreen. This queue service is designed to store
    // pending uploads that can be retried later.
    // 
    // For a full implementation, you would need to:
    // 1. Upload video file to Supabase Storage
    // 2. Upload thumbnail to Storage
    // 3. Call uploadClip with the storage URLs
    // 
    // For now, this is a placeholder that shows the structure.
    // The actual upload logic should be extracted from UploadScreen into a reusable function.
    
    throw new Error('Upload queue processing requires full upload implementation');
    
    // Example structure for future implementation:
    // const { videoUrl, thumbnailUrl } = await uploadFilesToStorage(upload.videoUri, upload.thumbnailUri);
    // const clip = await uploadClip({
    //   artist: upload.artist,
    //   festival_name: upload.festival,
    //   location: upload.location,
    //   clip_date: upload.date,
    //   description: upload.description,
    //   video_url: videoUrl,
    //   thumbnail_url: thumbnailUrl,
    //   event_id: upload.eventId,
    // });
    // await updateQueueItem(upload.id, { status: 'completed', clipId: clip.id });
  } catch (error) {
    const retryCount = upload.retryCount + 1;
    const maxRetries = 5;
    
    if (retryCount >= maxRetries) {
      await updateQueueItem(upload.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Upload failed',
        retryCount,
      });
    } else {
      await updateQueueItem(upload.id, {
        status: 'pending',
        retryCount,
      });
    }
  }
}

// ── Auto-Retry Loop ────────────────────────────────────────

export function startRetryLoop(): void {
  if (retryInterval) return; // Already running
  
  retryInterval = setInterval(async () => {
    await processQueue();
    
    // Stop loop if queue is empty
    const pending = await getPendingCount();
    if (pending === 0 && retryInterval) {
      clearInterval(retryInterval);
      retryInterval = null;
    }
  }, RETRY_INTERVAL_MS);
}

export function stopRetryLoop(): void {
  if (retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
  }
}

// ── Listeners ──────────────────────────────────────────────

export function subscribeToQueue(callback: (queue: QueuedUpload[]) => void): () => void {
  listeners.push(callback);
  
  // Immediately call with current queue
  getQueue().then(callback);
  
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

function notifyListeners(queue: QueuedUpload[]): void {
  listeners.forEach(callback => callback(queue));
}
