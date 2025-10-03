<?php
// Fil: api/update_overformyndare.php
// Syfte: Uppdaterar en befintlig överförmyndare.

require_once('auth_check.php');
require_once('db_connect.php');

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Endast PUT-metoden är tillåten.']);
    exit();
}

$id = $_GET['id'] ?? null;
if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID för överförmyndare saknas.']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || empty($data['Namn'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Namn på enheten är obligatoriskt.']);
    exit();
}

try {
    $pdo = get_db_connection();

    $sql = "UPDATE Overformyndare SET 
                Namn = :Namn, 
                Adress = :Adress, 
                Postnummer = :Postnummer, 
                Postort = :Postort, 
                Telefon = :Telefon, 
                Epost = :Epost 
            WHERE ID = :ID";
    
    $stmt = $pdo->prepare($sql);
    
    $stmt->execute([
        ':Namn' => $data['Namn'],
        ':Adress' => $data['Adress'] ?? null,
        ':Postnummer' => $data['Postnummer'] ?? null,
        ':Postort' => $data['Postort'] ?? null,
        ':Telefon' => $data['Telefon'] ?? null,
        ':Epost' => $data['Epost'] ?? null,
        ':ID' => $id
    ]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Ingen överförmyndare med det angivna ID:t hittades.']);
        exit();
    }

    echo json_encode([
        'message' => 'Överförmyndare uppdaterad!',
        'id' => $id
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel vid uppdatering.', 'message' => $e->getMessage()]);
}
?>