<?php
require_once('auth_check.php');
header('Content-Type: application/json; charset=utf-8');
$db_path = '../huvudman_data.sqlite';

try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Hämta alla inlärda kategorier
    $stmt = $pdo->query('SELECT TransactionText, CategoryKey FROM LearnedCategories');
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Omvandla från en lista av objekt (som PHP ger) till det format som JS förväntar sig:
    // { "transaktionstext": "kategorinyckel", "en annan text": "annan nyckel" }
    $learned_map = [];
    foreach ($results as $row) {
        $learned_map[$row['TransactionText']] = $row['CategoryKey'];
    }
    
    echo json_encode($learned_map);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel vid hämtning av inlärda kategorier: ' . $e->getMessage()]);
}
?>