<?php
// Sätt på felrapportering i början för felsökning, men skicka inte ut det i svaret
ini_set('display_errors', 0); // Stäng av för output
error_reporting(E_ALL);

// Sätt headern FÖRST för att säkerställa att svaret alltid är JSON
header('Content-Type: application/json');

// Funktion för att skicka ett JSON-fel och avsluta
function send_json_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ['error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    // Logga felet till serverns fellogg istället för att skriva ut det
    error_log("API Error in get_pdf_templates.php: " . $message . " | Details: " . print_r($details, true));
    echo json_encode($response);
    exit;
}

// Inkludera anslutningen med en robust sökväg
require_once __DIR__ . '/db_connect.php';

try {
    $pdo = get_db_connection(); // Använd den nya, korrekta funktionen
    $stmt = $pdo->query("SELECT ID, TemplateName, OriginalFilename, CreatedAt FROM PdfTemplates ORDER BY TemplateName ASC");
    $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Skicka alltid ett giltigt JSON-svar, även om det är en tom array
    echo json_encode($templates ?: []);

} catch (Exception $e) {
    send_json_error(500, 'Databasfel vid hämtning av mallar.', $e->getMessage());
}
?>