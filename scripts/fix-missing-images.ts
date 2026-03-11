/**
 * Fix the 4 artworks that couldn't be found via open APIs:
 *  - cycladic_figure       → use a real Met Cycladic figure
 *  - akan_goldweight       → use a real Met Akan goldweight
 *  - moma_sample_2         → Broadway Boogie-Woogie → use AIC Seurat as substitute
 *  - test-artwork-4        → Digital Landscape (fictional) → use Starry Night substitute
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

const prisma = new PrismaClient()
const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'artworks')

// Real Met Museum object IDs for the missing ones (verified public domain)
const DIRECT_MET_IDS: Record<string, number> = {
  cycladic_figure: 247993,    // Figurine (Cycladic) — Met collection
  akan_goldweight: 317565,    // Akan goldweight — Met collection
}

// Artworks to borrow images from (already downloaded)
const BORROW_FROM: Record<string, string> = {
  'moma_sample_2':  'moma_sample_4',  // Broadway Boogie-Woogie → use Seurat
  'test-artwork-4': 'the_starry_night', // Digital Landscape → use Starry Night
}

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Docent-Museum-App/1.0' } }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } })
    }).on('error', () => resolve(null))
  })
}

function downloadFile(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    const req = client.get(url, { headers: { 'User-Agent': 'Docent-Museum-App/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 400) { file.close(); fs.existsSync(dest) && fs.unlinkSync(dest); resolve(false); return }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve(true) })
    })
    req.on('error', () => { fs.existsSync(dest) && fs.unlinkSync(dest); resolve(false) })
    req.setTimeout(15000, () => { req.destroy(); resolve(false) })
  })
}

async function main() {
  // Fix Met API lookups by direct object ID
  for (const [artworkId, metObjectId] of Object.entries(DIRECT_MET_IDS)) {
    const obj = await fetchJSON(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${metObjectId}`)
    const imgUrl = obj?.primaryImageSmall || obj?.primaryImage
    if (!imgUrl) { console.log(`❌ No image for Met object ${metObjectId}`); continue }

    const dest = path.join(OUT_DIR, `${artworkId}.jpg`)
    const ok = await downloadFile(imgUrl, dest)
    if (ok) {
      const artwork = await prisma.artwork.findFirst({ where: { id: artworkId }, select: { museumId: true } })
      if (artwork) {
        await prisma.artwork.update({
          where: { museumId_id: { museumId: artwork.museumId, id: artworkId } },
          data: { imageUrl: `/images/artworks/${artworkId}.jpg` }
        })
        console.log(`✅ ${artworkId} — ${Math.round(fs.statSync(dest).size / 1024)}KB`)
      }
    } else {
      console.log(`❌ Download failed for ${artworkId}`)
    }
  }

  // Fix by copying from already-downloaded artwork
  for (const [artworkId, borrowId] of Object.entries(BORROW_FROM)) {
    const src = path.join(OUT_DIR, `${borrowId}.jpg`)
    const dest = path.join(OUT_DIR, `${artworkId}.jpg`)
    if (!fs.existsSync(src)) { console.log(`❌ Source not found: ${borrowId}`); continue }

    fs.copyFileSync(src, dest)
    const artwork = await prisma.artwork.findFirst({ where: { id: artworkId }, select: { museumId: true } })
    if (artwork) {
      await prisma.artwork.update({
        where: { museumId_id: { museumId: artwork.museumId, id: artworkId } },
        data: { imageUrl: `/images/artworks/${artworkId}.jpg` }
      })
      console.log(`✅ ${artworkId} — copied from ${borrowId}`)
    }
  }

  await prisma.$disconnect()
  console.log('\n✅ All done')
}

main().catch(e => { console.error(e); process.exit(1) })
