<?php
require_once('auth_check.php');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Endast DELETE-metoden är tillåten.']);
    exit();
}

$db_path = '../huvudman_data.sqlite';

// Hämta regel-ID från URL:en
$path_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$rule_id = (isset($path_parts[2]) && is_numeric($path_parts[2])) ? intval($path_parts[2]) : null;

if (!$rule_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Regel-ID saknas i URL:en.']);
    exit();
}

try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "DELETE FROM Kategoriregler WHERE ID = :ID";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':ID' => $rule_id]);

    // Kontrollera om någon rad faktiskt raderades
    if ($stmt->rowCount() > 0) {
        echo json_encode(['message' => 'Regel borttagen!']);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Ingen regel med det angivna ID:t hittades.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel vid borttagning av regel: ' . $e->getMessage()]);
}
?>