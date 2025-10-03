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
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['text']) || !isset($data['categoryKey'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Nödvändig data (text, categoryKey) saknas.']);
    exit();
}

$transactionText = strtolower(trim($data['text']));
$categoryKey = $data['categoryKey'];

try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Använd INSERT OR REPLACE för att antingen skapa en ny eller uppdatera en befintlig
    // post där TransactionText är samma. Detta kräver att TransactionText är UNIQUE i din DB,
    // vilket den är enligt din databasstruktur.
    $sql = "INSERT OR REPLACE INTO LearnedCategories (TransactionText, CategoryKey) VALUES (:text, :key)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':text' => $transactionText,
        ':key' => $categoryKey
    ]);

    echo json_encode(['message' => 'Inlärd kategori sparad!']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel vid sparande av inlärd kategori: ' . $e->getMessage()]);
}
?>