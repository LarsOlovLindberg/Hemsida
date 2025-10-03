<?php
// Fil: api/get_rules.php
// Syfte: Hämtar alla kategoriseringsregler.
// Version: Komplett och verifierad.

require_once('auth_check.php');
require_once('db_connect.php');

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = get_db_connection();
    // Hämtar alla kolumner från den bekräftade tabellstrukturen.
    $stmt = $pdo->query('SELECT ID, MatchningsTyp, MatchningsText, Kategori, Prioritet FROM Kategoriregler');
    $rules = $stmt->fetchAll();
    echo json_encode($rules);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fel vid hämtning av regler: ' . $e->getMessage()]);
}
?>