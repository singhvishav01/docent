// scripts/import-csv-to-db.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface CSVArtwork {
  Museum: string;
  Title: string;
  Artist: string;
  Year: string;
  Medium: string;
  Dimensions: string;
  Description: string;
  'Gallery Location': string;
  'Accession Number': string;
  'Period / Movement': string;
  'Image URL': string;
  Provenance: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseCSV(csvContent: string): CSVArtwork[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  
  const artworks: CSVArtwork[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const artwork: any = {};
    
    headers.forEach((header, index) => {
      artwork[header] = values[index] || '';
    });
    
    artworks.push(artwork as CSVArtwork);
  }
  
  return artworks;
}

async function importCSVData() {
  console.log('🚀 Starting CSV import to PostgreSQL...\n');

  try {
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'Untitled spreadsheet - Sheet1.csv');
    console.log(`📄 Reading CSV from: ${csvPath}`);
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const artworks = parseCSV(csvContent);
    
    console.log(`✅ Parsed ${artworks.length} artworks from CSV\n`);

    // Ensure MET museum exists
    const metMuseum = await prisma.museum.upsert({
      where: { id: 'met' },
      update: {
        name: 'The Metropolitan Museum of Art',
        description: 'The Metropolitan Museum of Art in New York City',
        location: 'New York, NY',
      },
      create: {
        id: 'met',
        name: 'The Metropolitan Museum of Art',
        description: 'The Metropolitan Museum of Art in New York City',
        location: 'New York, NY',
      },
    });
    console.log(`✅ Museum ready: ${metMuseum.name}\n`);

    // Get admin user for curator notes
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (!adminUser) {
      console.error('⚠️  No admin user found. Run seed first: npm run db:seed');
      return;
    }

    let importedCount = 0;
    let skippedCount = 0;

    // Import each artwork
    for (const csvArtwork of artworks) {
      try {
        // Generate artwork ID from title
        const artworkId = csvArtwork.Title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .substring(0, 50);

        // Parse year
        let year: number | undefined;
        if (csvArtwork.Year) {
          const yearStr = csvArtwork.Year.trim();
          if (yearStr.match(/^\d+$/)) {
            year = parseInt(yearStr);
          } else if (yearStr.includes('–')) {
            // Handle range like "1883–84"
            const firstYear = yearStr.split('–')[0].trim();
            year = parseInt(firstYear);
          } else if (yearStr.toLowerCase().includes('ca.')) {
            // Handle "ca. 1645"
            const match = yearStr.match(/\d+/);
            if (match) year = parseInt(match[0]);
          }
        }

        // Create or update artwork
        const artwork = await prisma.artwork.upsert({
          where: {
            museumId_id: {
              museumId: 'met',
              id: artworkId,
            },
          },
          update: {
            title: csvArtwork.Title,
            artist: csvArtwork.Artist,
            year: year,
            medium: csvArtwork.Medium || undefined,
            dimensions: csvArtwork.Dimensions || undefined,
            description: csvArtwork.Description || undefined,
            provenance: csvArtwork.Provenance || undefined,
            imageUrl: csvArtwork['Image URL'] || undefined,
            gallery: csvArtwork['Gallery Location'] || undefined,
            accessionNumber: csvArtwork['Accession Number'] || undefined,
            period: csvArtwork['Period / Movement'] || undefined,
            qrCode: `MET-${artworkId.toUpperCase()}`,
          },
          create: {
            museumId: 'met',
            id: artworkId,
            title: csvArtwork.Title,
            artist: csvArtwork.Artist,
            year: year,
            medium: csvArtwork.Medium || undefined,
            dimensions: csvArtwork.Dimensions || undefined,
            description: csvArtwork.Description || undefined,
            provenance: csvArtwork.Provenance || undefined,
            imageUrl: csvArtwork['Image URL'] || undefined,
            gallery: csvArtwork['Gallery Location'] || undefined,
            accessionNumber: csvArtwork['Accession Number'] || undefined,
            period: csvArtwork['Period / Movement'] || undefined,
            qrCode: `MET-${artworkId.toUpperCase()}`,
          },
        });

        console.log(`✅ ${csvArtwork.Title} by ${csvArtwork.Artist} (${year || 'unknown year'})`);
        importedCount++;

      } catch (error: any) {
        console.error(`❌ Failed to import "${csvArtwork.Title}":`, error.message);
        skippedCount++;
      }
    }

    console.log('\n✅ CSV import complete!');
    console.log(`📊 Summary:`);
    console.log(`   Total in CSV: ${artworks.length}`);
    console.log(`   Imported: ${importedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. View in Prisma Studio: npx prisma studio`);
    console.log(`   2. Test the app: npm run dev\n`);

  } catch (error) {
    console.error('❌ CSV import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run import
importCSVData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });