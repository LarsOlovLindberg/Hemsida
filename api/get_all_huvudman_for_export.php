<?php
// api/get_all_huvudman_for_export.php
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/db_connect.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = get_db_connection();

    // Hämta alla huvudmän med de viktigaste kolumnerna
    // Anpassa SELECT-satsen om du vill ha med fler kolumner
    $stmt = $pdo->query("
        SELECT 
            PERSONNUMMER, 
            HELT_NAMN,
            ADRESS,
            POSTNUMMER,
            ORT,
            TELEFON,
            MOBIL,
            EPOST
        FROM huvudman
        ORDER BY HELT_NAMN COLLATE NOCASE ASC
    ");

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($results, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel vid export: ' . $e->getMessage()]);
}
?>