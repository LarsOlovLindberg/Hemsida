<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json');

function send_get_docs_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ['error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    error_log("API Error in get_huvudman_dokument.php: " . $message . " | Details: " . print_r($details, true));
    echo json_encode($response);
    exit;
}

require_once __DIR__ . '/db_connect.php';

$pnr = isset($_GET['pnr']) ? $_GET['pnr'] : null;

if (!$pnr) {
    send_get_docs_error(400, 'Personnummer (pnr) krävs.');
}

try {
    $pdo = get_db_connection();
    $stmt = $pdo->prepare("SELECT ID, DokumentTyp, OriginalFilnamn, StoredPath, CreatedAt FROM HuvudmanDokument WHERE HuvudmanPnr = ? ORDER BY CreatedAt DESC");
    $stmt->execute([$pnr]);
    $dokument = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Skicka alltid ett giltigt JSON-svar, även om det är en tom array
    echo json_encode($dokument ?: []);

} catch (Exception $e) {
    send_get_docs_error(500, 'Databasfel vid hämtning av dokument.', $e->getMessage());
}
?>