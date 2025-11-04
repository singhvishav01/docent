# scripts/setup-rag.ps1 - PowerShell setup script for RAG system

Write-Host "Setting up RAG system for DOCENT..." -ForegroundColor Green
Write-Host ""

# Create data directory structure
$directories = @(
    "data",
    "data/museums",
    "data/museums/moma", 
    "data/museums/met",
    "data/museums/louvre"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Yellow
    }
}

Write-Host ""

# Create museums configuration
$museumsConfig = @{
    museums = @(
        @{
            id = "moma"
            name = "Museum of Modern Art"
            description = "The Museum of Modern Art in New York City"
            location = "New York, NY"
            folder_path = "moma"
        },
        @{
            id = "met"
            name = "Metropolitan Museum of Art" 
            description = "The Metropolitan Museum of Art in New York City"
            location = "New York, NY"
            folder_path = "met"
        },
        @{
            id = "louvre"
            name = "Louvre Museum"
            description = "The world's largest art museum in Paris"
            location = "Paris, France"
            folder_path = "louvre"
        }
    )
}

$museumsJson = $museumsConfig | ConvertTo-Json -Depth 3
$museumsJson | Out-File -FilePath "data/museums/museums.json" -Encoding UTF8
Write-Host "Created museums.json configuration" -ForegroundColor Green

# Sample artworks data
$artworks = @{
    "starry_night" = @{
        path = "data/museums/moma/starry_night.json"
        data = @{
            id = "starry_night"
            title = "The Starry Night"
            artist = "Vincent van Gogh"
            year = 1889
            description = "This is a sample description that you can expand with detailed artwork information. The Starry Night depicts a swirling night sky over a village, painted from van Gogh's window at the asylum."
            medium = "Oil on canvas"
            dimensions = "73.7 cm × 92.1 cm (29 in × 36¼ in)"
            location = "Museum of Modern Art, New York"
            provenance = "Add provenance information here"
            curator_notes = @()
            created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            updated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
    }
    "washington_crossing" = @{
        path = "data/museums/met/washington_crossing.json"
        data = @{
            id = "washington_crossing"
            title = "Washington Crossing the Delaware"
            artist = "Emanuel Leutze"
            year = 1851
            description = "This is a sample description that you can expand with detailed artwork information. This iconic painting depicts George Washington's crossing of the Delaware River on December 25, 1776."
            medium = "Oil on canvas"
            dimensions = "378.5 cm × 647.7 cm (149 in × 255 in)"
            location = "Metropolitan Museum of Art, New York"
            provenance = "Add provenance information here"
            curator_notes = @()
            created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            updated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
    }
    "mona_lisa" = @{
        path = "data/museums/louvre/mona_lisa.json"
        data = @{
            id = "mona_lisa"
            title = "Mona Lisa"
            artist = "Leonardo da Vinci"
            year = 1506
            description = "This is a sample description that you can expand with detailed artwork information. The Mona Lisa is a portrait of Lisa Gherardini, known for her enigmatic smile."
            medium = "Oil on poplar panel"
            dimensions = "77 cm × 53 cm (30 in × 21 in)"
            location = "Louvre Museum, Paris"
            provenance = "Add provenance information here"
            curator_notes = @()
            created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            updated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
    }
}

# Create sample artwork files
foreach ($artwork in $artworks.GetEnumerator()) {
    $artworkJson = $artwork.Value.data | ConvertTo-Json -Depth 3
    $artworkJson | Out-File -FilePath $artwork.Value.path -Encoding UTF8
    Write-Host "Created: $($artwork.Value.path)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "RAG system setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm install" -ForegroundColor White
Write-Host "2. Update your artwork JSON files with detailed descriptions" -ForegroundColor White
Write-Host "3. Test the system with: npm run dev" -ForegroundColor White
Write-Host "4. Visit /admin/test-chat to test RAG functionality" -ForegroundColor White
Write-Host ""

# Create a sample curator note addition script
$curatorScript = @'
# scripts/add-curator-note.ps1 - Add curator notes to artworks

param(
    [Parameter(Mandatory=$true)]
    [string]$ArtworkId,
    
    [Parameter(Mandatory=$true)]
    [string]$Museum,
    
    [Parameter(Mandatory=$true)]
    [string]$Content,
    
    [Parameter(Mandatory=$true)]
    [string]$CuratorName,
    
    [string]$Type = "general"
)

$artworkPath = "data/museums/$Museum/$ArtworkId.json"

if (!(Test-Path $artworkPath)) {
    Write-Error "Artwork file not found: $artworkPath"
    exit 1
}

try {
    $artwork = Get-Content $artworkPath | ConvertFrom-Json
    
    $newNote = @{
        id = "note_$(Get-Date -Format 'yyyyMMddHHmmss')_$([System.Guid]::NewGuid().ToString().Substring(0,8))"
        content = $Content
        curator_name = $CuratorName
        created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        type = $Type
    }
    
    $artwork.curator_notes += $newNote
    $artwork.updated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    
    $artwork | ConvertTo-Json -Depth 4 | Out-File -FilePath $artworkPath -Encoding UTF8
    
    Write-Host "Successfully added curator note to $ArtworkId" -ForegroundColor Green
    Write-Host "Note ID: $($newNote.id)" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to add curator note: $($_.Exception.Message)"
    exit 1
}
'@

$curatorScript | Out-File -FilePath "scripts/add-curator-note.ps1" -Encoding UTF8
Write-Host "Created curator note utility: scripts/add-curator-note.ps1" -ForegroundColor Green