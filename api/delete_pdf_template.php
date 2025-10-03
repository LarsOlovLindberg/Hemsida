<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json');

function send_delete_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ['error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    error_log("API Error in delete_pdf_template.php: " . $message . " | Details: " . print_r($details, true));
    echo json_encode($response);
    exit;
}

require_once __DIR__ . '/db_connect.php';

// Hämta ID från URL:en
$templateId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($templateId <= 0) {
    send_delete_error(400, 'Ogiltigt mall-ID.');
}

try {
    $pdo = get_db_connection();
    $pdo->beginTransaction();

    // 1. Hämta filnamnet från databasen INNAN vi raderar posten
    $stmt_getfile = $pdo->prepare("SELECT StoredFilename FROM PdfTemplates WHERE ID = ?");
    $stmt_getfile->execute([$templateId]);
    $template = $stmt_getfile->fetch(PDO::FETCH_ASSOC);

    if (!$template) {
        // Om mallen inte finns i DB, avsluta snyggt.
        $pdo->rollBack();
        send_delete_error(404, 'Mallen hittades inte i databasen.');
    }

    $storedFilename = $template['StoredFilename'];

    // 2. Radera posten från databasen
    $stmt_delete = $pdo->prepare("DELETE FROM PdfTemplates WHERE ID = ?");
    $stmt_delete->execute([$templateId]);

    // 3. Radera den faktiska filen från servern
    $filePath = __DIR__ . '/../pdf_templates/' . $storedFilename;
    if (file_exists($filePath)) {
        if (!unlink($filePath)) {
            // Om filen inte kunde raderas, rulla tillbaka databasändringen!
            $pdo->rollBack();
            send_delete_error(500, 'Kunde inte radera mallfilen från servern. Databasändringen har återställts.');
        }
    } else {
        // Filen fanns inte, men vi fortsätter och raderar posten från DB ändå.
        error_log("Varning: Mallfilen " . $filePath . " fanns inte på servern, men posten raderades från databasen.");
    }

    // Om allt gick bra, genomför ändringarna
    $pdo->commit();

    echo json_encode(['message' => 'Mallen har raderats!']);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    send_delete_error(500, 'Databasfel vid radering av mall.', $e->getMessage());
}
?>