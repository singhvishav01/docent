// src/app/api/import-csv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, isCuratorOrAdmin } from '@/lib/auth';

interface CSVArtwork {
  Museum: string;
  Title: string;
  Artist: string;
  Year?: string;
  Medium?: string;
  Dimensions?: string;
  Description?: string;
  'Gallery Location'?: string;
  'Accession Number'?: string;
  'Period / Movement'?: string;
  'Image URL'?: string;
  Provenance?: string;
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

function generateArtworkId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
}

function parseYear(yearStr?: string): number | undefined {
  if (!yearStr) return undefined;
  
  const cleaned = yearStr.trim();
  
  // Direct year: "1889"
  if (cleaned.match(/^\d+$/)) {
    return parseInt(cleaned);
  }
  
  // Range: "1883–84"
  if (cleaned.includes('–')) {
    const firstYear = cleaned.split('–')[0].trim();
    return parseInt(firstYear);
  }
  
  // Circa: "ca. 1645"
  if (cleaned.toLowerCase().includes('ca.')) {
    const match = cleaned.match(/\d+/);
    if (match) return parseInt(match[0]);
  }
  
  return undefined;
}

function getMuseumId(museumName: string): string {
  const normalizedName = museumName.toLowerCase();
  
  if (normalizedName.includes('metropolitan')) return 'met';
  if (normalizedName.includes('modern art')) return 'moma';
  if (normalizedName.includes('louvre')) return 'louvre';
  
  // Generate ID from name
  return museumName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication and authorization
    const currentUser = await getCurrentUser();
    
    if (!isCuratorOrAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only curators and admins can import CSV files.' },
        { status: 403 }
      );
    }

    console.log(`📤 CSV import started by: ${currentUser?.email} (${currentUser?.role})`);

    // Parse the uploaded file
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    const artworks = parseCSV(csvContent);

    console.log(`📋 Parsed ${artworks.length} artworks from CSV`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Track museums we've ensured exist
    const ensuredMuseums = new Set<string>();

    for (const csvArtwork of artworks) {
      try {
        // Validate required fields
        if (!csvArtwork.Title || !csvArtwork.Artist || !csvArtwork.Museum) {
          errors.push(`Row skipped: Missing required fields (Title: "${csvArtwork.Title}", Artist: "${csvArtwork.Artist}")`);
          skippedCount++;
          continue;
        }

        const museumId = getMuseumId(csvArtwork.Museum);

        // Ensure museum exists (only once per museum)
        if (!ensuredMuseums.has(museumId)) {
          await db.museum.upsert({
            where: { id: museumId },
            update: { name: csvArtwork.Museum },
            create: {
              id: museumId,
              name: csvArtwork.Museum,
              description: `${csvArtwork.Museum} collection`,
              isActive: true,
            },
          });
          ensuredMuseums.add(museumId);
          console.log(`✅ Museum ensured: ${csvArtwork.Museum} (${museumId})`);
        }

        const artworkId = generateArtworkId(csvArtwork.Title);
        const year = parseYear(csvArtwork.Year);

        // Create or update artwork
        await db.artwork.upsert({
          where: {
            museumId_id: { museumId, id: artworkId }
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
            qrCode: `${museumId.toUpperCase()}-${artworkId.toUpperCase()}`,
          },
          create: {
            museumId,
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
            qrCode: `${museumId.toUpperCase()}-${artworkId.toUpperCase()}`,
          },
        });

        importedCount++;
        console.log(`✅ ${csvArtwork.Title} by ${csvArtwork.Artist}`);

      } catch (error: any) {
        const errorMsg = `Failed to import "${csvArtwork.Title}": ${error.message}`;
        errors.push(errorMsg);
        skippedCount++;
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`\n✅ CSV import complete!`);
    console.log(`   Imported: ${importedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errors.length}`);

    return NextResponse.json({
      message: 'CSV import completed',
      imported: importedCount,
      skipped: skippedCount,
      total: artworks.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('❌ CSV import failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import CSV', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}