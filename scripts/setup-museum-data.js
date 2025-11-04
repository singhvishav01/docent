const fs = require('fs').promises;
const path = require('path');

async function setupMuseumData() {
  const dataPath = path.join(process.cwd(), 'data', 'museums');
  
  try {
    // Check current structure
    console.log('Analyzing current data structure...');
    const items = await fs.readdir(dataPath, { withFileTypes: true });
    
    for (const item of items) {
      console.log(`Found: ${item.name} (${item.isDirectory() ? 'directory' : 'file'})`);
      
      if (item.isDirectory()) {
        const folderPath = path.join(dataPath, item.name);
        const folderContents = await fs.readdir(folderPath);
        console.log(`  Contents: ${folderContents.join(', ')}`);
      }
    }

    // Create a proper museums.json based on your actual structure
    const museums = [
      {
        id: 'met',
        name: 'Metropolitan Museum of Art',
        description: 'One of the world\'s largest and most prestigious art museums',
        location: 'New York City',
        folder_path: 'met'
      }
    ];

    // Check if met folder has individual artwork files
    const metPath = path.join(dataPath, 'met');
    try {
      const metContents = await fs.readdir(metPath);
      const artworkFiles = metContents.filter(file => file.endsWith('.json'));
      
      if (artworkFiles.length > 0) {
        console.log(`Found ${artworkFiles.length} artwork files in met folder`);
        
        // Combine all individual artwork files into one artworks array
        const allArtworks = [];
        
        for (const artworkFile of artworkFiles) {
          try {
            const artworkPath = path.join(metPath, artworkFile);
            const artworkData = await fs.readFile(artworkPath, 'utf-8');
            const artwork = JSON.parse(artworkData);
            allArtworks.push(artwork);
            console.log(`Loaded: ${artwork.title || artworkFile}`);
          } catch (error) {
            console.warn(`Failed to load ${artworkFile}:`, error.message);
          }
        }

        // Save combined artworks file
        const combinedPath = path.join(dataPath, 'met.json');
        await fs.writeFile(combinedPath, JSON.stringify(allArtworks, null, 2));
        console.log(`✓ Created ${combinedPath} with ${allArtworks.length} artworks`);
      }
    } catch (error) {
      console.warn('Met folder not found or empty');
    }

    // Write museums.json
    const museumsPath = path.join(dataPath, 'museums.json');
    await fs.writeFile(museumsPath, JSON.stringify(museums, null, 2));
    console.log(`✓ Created ${museumsPath}`);

    console.log('\nSetup complete! Your data structure should now work with the RAG system.');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

if (require.main === module) {
  setupMuseumData();
}

module.exports = { setupMuseumData };