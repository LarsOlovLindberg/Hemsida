<?php
// Sätt på felrapportering för felsökning
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Sätt header FÖRST
header('Content-Type: application/json');

// Inkludera anslutningen med robust sökväg
require_once __DIR__ . '/db_connect.php';

// Funktion för att skicka ett JSON-fel och avsluta
function send_json_error_mapping($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ['error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    echo json_encode($response);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

// Kontrollera om JSON-avkodningen lyckades
if (json_last_error() !== JSON_ERROR_NONE) {
    send_json_error_mapping(400, 'Ogiltig JSON-data skickades från klienten.', json_last_error_msg());
}

$templateId = isset($data['templateId']) ? intval($data['templateId']) : 0;
$mappings = isset($data['mappings']) && is_array($data['mappings']) ? $data['mappings'] : [];

if ($templateId <= 0) { // Vi tillåter tomma mappings, men inte ogiltigt ID
    send_json_error_mapping(400, 'Ogiltig data. Ett giltigt Template ID krävs.');
}

try {
    // Använd det korrekta funktionsnamnet
    $pdo = get_db_connection();
    $pdo->beginTransaction();

    // 1. Radera alla befintliga kopplingar för denna mall för att undvika dubbletter
    $stmt_delete = $pdo->prepare("DELETE FROM PdfFieldMappings WHERE TemplateID = ?");
    $stmt_delete->execute([$templateId]);

    // 2. Infoga de nya kopplingarna (om några finns)
    if (!empty($mappings)) {
        $stmt_insert = $pdo->prepare(
            "INSERT INTO PdfFieldMappings (TemplateID, PdfFieldName, DbColumnName) VALUES (?, ?, ?)"
        );

        foreach ($mappings as $mapping) {
            $pdfField = isset($mapping['pdfField']) ? trim($mapping['pdfField']) : null;
            $dbColumn = isset($mapping['dbColumn']) ? trim($mapping['dbColumn']) : null;

            // Infoga endast om både PDF-fält och DB-kolumn har ett värde
            if ($pdfField && $dbColumn) {
                $stmt_insert->execute([$templateId, $pdfField, $dbColumn]);
            }
        }
    }

    $pdo->commit();

    echo json_encode(['message' => 'Kopplingar har sparats!']);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    send_json_error_mapping(500, 'Databasfel vid sparande av kopplingar.', $e->getMessage());
}
?>