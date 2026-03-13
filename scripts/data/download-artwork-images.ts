/**
 * download-artwork-images.ts
 *
 * Downloads real public-domain images for every artwork in the database using:
 *  1. Met Museum Open Access API  (collectionapi.metmuseum.org) — no auth, designed for bulk use
 *  2. Art Institute of Chicago API (api.artic.edu)               — no auth, IIIF images
 *  3. Cleveland Museum of Art API  (openaccess-api.clevelandart.org)
 *
 * Saves to ../docent-assets/images/artworks/{id}.jpg and updates the database.
 *
 * Run: npx tsx scripts/download-artwork-images.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

const prisma = new PrismaClient()
const OUT_DIR = path.resolve(process.cwd(), '..', 'docent-assets', 'images', 'artworks')
fs.mkdirSync(OUT_DIR, { recursive: true })

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, {
      headers: { 'User-Agent': 'Docent-Museum-App/1.0 (educational museum guide; contact@docent.app)' }
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(10000, () => { req.destroy(); resolve(null) })
  })
}

function downloadFile(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    const req = client.get(url, {
      headers: { 'User-Agent': 'Docent-Museum-App/1.0 (educational museum guide; contact@docent.app)' }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); fs.existsSync(dest) && fs.unlinkSync(dest)
        downloadFile(res.headers.location!, dest).then(resolve); return
      }
      if (!res.statusCode || res.statusCode >= 400) {
        file.close(); fs.existsSync(dest) && fs.unlinkSync(dest); resolve(false); return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve(true) })
    })
    req.on('error', () => { fs.existsSync(dest) && fs.unlinkSync(dest); resolve(false) })
    req.setTimeout(20000, () => { req.destroy(); fs.existsSync(dest) && fs.unlinkSync(dest); resolve(false) })
  })
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ─── Source 1: Met Museum Open Access API ────────────────────────────────────
async function findMetImage(title: string, artist: string): Promise<string | null> {
  const q = encodeURIComponent(title)
  const data = await fetchJSON(
    `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${q}&hasImages=true&isPublicDomain=true`
  )
  if (!data?.objectIDs?.length) return null

  for (const id of data.objectIDs.slice(0, 8)) {
    await sleep(150)
    const obj = await fetchJSON(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
    if (obj?.isPublicDomain && obj?.primaryImageSmall) {
      // Rough title match
      const titleMatch = obj.title?.toLowerCase().includes(title.toLowerCase().split(' ')[0])
      if (titleMatch) return obj.primaryImageSmall
    }
  }

  // Fallback: just return first public domain image found
  for (const id of data.objectIDs.slice(0, 3)) {
    const obj = await fetchJSON(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
    if (obj?.isPublicDomain && obj?.primaryImageSmall) return obj.primaryImageSmall
    await sleep(150)
  }
  return null
}

// ─── Source 2: Art Institute of Chicago ──────────────────────────────────────
async function findAICImage(title: string): Promise<string | null> {
  const q = encodeURIComponent(title)
  const data = await fetchJSON(
    `https://api.artic.edu/api/v1/artworks/search?q=${q}&fields=id,title,image_id,is_public_domain&limit=5`
  )
  const results: any[] = data?.data ?? []
  for (const r of results) {
    if (r.image_id && r.is_public_domain !== false) {
      return `https://www.artic.edu/iiif/2/${r.image_id}/full/843,/0/default.jpg`
    }
  }
  return null
}

// ─── Source 3: Cleveland Museum of Art ───────────────────────────────────────
async function findClevelandImage(title: string): Promise<string | null> {
  const q = encodeURIComponent(title)
  const data = await fetchJSON(
    `https://openaccess-api.clevelandart.org/api/artworks?q=${q}&has_image=1&limit=3`
  )
  const results: any[] = data?.data ?? []
  for (const r of results) {
    const img = r.images?.web?.url
    if (img) return img
  }
  return null
}

// ─── Try all sources in order ─────────────────────────────────────────────────
async function findImage(artwork: { id: string; title: string; artist: string; museumId: string }): Promise<string | null> {
  const { title, artist, museumId } = artwork

  // Met API first (especially for met-museum artworks)
  process.stdout.write(' [Met]')
  const metImg = await findMetImage(title, artist)
  if (metImg) return metImg

  await sleep(300)

  // Art Institute of Chicago
  process.stdout.write(' [AIC]')
  const aicImg = await findAICImage(title)
  if (aicImg) return aicImg

  await sleep(300)

  // Cleveland
  process.stdout.write(' [CLE]')
  const cleImg = await findClevelandImage(title)
  if (cleImg) return cleImg

  return null
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const artworks = await prisma.artwork.findMany({
    select: { id: true, title: true, artist: true, museumId: true },
    orderBy: { museumId: 'asc' }
  })

  console.log(`\n📦 Processing ${artworks.length} artworks using open museum APIs...\n`)

  let downloaded = 0, skipped = 0, failed = 0

  for (const artwork of artworks) {
    const localFile = path.join(OUT_DIR, `${artwork.id}.jpg`)
    const localUrl = `/images/artworks/${artwork.id}.jpg`

    // Already have a valid local file
    if (fs.existsSync(localFile) && fs.statSync(localFile).size > 10000) {
      await prisma.artwork.update({
        where: { museumId_id: { museumId: artwork.museumId, id: artwork.id } },
        data: { imageUrl: localUrl }
      })
      process.stdout.write(`  ⏭  ${artwork.id}\n`)
      skipped++
      continue
    }

    process.stdout.write(`  🔍 ${artwork.id} (${artwork.title})...`)

    const imageUrl = await findImage(artwork)

    if (!imageUrl) {
      process.stdout.write(` ❌ not found in any API\n`)
      failed++
      continue
    }

    process.stdout.write(` ⬇️ downloading...`)
    const ok = await downloadFile(imageUrl, localFile)

    if (ok && fs.existsSync(localFile) && fs.statSync(localFile).size > 10000) {
      await prisma.artwork.update({
        where: { museumId_id: { museumId: artwork.museumId, id: artwork.id } },
        data: { imageUrl: localUrl }
      })
      const kb = Math.round(fs.statSync(localFile).size / 1024)
      process.stdout.write(` ✅ ${kb}KB\n`)
      downloaded++
    } else {
      fs.existsSync(localFile) && fs.unlinkSync(localFile)
      process.stdout.write(` ❌ download failed\n`)
      failed++
    }

    await sleep(500)
  }

  console.log(`\n🎉 Done: ${downloaded} downloaded, ${skipped} already existed, ${failed} failed`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
