// save this as setup-museums.js in your project root and run with: node setup-museums.js

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const museumsDir = path.join(dataDir, 'museums');

// Create directories if they don't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
  console.log('Created data directory');
}

if (!fs.existsSync(museumsDir)) {
  fs.mkdirSync(museumsDir);
  console.log('Created museums directory');
}

// Create museums.json
const museumsIndex = [
  {
    id: "met",
    name: "Metropolitan Museum of Art",
    description: "The Metropolitan Museum of Art in New York City"
  },
  {
    id: "moma",
    name: "Museum of Modern Art",
    description: "The Museum of Modern Art in New York City"
  },
  {
    id: "louvre",
    name: "Louvre Museum",
    description: "The world's largest art museum in Paris"
  },
  {
    id: "sample-museum",
    name: "Sample Museum",
    description: "A sample museum for testing"
  }
];

fs.writeFileSync(
  path.join(dataDir, 'museums.json'), 
  JSON.stringify(museumsIndex, null, 2)
);
console.log('Created museums.json');

// Create individual museum files
const museums = {
  'met.json': {
    id: "met",
    name: "Metropolitan Museum of Art",
    description: "The Metropolitan Museum of Art in New York City",
    artworks: [
      {
        id: "washington_crossing",
        title: "Washington Crossing the Delaware",
        artist: "Emanuel Leutze",
        year: 1851,
        medium: "Oil on canvas",
        dimensions: "378.5 cm × 647.7 cm",
        description: "Washington Crossing the Delaware is an 1851 oil-on-canvas painting by German-American artist Emanuel Leutze. It commemorates General George Washington during his famous crossing of the Delaware River with the Continental Army on the night of December 25–26, 1776, during the American Revolutionary War.",
        gallery: "Gallery 760",
        accession_number: "97.34",
        period: "19th Century American",
        curator_notes: [
          {
            note: "This iconic painting was actually painted in Düsseldorf, Germany, and depicts a dramatized version of the historical event.",
            author: "Dr. American History",
            date: "2024-01-10"
          }
        ]
      }
    ]
  },
  'moma.json': {
    id: "moma",
    name: "Museum of Modern Art",
    description: "The Museum of Modern Art in New York City",
    artworks: [
      {
        id: "starry_night",
        title: "The Starry Night",
        artist: "Vincent van Gogh",
        year: 1889,
        medium: "Oil on canvas",
        dimensions: "73.7 cm × 92.1 cm",
        description: "The Starry Night is an oil-on-canvas painting by Dutch Post-Impressionist painter Vincent van Gogh. Painted in June 1889, it depicts the view from the east-facing window of his asylum room at Saint-Rémy-de-Provence, just before sunrise, with the addition of an imaginary village.",
        image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        gallery: "Gallery 3",
        accession_number: "472.1941",
        period: "Post-Impressionism",
        curator_notes: [
          {
            note: "This painting was created during van Gogh's stay at the asylum in Saint-Rémy-de-Provence.",
            author: "Dr. Sarah Johnson",
            date: "2024-01-15"
          }
        ]
      }
    ]
  },
  'louvre.json': {
    id: "louvre",
    name: "Louvre Museum",
    description: "The world's largest art museum in Paris",
    artworks: [
      {
        id: "mona_lisa",
        title: "Mona Lisa",
        artist: "Leonardo da Vinci",
        year: 1517,
        medium: "Oil on poplar panel",
        dimensions: "77 cm × 53 cm",
        description: "The Mona Lisa is a half-length portrait painting by Italian artist Leonardo da Vinci. Considered an archetypal masterpiece of the Italian Renaissance, it has been described as the best known, the most visited, the most written about, the most sung about, the most parodied work of art in the world.",
        image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/687px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
        gallery: "Salle des États",
        accession_number: "779",
        period: "Italian Renaissance",
        curator_notes: [
          {
            note: "The subject's enigmatic smile has made this painting one of the most famous works in the world.",
            author: "Dr. Marie Dubois",
            date: "2024-02-10"
          }
        ]
      }
    ]
  },
  'sample-museum.json': {
    id: "sample-museum",
    name: "Sample Museum",
    description: "A sample museum for testing",
    artworks: [
      {
        id: "test-artwork-1",
        title: "Sample Artwork",
        artist: "Test Artist",
        year: 2024,
        medium: "Digital Art",
        dimensions: "100 cm × 100 cm",
        description: "This is a sample artwork for testing the museum guide application.",
        gallery: "Test Gallery",
        accession_number: "TEST.001",
        period: "Contemporary",
        curator_notes: [
          {
            note: "This is a test artwork created for development purposes.",
            author: "System Admin",
            date: "2024-01-01"
          }
        ]
      }
    ]
  }
};

// Write all museum files
Object.entries(museums).forEach(([filename, data]) => {
  fs.writeFileSync(
    path.join(museumsDir, filename),
    JSON.stringify(data, null, 2)
  );
  console.log(`Created ${filename}`);
});

console.log('\nSetup complete! Your museum data structure is now ready.');
console.log('You can now test your app with:');
console.log('- /artwork/washington_crossing?museum=met');
console.log('- /artwork/starry_night?museum=moma');
console.log('- /artwork/mona_lisa?museum=louvre');
console.log('- /artwork/test-artwork-1?museum=sample-museum');