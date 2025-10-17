$root = 'c:\Users\lars-\OneDrive\Hemsida'
Set-Location $root

$destinationRoot = Join-Path $root 'backups\legacy_bak'

Get-ChildItem -Recurse -Filter '*.bak' | ForEach-Object {
    $relativePath = $_.FullName.Substring($root.Length + 1)
    $targetPath = Join-Path $destinationRoot $relativePath
    $targetDir = Split-Path $targetPath

    if ([string]::IsNullOrWhiteSpace($targetDir)) {
        $targetDir = $destinationRoot
    }

    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

    Move-Item -LiteralPath $_.FullName -Destination $targetPath -Force
}
