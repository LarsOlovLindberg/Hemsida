<?php
require_once('auth_check.php');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Endast POST-metoden är tillåten.']);
    exit();
}

$db_path = '../huvudman_data.sqlite';

try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Radera alla rader från tabellen. TRUNCATE finns inte i SQLite, DELETE FROM är standard.
    $pdo->exec('DELETE FROM LearnedCategories');

    echo json_encode(['message' => 'Alla inlärda kategorier har rensats.']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel vid rensning av inlärda kategorier: ' . $e->getMessage()]);
}
?>