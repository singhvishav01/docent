/**
 * move-images.ts
 *
 * Migrates artwork images from public/images/artworks/ to ../docent-assets/images/artworks/.
 * Safe to run multiple times — skips files that already exist at the destination.
 *
 * Run: npx tsx scripts/move-images.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(process.cwd(), 'public', 'images', 'artworks');
const DEST_DIR = path.resolve(process.cwd(), '..', 'docent-assets', 'images', 'artworks');

function main() {
  // Ensure destination exists
  fs.mkdirSync(DEST_DIR, { recursive: true });

  if (!fs.existsSync(SRC_DIR)) {
    console.log(`Source directory does not exist: ${SRC_DIR}`);
    console.log('Nothing to move.');
    return;
  }

  const files = fs.readdirSync(SRC_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
  });

  if (files.length === 0) {
    console.log('No image files found in source directory.');
    return;
  }

  console.log(`\nMoving ${files.length} images from:\n  ${SRC_DIR}\nto:\n  ${DEST_DIR}\n`);

  let moved = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const src = path.join(SRC_DIR, file);
    const dest = path.join(DEST_DIR, file);

    try {
      if (fs.existsSync(dest)) {
        const srcSize = fs.statSync(src).size;
        const destSize = fs.statSync(dest).size;
        if (srcSize === destSize) {
          fs.unlinkSync(src);
          console.log(`  skip  ${file} (already exists, removed source)`);
          skipped++;
          continue;
        }
      }

      // Copy then delete (safer than rename across drives)
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
      console.log(`  moved ${file}`);
      moved++;
    } catch (err) {
      console.error(`  ERROR ${file}: ${err}`);
      errors++;
    }
  }

  // Clean up empty source directory
  try {
    const remaining = fs.readdirSync(SRC_DIR);
    if (remaining.length === 0) {
      fs.rmdirSync(SRC_DIR);
      console.log(`\nRemoved empty source directory: ${SRC_DIR}`);
    }
  } catch {
    // Not critical
  }

  console.log(`\nDone: ${moved} moved, ${skipped} skipped, ${errors} errors`);
}

main();
