<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json');

function send_upload_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ['error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    error_log("API Error in upload_huvudman_dokument.php: " . $message . " | Details: " . print_r($details, true));
    echo json_encode($response);
    exit;
}

require_once __DIR__ . '/db_connect.php';

// Hämta data från POST-requesten
$pnr = isset($_POST['pnr']) ? trim($_POST['pnr']) : '';
$dokumentTyp = isset($_POST['dokumentTyp']) ? trim($_POST['dokumentTyp']) : '';

if (empty($pnr) || empty($dokumentTyp)) {
    send_upload_error(400, 'Personnummer och dokumenttyp får inte vara tomma.');
}

// Validera personnummer-formatet för att undvika osäkra mappnamn
if (!preg_match('/^[0-9-]+$/', $pnr)) {
    send_upload_error(400, 'Ogiltigt format på personnummer.');
}
$safe_pnr_foldername = str_replace('-', '', $pnr); // Ta bort bindestreck för mappnamnet

// Kontrollera filuppladdning
if (!isset($_FILES['arkivFil']) || $_FILES['arkivFil']['error'] !== UPLOAD_ERR_OK) {
    send_upload_error(400, 'Fel vid filuppladdning. Kontrollera filstorlek och serverinställningar.');
}

$file = $_FILES['arkivFil'];
$originalFilename = basename($file['name']);
$fileExtension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));

if ($fileExtension !== 'pdf') {
    send_upload_error(400, 'Endast PDF-filer är tillåtna.');
}

// Skapa sökvägar
$base_upload_dir = __DIR__ . '/../dokument_arkiv/';
$huvudman_dir = $base_upload_dir . $safe_pnr_foldername . '/';
$storedFilename = uniqid(date('Y-m-d_H-i-s_'), true) . '.pdf';
$destination = $huvudman_dir . $storedFilename;

// Skapa huvudmannens mapp om den inte finns
if (!is_dir($huvudman_dir)) {
    if (!mkdir($huvudman_dir, 0775, true)) {
        send_upload_error(500, 'Kunde inte skapa mapp för huvudman på servern.');
    }
}

// Flytta filen
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    send_upload_error(500, 'Kunde inte spara den uppladdade filen.');
}

// Spara i databasen
try {
    $pdo = get_db_connection();
    $stmt = $pdo->prepare(
        "INSERT INTO HuvudmanDokument (HuvudmanPnr, DokumentTyp, OriginalFilnamn, StoredFilnamn, StoredPath) VALUES (?, ?, ?, ?, ?)"
    );
    // StoredPath är relativ från webbrot, inte från api-mappen
    $relativePath = 'dokument_arkiv/' . $safe_pnr_foldername . '/' . $storedFilename;
    $stmt->execute([$pnr, $dokumentTyp, $originalFilename, $storedFilename, $relativePath]);

    http_response_code(201);
    echo json_encode(['message' => 'Dokumentet har laddats upp och sparats!']);

} catch (Exception $e) {
    if (file_exists($destination)) {
        unlink($destination);
    }
    send_upload_error(500, 'Databasfel vid sparande av dokumentinformation.', $e->getMessage());
}
?>