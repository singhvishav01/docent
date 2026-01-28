// src/app/api/admin/csv-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isCuratorOrAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

interface CSVRow {
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

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let char of lines[i]) {
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''));

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row as CSVRow);
  }

  return rows;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!isCuratorOrAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized. Curator or admin access required.' },
        { status: 403 }
      );
    }

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
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or invalid' },
        { status: 400 }
      );
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because: +1 for header, +1 for 0-index

      try {
        // Validate required fields
        if (!row.Museum || !row.Title || !row.Artist) {
          errors.push(`Row ${rowNum}: Missing required fields (Museum, Title, Artist)`);
          failedCount++;
          continue;
        }

        // Check if museum exists
        const museum = await db.museum.findUnique({
          where: { id: row.Museum }
        });

        if (!museum) {
          errors.push(`Row ${rowNum}: Museum '${row.Museum}' not found`);
          failedCount++;
          continue;
        }

        // Generate artwork ID from title
        const artworkId = row.Title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
          .substring(0, 50);

        // Parse year
        const year = row.Year ? parseInt(row.Year) : null;

        // Create artwork
        await db.artwork.upsert({
          where: {
            museumId_id: {
              museumId: row.Museum,
              id: artworkId
            }
          },
          update: {
            title: row.Title,
            artist: row.Artist,
            year: year,
            medium: row.Medium || null,
            dimensions: row.Dimensions || null,
            description: row.Description || null,
            imageUrl: row['Image URL'] || null,
            gallery: row['Gallery Location'] || null,
            accessionNumber: row['Accession Number'] || null,
            period: row['Period / Movement'] || null,
            provenance: row.Provenance || null,
            qrCode: artworkId,
          },
          create: {
            museumId: row.Museum,
            id: artworkId,
            title: row.Title,
            artist: row.Artist,
            year: year,
            medium: row.Medium || null,
            dimensions: row.Dimensions || null,
            description: row.Description || null,
            imageUrl: row['Image URL'] || null,
            gallery: row['Gallery Location'] || null,
            accessionNumber: row['Accession Number'] || null,
            period: row['Period / Movement'] || null,
            provenance: row.Provenance || null,
            qrCode: artworkId,
          }
        });

        successCount++;
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error);
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Processed ${successCount} artworks successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}