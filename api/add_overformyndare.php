<?php
// Fil: api/add_overformyndare.php
// Syfte: Skapar en ny överförmyndare i databasen.
// Version: Komplett och verifierad.

require_once('auth_check.php');
require_once('db_connect.php');

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Endast POST-metoden är tillåten.']);
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

    $sql = "INSERT INTO Overformyndare (Namn, Adress, Postnummer, Postort, Telefon, Epost) 
            VALUES (:Namn, :Adress, :Postnummer, :Postort, :Telefon, :Epost)";
    
    $stmt = $pdo->prepare($sql);
    
    $stmt->execute([
        ':Namn' => $data['Namn'],
        ':Adress' => $data['Adress'] ?? null,
        ':Postnummer' => $data['Postnummer'] ?? null,
        ':Postort' => $data['Postort'] ?? null,
        ':Telefon' => $data['Telefon'] ?? null,
        ':Epost' => $data['Epost'] ?? null
    ]);

    $new_id = $pdo->lastInsertId();

    http_response_code(201); // Created
    echo json_encode([
        'message' => 'Ny överförmyndare tillagd!',
        'id' => $new_id
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    if ($e->getCode() == 23000) { // Fångar unika nyckel-konflikter
        echo json_encode(['error' => 'Databasfel: En överförmyndare med detta namn finns troligen redan.']);
    } else {
        echo json_encode(['error' => 'Databasfel: ' . $e->getMessage()]);
    }
}
?>