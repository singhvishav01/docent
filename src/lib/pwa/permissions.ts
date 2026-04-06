/**
 * PWA permission utilities — mic + camera
 *
 * MUST be called from a user gesture (tap/click) on iOS.
 * iOS does not support navigator.permissions.query for camera/mic —
 * the only way to know is to attempt getUserMedia.
 */

export interface MediaPermissions {
  mic: boolean;
  camera: boolean;
}

/**
 * Request mic and camera together.
 * Stops the tracks immediately — we only want the permission grant,
 * not an active stream (that's requested again when actually needed).
 */
export async function requestMediaPermissions(): Promise<MediaPermissions> {
  const result: MediaPermissions = { mic: false, camera: false };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        facingMode: 'environment', // back camera
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    result.mic = stream.getAudioTracks().length > 0;
    result.camera = stream.getVideoTracks().length > 0;

    // Release immediately — re-request when actually needed
    stream.getTracks().forEach(t => t.stop());
  } catch (err: unknown) {
    const name = (err as { name?: string }).name;
    if (name === 'NotAllowedError') {
      console.warn('[Permissions] User denied camera/mic');
    } else if (name === 'NotFoundError') {
      console.warn('[Permissions] No camera or mic found');
    } else {
      console.error('[Permissions] Unexpected error:', err);
    }
  }

  return result;
}

/**
 * Request mic only (for voice tour, no camera needed).
 */
export async function requestMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * Check permission state via Permissions API.
 * NOTE: iOS Safari does NOT support this — returns 'prompt' as a safe default.
 */
export async function checkPermissionState(
  name: 'microphone' | 'camera'
): Promise<PermissionState> {
  try {
    if (!navigator.permissions) return 'prompt';
    const result = await navigator.permissions.query({ name: name as PermissionName });
    return result.state;
  } catch {
    return 'prompt'; // iOS — we'll find out when we request
  }
}

/** Returns true if running as an installed PWA in standalone mode. */
export function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}
