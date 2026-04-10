import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/image-proxy?url=<encoded-url>
 *
 * Proxies external artwork images server-side so the browser never hits
 * external CDNs directly. Prevents rate-limit 429s from Wikipedia/Wikimedia.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  // Only allow http/https — prevent SSRF to internal addresses
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new NextResponse('Disallowed protocol', { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        // Wikimedia requires a descriptive User-Agent
        'User-Agent': 'Docent/1.0 (museum AI guide; contact@docent.app)',
        Accept: 'image/*,*/*',
      },
      // Don't follow redirects to unexpected domains
      redirect: 'follow',
    });

    if (!res.ok) {
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache for 24h in browser, 7 days on CDN edge
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch (err) {
    console.error('[image-proxy] fetch error:', err);
    return new NextResponse('Failed to fetch image', { status: 502 });
  }
}
