<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json');

function send_delete_doc_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ['error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    error_log("API Error in delete_huvudman_dokument.php: " . $message . " | Details: " . print_r($details, true));
    echo json_encode($response);
    exit;
}

require_once __DIR__ . '/db_connect.php';

$docId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($docId <= 0) {
    send_delete_doc_error(400, 'Ogiltigt dokument-ID.');
}

try {
    $pdo = get_db_connection();
    $pdo->beginTransaction();

    // 1. Hämta sökvägen till filen från databasen
    $stmt_getfile = $pdo->prepare("SELECT StoredPath FROM HuvudmanDokument WHERE ID = ?");
    $stmt_getfile->execute([$docId]);
    $document = $stmt_getfile->fetch(PDO::FETCH_ASSOC);

    if (!$document) {
        $pdo->rollBack();
        send_delete_doc_error(404, 'Dokumentet hittades inte i databasen.');
    }

    $relativePath = $document['StoredPath'];

    // 2. Radera posten från databasen
    $stmt_delete = $pdo->prepare("DELETE FROM HuvudmanDokument WHERE ID = ?");
    $stmt_delete->execute([$docId]);

    // 3. Radera den faktiska filen från servern
    $filePath = __DIR__ . '/../' . $relativePath; // Bygg absolut sökväg från skriptets plats
    if (file_exists($filePath)) {
        if (!unlink($filePath)) {
            $pdo->rollBack();
            send_delete_doc_error(500, 'Kunde inte radera dokumentfilen från servern. Databasändringen har återställts.');
        }
    } else {
        error_log("Varning: Dokumentfilen " . $filePath . " fanns inte på servern, men posten raderades från databasen.");
    }

    $pdo->commit();

    echo json_encode(['message' => 'Dokumentet har raderats!']);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    send_delete_doc_error(500, 'Databasfel vid radering av dokument.', $e->getMessage());
}
?>