# FTP Upload Script för God Man Hemsida
# Laddar upp uppdaterade filer till godm.se

$ftpHost = "godm.se"
$ftpUser = "larslindberg.godm.se"
$ftpPass = "lars1914@@Filezilla@@@"

$filesToUpload = @(
    @{ Local = "c:\Users\lars-\OneDrive\Hemsida\index.php"; Remote = "/index.php" },
    @{ Local = "c:\Users\lars-\OneDrive\Hemsida\godman_logic.js"; Remote = "/godman_logic.js" },
    @{ Local = "c:\Users\lars-\OneDrive\Hemsida\FINAL_CLEANUP_REPORT.md"; Remote = "/FINAL_CLEANUP_REPORT.md" },
    @{ Local = "c:\Users\lars-\OneDrive\Hemsida\api\save_huvudman_details.php"; Remote = "/web/api/save_huvudman_details.php" },
    @{ Local = "c:\Users\lars-\OneDrive\Hemsida\api\debug_load_hovedman.php"; Remote = "/web/api/debug_load_hovedman.php" }
)

Write-Host "FTP Upload - God Man Hemsida"
Write-Host "Host: $ftpHost"
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($file in $filesToUpload) {
    try {
        if (-not (Test-Path $file.Local)) {
            Write-Host "ERROR: File not found: $($file.Local)"
            $failCount++
            continue
        }
        
        Write-Host "Uploading: $($file.Remote)" -ForegroundColor Green
        
        $ftpFullUri = "ftp://$ftpHost$($file.Remote)"
        $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpFullUri)
        $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftpRequest.UseBinary = $true
        $ftpRequest.UsePassive = $true
        
        $fileContent = [System.IO.File]::ReadAllBytes($file.Local)
        $ftpRequest.ContentLength = $fileContent.Length
        
        $requestStream = $ftpRequest.GetRequestStream()
        $requestStream.Write($fileContent, 0, $fileContent.Length)
        $requestStream.Close()
        
        $response = $ftpRequest.GetResponse()
        $response.Close()
        
        Write-Host "Success: $($file.Remote)" -ForegroundColor Green
        $successCount++
        
    } catch {
        Write-Host "ERROR: $($file.Remote) - $_" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Success: $successCount files"
Write-Host "Failed: $failCount files"
Write-Host "========================================"
