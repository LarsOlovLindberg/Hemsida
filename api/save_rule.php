<?php
// Fil: api/save_rule.php
// Syfte: Skapar (POST) eller uppdaterar (PUT) en regel.
// Version: Komplett och verifierad.

require_once('auth_check.php');
require_once('db_connect.php');

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

if ($method !== 'POST' && $method !== 'PUT') {
    http_response_code(405);
    exit;
}

if (empty($data['MatchningsTyp']) || empty($data['MatchningsText']) || empty($data['Kategori'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Alla fält måste fyllas i.']);
    exit;
}

$pdo = get_db_connection();

try {
    $params = [
        ':MatchningsTyp' => $data['MatchningsTyp'],
        ':MatchningsText' => $data['MatchningsText'],
        ':Kategori' => $data['Kategori'],
        ':Prioritet' => $data['Prioritet'] ?? 0
    ];

    if ($method === 'POST') {
        $sql = "INSERT INTO Kategoriregler (MatchningsTyp, MatchningsText, Kategori, Prioritet) VALUES (:MatchningsTyp, :MatchningsText, :Kategori, :Prioritet)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['message' => 'Regel skapad!', 'id' => $pdo->lastInsertId()]);

    } elseif ($method === 'PUT') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID saknas för uppdatering.']);
            exit;
        }
        $params[':ID'] = $id;
        $sql = "UPDATE Kategoriregler SET MatchningsTyp = :MatchningsTyp, MatchningsText = :MatchningsText, Kategori = :Kategori, Prioritet = :Prioritet WHERE ID = :ID";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['message' => 'Regel uppdaterad!', 'id' => $id]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel.', 'message' => $e->getMessage()]);
}
?>