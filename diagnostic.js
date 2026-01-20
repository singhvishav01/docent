// verify-json.js - Run with: node verify-json.js
// Verifies all museum JSON files are valid

const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  console.log(`\n📄 Checking: ${filePath}`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`   ❌ File not found`);
      return false;
    }
    
    // Read file
    const rawData = fs.readFileSync(filePath, 'utf-8');
    console.log(`   📊 Size: ${rawData.length} bytes`);
    
    // Check for BOM
    const hasBOM = rawData.charCodeAt(0) === 0xFEFF;
    if (hasBOM) {
      console.log(`   ⚠️  BOM detected (will be removed automatically)`);
    }
    
    // Try to parse
    const cleanData = rawData.replace(/^\uFEFF/, '').trim();
    const parsed = JSON.parse(cleanData);
    
    console.log(`   ✅ Valid JSON`);
    
    // Show structure
    if (Array.isArray(parsed)) {
      console.log(`   📦 Array with ${parsed.length} items`);
    } else if (parsed.artworks) {
      console.log(`   🏛️  Museum: ${parsed.name}`);
      console.log(`   🎨 Artworks: ${parsed.artworks.length}`);
      
      // List artworks
      parsed.artworks.forEach((art, idx) => {
        console.log(`      ${idx + 1}. ${art.title} by ${art.artist} (ID: ${art.id})`);
      });
    } else {
      console.log(`   📋 Object with keys: ${Object.keys(parsed).join(', ')}`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

console.log('🔍 DOCENT JSON Files Verification\n');
console.log('='.repeat(60));

const dataPath = path.join(process.cwd(), 'data', 'museums');
console.log(`📂 Data path: ${dataPath}\n`);

// Check if data directory exists
if (!fs.existsSync(dataPath)) {
  console.log(`❌ Data directory not found: ${dataPath}`);
  console.log(`\nCreate it with: mkdir -p data/museums`);
  process.exit(1);
}

// Files to check
const files = [
  'museums.json',
  'met.json',
  'moma.json',
  'louvre.json',
  'sample-museum.json'
];

let allValid = true;

files.forEach(file => {
  const filePath = path.join(dataPath, file);
  const isValid = checkFile(filePath);
  if (!isValid) allValid = false;
});

console.log('\n' + '='.repeat(60));
if (allValid) {
  console.log('✅ All JSON files are valid!\n');
} else {
  console.log('❌ Some JSON files have issues. Fix them before running the app.\n');
  process.exit(1);
}