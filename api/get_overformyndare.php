<?php
require_once('auth_check.php');
header('Content-Type: application/json; charset=utf-8');
$db_path = '../huvudman_data.sqlite';

try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query('SELECT * FROM Overformyndare ORDER BY Namn');
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($data);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel: ' . $e->getMessage()]);
}
?>