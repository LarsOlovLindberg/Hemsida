<?php
// Sätt på felrapportering i början för felsökning, men skicka inte ut det i svaret
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Funktion för att skicka ett JSON-fel och avsluta
function send_generator_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ['error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    error_log("API Error in generate_pdf.php: " . $message . " | Details: " . print_r($details, true));
    echo json_encode($response);
    exit;
}

require_once __DIR__ . '/db_connect.php';

$pnr = isset($_GET['pnr']) ? $_GET['pnr'] : null;
$templateId = isset($_GET['templateId']) ? intval($_GET['templateId']) : 0;

if (!$pnr || $templateId <= 0) {
    send_generator_error(400, 'Personnummer och mall-ID krävs.');
}

try {
    $pdo = get_db_connection();
    $response_data = [
        'huvudman' => null,
        'godman' => null,
        'overformyndare' => null,
        'mappings' => [],
        'templateFileUrl' => ''
    ];

    // 1. Hämta huvudman-data (alla kolumner)
    $stmt_hm = $pdo->prepare("SELECT * FROM huvudman WHERE PERSONNUMMER = ?");
    $stmt_hm->execute([$pnr]);
    $response_data['huvudman'] = $stmt_hm->fetch(PDO::FETCH_ASSOC);
    if (!$response_data['huvudman']) {
        send_generator_error(404, 'Huvudman hittades inte.');
    }

    // 2. Hämta aktiv God Man-profil
    $stmt_gm = $pdo->query("SELECT * FROM GodManProfiler WHERE IsCurrentUser = 1 LIMIT 1");
    $response_data['godman'] = $stmt_gm->fetch(PDO::FETCH_ASSOC);

    // 3. Hämta Överförmyndare-data (om kopplad till huvudman)
    if (!empty($response_data['huvudman']['OverformyndareID'])) {
        $stmt_of = $pdo->prepare("SELECT * FROM Overformyndare WHERE ID = ?");
        $stmt_of->execute([$response_data['huvudman']['OverformyndareID']]);
        $response_data['overformyndare'] = $stmt_of->fetch(PDO::FETCH_ASSOC);
    }

    // 4. Hämta mallens fil-URL och kopplingar
    $stmt_template = $pdo->prepare("SELECT StoredFilename FROM PdfTemplates WHERE ID = ?");
    $stmt_template->execute([$templateId]);
    $template = $stmt_template->fetch(PDO::FETCH_ASSOC);
    if (!$template) {
        send_generator_error(404, 'PDF-mall hittades inte.');
    }
    // Skapa en relativ URL som JavaScript kan använda
    $response_data['templateFileUrl'] = 'pdf_templates/' . $template['StoredFilename'];

    $stmt_mappings = $pdo->prepare("SELECT PdfFieldName, DbColumnName FROM PdfFieldMappings WHERE TemplateID = ?");
    $stmt_mappings->execute([$templateId]);
    $response_data['mappings'] = $stmt_mappings->fetchAll(PDO::FETCH_ASSOC);

    // ------------------------------------------------------------
    // Sätt standardvärden för manuella fält som saknar data
    // ------------------------------------------------------------
    // Om 'manual_datum' inte har satts tidigare – sätt dagens datum (YYYY-MM-DD)
    if (!isset($response_data['manual_datum']) || $response_data['manual_datum'] === '') {
        $response_data['manual_datum'] = date('Y-m-d');
    }

    echo json_encode($response_data);

} catch (Exception $e) {
    send_generator_error(500, 'Serverfel vid hämtning av data för PDF-generering.', $e->getMessage());
}
?>
