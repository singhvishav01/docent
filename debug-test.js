// Create this as a temporary test file: debug-test.js
// Run with: node debug-test.js

const fs = require('fs');
const path = require('path');

async function testJSON() {
  console.log('=== Testing JSON Files ===\n');
  
  // Test museums.json
  try {
    const museumsPath = path.join('data', 'museums', 'museums.json');
    console.log(`Reading: ${museumsPath}`);
    
    const rawData = fs.readFileSync(museumsPath, 'utf-8');
    console.log(`Raw data length: ${rawData.length}`);
    console.log(`First 50 chars: "${rawData.substring(0, 50)}"`);
    
    // Check for BOM
    if (rawData.charCodeAt(0) === 0xFEFF) {
      console.log('❌ Found BOM character!');
    } else {
      console.log('✅ No BOM detected');
    }
    
    // Clean and parse
    const cleaned = rawData.replace(/^\uFEFF/, '').trim();
    const parsed = JSON.parse(cleaned);
    
    console.log(`✅ Museums JSON parsed successfully`);
    console.log(`Found ${parsed.length} museums:`);
    parsed.forEach(museum => console.log(`  - ${museum.id}: ${museum.name}`));
    
  } catch (error) {
    console.log('❌ Museums JSON error:', error.message);
  }
  
  console.log('\n');
  
  // Test artwork JSON
  try {
    const artworkPath = path.join('data', 'museums', 'sample-museum', 'test-artwork-1.json');
    console.log(`Reading: ${artworkPath}`);
    
    const rawData = fs.readFileSync(artworkPath, 'utf-8');
    console.log(`Raw data length: ${rawData.length}`);
    
    // Check for BOM
    if (rawData.charCodeAt(0) === 0xFEFF) {
      console.log('❌ Found BOM character!');
    } else {
      console.log('✅ No BOM detected');
    }
    
    const cleaned = rawData.replace(/^\uFEFF/, '').trim();
    const parsed = JSON.parse(cleaned);
    
    console.log(`✅ Artwork JSON parsed successfully`);
    console.log(`Artwork: ${parsed.title} by ${parsed.artist}`);
    console.log(`Year type: ${typeof parsed.year}`);
    
  } catch (error) {
    console.log('❌ Artwork JSON error:', error.message);
  }
}

testJSON();