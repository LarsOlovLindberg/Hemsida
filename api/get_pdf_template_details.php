<?php
// Sätt på felrapportering i början för felsökning, men skicka inte ut det i svaret
ini_set('display_errors', 0); // Stäng av för output
error_reporting(E_ALL);

header('Content-Type: application/json');

// Funktion för att skicka ett JSON-fel och avsluta
function send_json_error_details($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ['error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    error_log("API Error in get_pdf_template_details.php: " . $message . " | Details: " . print_r($details, true));
    echo json_encode($response);
    exit;
}

require_once __DIR__ . '/db_connect.php';

$templateId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($templateId <= 0) {
    send_json_error_details(400, 'Ogiltigt mall-ID.');
}

try {
    $pdo = get_db_connection();
    
    // Hämta grundläggande mallinformation
    $stmt_info = $pdo->prepare("SELECT TemplateName, StoredFilename FROM PdfTemplates WHERE ID = ?");
    $stmt_info->execute([$templateId]);
    $templateInfo = $stmt_info->fetch(PDO::FETCH_ASSOC);

    if (!$templateInfo) {
        send_json_error_details(404, 'Mallen hittades inte.');
    }

    // Hämta alla kopplingar för denna mall
    $stmt_mappings = $pdo->prepare("SELECT PdfFieldName, DbColumnName FROM PdfFieldMappings WHERE TemplateID = ?");
    $stmt_mappings->execute([$templateId]);
    $mappings = $stmt_mappings->fetchAll(PDO::FETCH_ASSOC);

    // Skapa en relativ URL som JavaScript kan använda
    // Detta är mer robust än att försöka bygga en fullständig URL
    $templateInfo['fileUrl'] = 'pdf_templates/' . $templateInfo['StoredFilename'];

    echo json_encode([
        'templateInfo' => $templateInfo,
        'mappings' => $mappings ?: [] // Skicka alltid en array, även om den är tom
    ]);

} catch (Exception $e) {
    send_json_error_details(500, 'Databasfel vid hämtning av malldetaljer.', $e->getMessage());
}
?>