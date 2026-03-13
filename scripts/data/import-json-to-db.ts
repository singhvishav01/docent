// scripts/import-json-to-db.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

interface RawCuratorNote {
  note?: string;
  content?: string;
  author?: string;
  curator_name?: string;
  date?: string;
  created_at?: string;
  type?: string;
}

interface RawArtwork {
  id: string;
  title: string;
  artist: string;
  year?: number;
  medium?: string;
  dimensions?: string;
  description?: string;
  provenance?: string;
  image_url?: string;
  gallery?: string;
  accession_number?: string;
  period?: string;
  curator_notes?: RawCuratorNote[];
}

interface MuseumJsonData {
  id: string;
  name: string;
  description?: string;
  artworks: RawArtwork[];
}

interface MuseumIndex {
  id: string;
  name: string;
  description?: string;
  location?: string;
}

async function importJsonToDatabase() {
  console.log('🚀 Starting JSON import to PostgreSQL...\n');

  const dataPath = path.join(process.cwd(), 'data', 'museums');
  
  try {
    // Step 1: Load museums index
    console.log('📋 Loading museums index...');
    const museumsIndexPath = path.join(dataPath, 'museums.json');
    const museumsIndexData = await fs.readFile(museumsIndexPath, 'utf-8');
    const museumsIndex: MuseumIndex[] = JSON.parse(museumsIndexData);
    console.log(`   Found ${museumsIndex.length} museums\n`);

    let totalArtworks = 0;
    let totalCuratorNotes = 0;

    // Step 2: Process each museum
    for (const museumInfo of museumsIndex) {
      console.log(`🏛️  Processing: ${museumInfo.name} (${museumInfo.id})`);

      // Create museum record
      const museum = await prisma.museum.upsert({
        where: { id: museumInfo.id },
        update: {
          name: museumInfo.name,
          description: museumInfo.description,
          location: museumInfo.location,
        },
        create: {
          id: museumInfo.id,
          name: museumInfo.name,
          description: museumInfo.description,
          location: museumInfo.location,
        },
      });
      console.log(`   ✅ Museum created/updated`);

      // Load museum's artwork file
      const museumFilePath = path.join(dataPath, `${museumInfo.id}.json`);
      
      try {
        const museumFileData = await fs.readFile(museumFilePath, 'utf-8');
        const museumData: MuseumJsonData = JSON.parse(museumFileData);

        if (!museumData.artworks || museumData.artworks.length === 0) {
          console.log(`   ⚠️  No artworks found\n`);
          continue;
        }

        // Step 3: Import artworks
        for (const rawArtwork of museumData.artworks) {
          const artwork = await prisma.artwork.upsert({
            where: {
              museumId_id: {
                museumId: museumInfo.id,
                id: rawArtwork.id,
              },
            },
            update: {
              title: rawArtwork.title,
              artist: rawArtwork.artist,
              year: rawArtwork.year,
              medium: rawArtwork.medium,
              dimensions: rawArtwork.dimensions,
              description: rawArtwork.description,
              provenance: rawArtwork.provenance,
              imageUrl: rawArtwork.image_url,
              gallery: rawArtwork.gallery,
              accessionNumber: rawArtwork.accession_number,
              period: rawArtwork.period,
            },
            create: {
              museumId: museumInfo.id,
              id: rawArtwork.id,
              title: rawArtwork.title,
              artist: rawArtwork.artist,
              year: rawArtwork.year,
              medium: rawArtwork.medium,
              dimensions: rawArtwork.dimensions,
              description: rawArtwork.description,
              provenance: rawArtwork.provenance,
              imageUrl: rawArtwork.image_url,
              gallery: rawArtwork.gallery,
              accessionNumber: rawArtwork.accession_number,
              period: rawArtwork.period,
            },
          });
          totalArtworks++;
          console.log(`      → ${artwork.title}`);

          // Step 4: Import curator notes (if any in JSON)
          if (rawArtwork.curator_notes && rawArtwork.curator_notes.length > 0) {
            // Find admin user to attribute notes to
            const adminUser = await prisma.user.findFirst({
              where: { role: 'admin' },
            });

            if (!adminUser) {
              console.log(`      ⚠️  No admin user found, skipping curator notes`);
              continue;
            }

            for (const rawNote of rawArtwork.curator_notes) {
              const noteContent = rawNote.content || rawNote.note || '';
              const noteType = rawNote.type || 'interpretation';
              
              if (!noteContent) continue;

              await prisma.curatorNote.create({
                data: {
                  museumId: museumInfo.id,
                  artworkId: rawArtwork.id,
                  curatorId: adminUser.id,
                  content: noteContent,
                  type: noteType,
                  createdAt: rawNote.created_at || rawNote.date 
                    ? new Date(rawNote.created_at || rawNote.date!)
                    : new Date(),
                },
              });
              totalCuratorNotes++;
            }
            
            if (rawArtwork.curator_notes.length > 0) {
              console.log(`         + ${rawArtwork.curator_notes.length} curator notes`);
            }
          }
        }

        console.log(`   ✅ Imported ${museumData.artworks.length} artworks\n`);

      } catch (error) {
        console.log(`   ⚠️  Failed to load artwork file: ${error}\n`);
        continue;
      }
    }

    console.log('✅ Import complete!');
    console.log(`📊 Summary:`);
    console.log(`   Museums: ${museumsIndex.length}`);
    console.log(`   Artworks: ${totalArtworks}`);
    console.log(`   Curator Notes: ${totalCuratorNotes}`);
    console.log(`\n⚠️  Next steps:`);
    console.log(`   1. Verify data in Prisma Studio: npx prisma studio`);
    console.log(`   2. Continue to Phase 4: Update RAG system\n`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run import
importJsonToDatabase()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });