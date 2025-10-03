<?php
require_once('auth_check.php');
header('Content-Type: application/json; charset=utf-8');
$db_path = '../huvudman_data.sqlite';

try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Hämta alla kolumner från GodManProfiler-tabellen
    $stmt = $pdo->query('SELECT * FROM GodManProfiler');
    $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Skicka tillbaka resultatet
    echo json_encode($profiles);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel vid hämtning av profiler: ' . $e->getMessage()]);
}
?>