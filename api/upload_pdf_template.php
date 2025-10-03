<?php
// Sätt på felrapportering i början för felsökning
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Sätt headern FÖRST för att säkerställa att svaret alltid är JSON
header('Content-Type: application/json');

// Inkludera anslutningen EFTER felrapportering, med en robust sökväg
require_once __DIR__ . '/db_connect.php';

// Funktion för att skicka ett JSON-fel och avsluta
function send_json_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ['error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    echo json_encode($response);
    exit;
}

// Definiera sökvägen där mallarna ska sparas
$upload_dir = __DIR__ . '/../pdf_templates/';

// Kontrollera om mappen finns
if (!is_dir($upload_dir)) {
    // Försök skapa mappen
    if (!mkdir($upload_dir, 0775, true)) { // Använd 0775 som en säkrare standard
        send_json_error(500, 'Serverkonfigurationsfel.', 'Mappen för mallar existerar inte och kunde inte skapas.');
    }
}

// Kontrollera om mappen är skrivbar
if (!is_writable($upload_dir)) {
    send_json_error(500, 'Serverkonfigurationsfel.', 'Mappen för mallar är inte skrivbar. Kontrollera rättigheterna (prova 775 eller 777).');
}

// Kontrollera att en fil har laddats upp
if (!isset($_FILES['templateFile']) || $_FILES['templateFile']['error'] !== UPLOAD_ERR_OK) {
    $phpFileUploadErrors = [
        0 => 'There is no error, the file uploaded with success',
        1 => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
        2 => 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form',
        3 => 'The uploaded file was only partially uploaded',
        4 => 'No file was uploaded',
        6 => 'Missing a temporary folder',
        7 => 'Failed to write file to disk.',
        8 => 'A PHP extension stopped the file upload.',
    ];
    $errorCode = isset($_FILES['templateFile']['error']) ? $_FILES['templateFile']['error'] : 4;
    $errorMessage = isset($phpFileUploadErrors[$errorCode]) ? $phpFileUploadErrors[$errorCode] : 'Unknown upload error';
    send_json_error(400, 'Fel vid filuppladdning.', $errorMessage);
}

// Hämta information från POST-datan
$templateName = isset($_POST['templateName']) ? trim($_POST['templateName']) : '';
// Säkerställ att strängen hanteras som UTF-8
$templateName = mb_convert_encoding($templateName, 'UTF-8', 'UTF-8');
if (empty($templateName)) {
    send_json_error(400, 'Mallens namn får inte vara tomt.');
}

$file = $_FILES['templateFile'];
$originalFilename = basename($file['name']);
$originalFilename = mb_convert_encoding($originalFilename, 'UTF-8', 'UTF-8');

$fileExtension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));

// Säkerhetskontroll: tillåt endast PDF-filer
if ($fileExtension !== 'pdf') {
    send_json_error(400, 'Endast PDF-filer är tillåtna.');
}

// Skapa ett unikt, säkert filnamn för att undvika konflikter
$storedFilename = uniqid('template_', true) . '.pdf';
$destination = $upload_dir . $storedFilename;

// Försök att flytta den uppladdade filen
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    send_json_error(500, 'Kunde inte spara den uppladdade filen på servern.', 'move_uploaded_file misslyckades.');
}

// Spara informationen i databasen
try {
    // KORRIGERAT FUNKTIONSANROP HÄR:
    $pdo = get_db_connection(); 
    
    // Kontrollera om namnet redan finns
    $stmt_check = $pdo->prepare("SELECT ID FROM PdfTemplates WHERE TemplateName = ?");
    $stmt_check->execute([$templateName]);
    if ($stmt_check->fetch()) {
        unlink($destination); // Radera den nyss uppladdade filen
        send_json_error(409, 'En mall med detta namn finns redan.');
    }

    $stmt = $pdo->prepare(
        "INSERT INTO PdfTemplates (TemplateName, OriginalFilename, StoredFilename) VALUES (?, ?, ?)"
    );
    $stmt->execute([$templateName, $originalFilename, $storedFilename]);
    
    $newTemplateId = $pdo->lastInsertId();

    http_response_code(201); // 201 Created
    echo json_encode([
        'message' => 'Mall uppladdad och sparad!',
        'templateId' => $newTemplateId,
        'templateName' => $templateName
    ]);

} catch (Exception $e) {
    if (file_exists($destination)) {
        unlink($destination);
    }
    send_json_error(500, 'Databasfel.', $e->getMessage());
}
?>