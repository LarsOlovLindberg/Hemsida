param(
    [switch]$WhatIf
)

$root = 'c:\Users\lars-\OneDrive\Hemsida'
Set-Location $root
$logFile = Join-Path $root 'cleanup_log.txt'
"$(Get-Date -Format 'u') Startar städskript" | Out-File -FilePath $logFile -Encoding UTF8

function Invoke-Action {
    param(
        [string]$Description,
        [scriptblock]$Action
    )

    Write-Host "- $Description"
    "$(Get-Date -Format 'u') $Description" | Out-File -FilePath $logFile -Append -Encoding UTF8
    if ($WhatIf) {
        Write-Host "  (WhatIf)" -ForegroundColor Yellow
        "$(Get-Date -Format 'u')   Åtgärd hoppades pga WhatIf" | Out-File -FilePath $logFile -Append -Encoding UTF8
        return
    }

    & $Action
}

Invoke-Action -Description "Ta bort alla *.bak-filer" -Action {
    $bakFiles = Get-ChildItem -Recurse -Filter '*.bak'
    $count = $bakFiles.Count
    if ($count -gt 0) {
        $bakFiles | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host "  Borttagna filer:" $count
        "$(Get-Date -Format 'u')   Borttagna .bak: $count" | Out-File -FilePath $logFile -Append -Encoding UTF8
    } else {
        Write-Host "  Inga *.bak-filer hittades."
        "$(Get-Date -Format 'u')   Inga .bak-filer hittades" | Out-File -FilePath $logFile -Append -Encoding UTF8
    }
}

Invoke-Action -Description "Flytta databas-backuper till backups\\databases" -Action {
    $dbDest = Join-Path $root 'backups/databases'
    New-Item -ItemType Directory -Path $dbDest -Force | Out-Null
    $dbFiles = @(
        'backup_huvudman_data.sqlite',
        'backup_2_huvudman_data.sqlite',
        'din_databas.db',
        'huvudman_data.sqlite.sql',
        'huvudman_data.sqbpro'
    )
    $moved = 0
    foreach ($file in $dbFiles) {
        if (Test-Path $file) {
            Move-Item -LiteralPath $file -Destination (Join-Path $dbDest $file) -Force
            $moved++
        }
    }
    Write-Host "  Flyttade filer:" $moved
    "$(Get-Date -Format 'u')   Flyttade DB-filer: $moved" | Out-File -FilePath $logFile -Append -Encoding UTF8
}

Invoke-Action -Description "Ta bort dubbletter av PDF-mallar i roten" -Action {
    $pdfsToRemove = @(
        'Ansokan_Jarfalla.pdf',
        'Ansokan_Sigtuna.pdf',
        'Ansokan_Solna.pdf',
        'Ansokan_Stockholm.pdf',
        'Ansokan_Upplands_Vasby.pdf',
        'bg-autogiro-medgivandeblankett-till-kontonummer.pdf',
        'Fardtjanst_Autogiro.pdf',
        'flyttanmalan.pdf',
        'Flyttning inom Sverige Anmälan.pdf',
        'Forenklad_arbetsgivardeklaration_mall_fungerar.pdf',
        'forteckning_mall.pdf',
        'Svea_Bank _Apotekstjänst_Autogiro_Mall.pdf',
        'Walley_Apoteket_Autogiro_Mall.pdf'
    )

    $removed = 0
    foreach ($pdf in $pdfsToRemove) {
        if (Test-Path $pdf) {
            Remove-Item -LiteralPath $pdf -Force
            $removed++
        }
    }
    Write-Host "  Borttagna PDF: $removed"
    "$(Get-Date -Format 'u')   Borttagna PDF: $removed" | Out-File -FilePath $logFile -Append -Encoding UTF8
}

Invoke-Action -Description "Ta bort godman_logic.zip" -Action {
    if (Test-Path 'godman_logic.zip') {
        Remove-Item -LiteralPath 'godman_logic.zip' -Force
        Write-Host "  Tog bort godman_logic.zip"
        "$(Get-Date -Format 'u')   Tog bort godman_logic.zip" | Out-File -FilePath $logFile -Append -Encoding UTF8
    } else {
        Write-Host "  godman_logic.zip fanns inte"
        "$(Get-Date -Format 'u')   godman_logic.zip saknades" | Out-File -FilePath $logFile -Append -Encoding UTF8
    }
}

Invoke-Action -Description "Skapa docs-mapp och flytta rapporter" -Action {
    $docsDir = Join-Path $root 'docs'
    New-Item -ItemType Directory -Path $docsDir -Force | Out-Null
    $movedDocs = Get-ChildItem -Path $root -Filter '*.md' |
        Where-Object { $_.Name -match '^(FINAL|DEBUG|NUMBER|FIELD|FIXES|SOLUTION|TECHNICAL|CACHE|CHECKLIST|PDF|SWEDISH|NUMERIC)' }

    foreach ($doc in $movedDocs) {
        Move-Item -LiteralPath $doc.FullName -Destination (Join-Path $docsDir $doc.Name) -Force
    }
    Write-Host "  Flyttade rapporter:" $movedDocs.Count
    "$(Get-Date -Format 'u')   Flyttade rapporter: $($movedDocs.Count)" | Out-File -FilePath $logFile -Append -Encoding UTF8
}

Write-Host "Städningen är klar." -ForegroundColor Green
"$(Get-Date -Format 'u') Städningen är klar" | Out-File -FilePath $logFile -Append -Encoding UTF8
