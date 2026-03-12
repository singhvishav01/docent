// src/lib/image-url.ts
//
// Resolves artwork image URLs.
// - Relative paths like "/images/artworks/mona_lisa.jpg" get the configurable
//   base URL prepended so they point at the external asset server (or CDN).
// - Absolute URLs (https://...) pass through untouched.
// - null / undefined → undefined.
//
// The base URL comes from NEXT_PUBLIC_IMAGE_BASE_URL in .env.
// Swapping to a CDN later is a one-line env change — no code changes needed.

const IMAGE_BASE_URL: string =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, '') ?? '';

/**
 * Resolve an image URL stored in the database into a fully-qualified URL
 * that the browser (or next/image) can fetch.
 */
export function resolveImageUrl(rawUrl: string | null | undefined): string | undefined {
  if (!rawUrl) return undefined;

  // Already absolute — nothing to do
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }

  // Relative path — prepend the asset server base URL
  if (IMAGE_BASE_URL) {
    const path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    return `${IMAGE_BASE_URL}${path}`;
  }

  // No base URL configured — return the relative path as-is
  return rawUrl;
}
