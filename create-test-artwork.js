const fs = require('fs');
const path = require('path');

const sampleMuseumPath = 'data/museums/sample-museum';

// Ensure directory exists
if (!fs.existsSync(sampleMuseumPath)) {
  fs.mkdirSync(sampleMuseumPath, { recursive: true });
}

// Test Artwork 2
const testArtwork2 = {
  "id": "test-artwork-2",
  "title": "Abstract Composition II",
  "artist": "Test Artist Beta",
  "year": "2023",
  "medium": "Digital art on canvas",
  "dimensions": "60 × 80 cm (24 × 32 in)",
  "location": "Sample Museum - Gallery A, Wall 2",
  "description": "A vibrant exploration of geometric forms and color relationships, featuring bold primary colors arranged in dynamic compositions that challenge traditional spatial perspectives.",
  "provenance": "Created specifically for testing purposes in the Sample Museum collection.",
  "curator_notes": [
    {
      "id": "note_test_2_001",
      "type": "interpretation",
      "curator_name": "Test Curator",
      "content": "This piece demonstrates the interplay between geometric abstraction and color theory, showcasing how simple shapes can create complex visual narratives.",
      "created_at": "2024-09-01T10:00:00.000Z"
    },
    {
      "id": "note_test_2_002", 
      "type": "technical_analysis",
      "curator_name": "Digital Art Specialist",
      "content": "The digital medium allows for precise color gradients and sharp geometric boundaries that would be difficult to achieve with traditional media.",
      "created_at": "2024-09-02T14:30:00.000Z"
    }
  ],
  "created_at": "2024-09-01T10:00:00.000Z",
  "updated_at": "2024-09-02T14:30:00.000Z"
};

// Test Artwork 3
const testArtwork3 = {
  "id": "test-artwork-3",
  "title": "Urban Landscapes", 
  "artist": "Test Artist Gamma",
  "year": "2024",
  "medium": "Mixed media collage",
  "dimensions": "100 × 150 cm (40 × 60 in)",
  "location": "Sample Museum - Gallery B, Center Wall",
  "description": "A contemporary interpretation of cityscapes through layered materials, incorporating found objects, photographs, and paint to create a multi-dimensional view of urban life.",
  "provenance": "Acquired for the Sample Museum test collection to demonstrate mixed media techniques.",
  "curator_notes": [
    {
      "id": "note_test_3_001",
      "type": "interpretation", 
      "curator_name": "Contemporary Art Curator",
      "content": "The artist successfully bridges the gap between photography and painting, creating a unique perspective on modern urban environments.",
      "created_at": "2024-09-01T15:00:00.000Z"
    },
    {
      "id": "note_test_3_002",
      "type": "visitor_info",
      "curator_name": "Education Team", 
      "content": "Look closely at the different textures - notice how newspaper clippings, fabric pieces, and paint layers create depth and tell stories about city life.",
      "created_at": "2024-09-02T11:00:00.000Z"
    },
    {
      "id": "note_test_3_003",
      "type": "technical_analysis",
      "curator_name": "Materials Specialist",
      "content": "The collage technique employs various adhesives and mediums, requiring careful conservation considerations for long-term preservation.",
      "created_at": "2024-09-03T09:00:00.000Z"
    }
  ],
  "created_at": "2024-09-01T15:00:00.000Z",
  "updated_at": "2024-09-03T09:00:00.000Z"
};

// Test Artwork 4
const testArtwork4 = {
  "id": "test-artwork-4",
  "title": "Meditation in Blue",
  "artist": "Test Artist Delta", 
  "year": "2024",
  "medium": "Oil on canvas",
  "dimensions": "120 × 90 cm (48 × 36 in)",
  "location": "Sample Museum - Gallery C, Featured Wall",
  "description": "A serene monochromatic study exploring various shades and textures of blue, inviting viewers into a contemplative space through subtle gradations and organic forms.",
  "provenance": "Part of the Sample Museum's contemporary collection, created to demonstrate color studies and meditative art practices.",
  "curator_notes": [
    {
      "id": "note_test_4_001",
      "type": "interpretation",
      "curator_name": "Color Theory Expert",
      "content": "This work exemplifies how a limited palette can create infinite emotional depth. The artist uses temperature variations within blue to guide the viewer's eye and emotional response.",
      "created_at": "2024-09-01T12:00:00.000Z"
    },
    {
      "id": "note_test_4_002",
      "type": "technical_analysis", 
      "curator_name": "Painting Conservator",
      "content": "Notice the subtle impasto techniques in the lighter areas contrasted with thin glazes in the shadows. This creates both textural and optical depth.",
      "created_at": "2024-09-02T16:00:00.000Z"
    },
    {
      "id": "note_test_4_003",
      "type": "visitor_info",
      "curator_name": "Mindfulness Art Guide",
      "content": "This piece is designed for contemplative viewing. Try spending 2-3 minutes just observing how your eye moves across the surface and how the blues affect your mood.",
      "created_at": "2024-09-03T10:30:00.000Z"
    },
    {
      "id": "note_test_4_004",
      "type": "historical_context",
      "curator_name": "Modern Art Historian", 
      "content": "The monochromatic approach echoes the work of Yves Klein and other color field painters, while maintaining a contemporary sensibility through its organic forms.",
      "created_at": "2024-09-03T14:00:00.000Z"
    }
  ],
  "created_at": "2024-09-01T12:00:00.000Z",
  "updated_at": "2024-09-03T14:00:00.000Z"
};

// Write the files
try {
  fs.writeFileSync(
    path.join(sampleMuseumPath, 'test-artwork-2.json'),
    JSON.stringify(testArtwork2, null, 2)
  );
  console.log('✓ Created test-artwork-2.json');

  fs.writeFileSync(
    path.join(sampleMuseumPath, 'test-artwork-3.json'), 
    JSON.stringify(testArtwork3, null, 2)
  );
  console.log('✓ Created test-artwork-3.json');

  fs.writeFileSync(
    path.join(sampleMuseumPath, 'test-artwork-4.json'),
    JSON.stringify(testArtwork4, null, 2)
  );
  console.log('✓ Created test-artwork-4.json');

  console.log('\nAll test artworks created successfully!');
  console.log('Restart your dev server to reload the RAG system.');
  
} catch (error) {
  console.error('Error creating files:', error);
}