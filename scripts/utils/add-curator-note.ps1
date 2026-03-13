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
