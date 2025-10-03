<?php
// Fil: api/create_huvudman.php
// Syfte: Skapar en ny huvudman i databasen.
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

// Validera att nödvändig data finns
if (!$data || empty($data['Personnummer']) || empty($data['Fornamn']) || empty($data['Efternamn'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Personnummer, Förnamn och Efternamn är obligatoriska.']);
    exit();
}

try {
    $pdo = get_db_connection();

    // Kontrollera om huvudmannen redan finns för att ge ett tydligare felmeddelande
    $stmt_check = $pdo->prepare("SELECT 1 FROM huvudman WHERE PERSONNUMMER = ?");
    $stmt_check->execute([$data['Personnummer']]);
    if ($stmt_check->fetch()) {
        http_response_code(409); // 409 Conflict
        echo json_encode(['error' => 'En huvudman med detta personnummer finns redan.']);
        exit();
    }

    $sql = "INSERT INTO huvudman (PERSONNUMMER, FORNAMN, EFTERNAMN, ADRESS, POSTNUMMER, ORT, OVERFORMYNDARE_ID) 
            VALUES (:pnr, :fornamn, :efternamn, :adress, :postnr, :ort, :of_id)";
    
    $stmt = $pdo->prepare($sql);
    
    $stmt->execute([
        ':pnr' => $data['Personnummer'],
        ':fornamn' => $data['Fornamn'],
        ':efternamn' => $data['Efternamn'],
        ':adress' => $data['Adress'] ?? null,
        ':postnr' => $data['Postnummer'] ?? null,
        ':ort' => $data['Ort'] ?? null,
        ':of_id' => empty($data['OverformyndareID']) ? null : $data['OverformyndareID']
    ]);

    // Skicka tillbaka den nyskapade huvudmannen så JS kan välja den i listan
    http_response_code(201); // 201 Created är mer korrekt än 200 OK
    echo json_encode([
        'message' => 'Ny huvudman tillagd!',
        'huvudman' => [
            'Personnummer' => $data['Personnummer'],
            'Fornamn' => $data['Fornamn'],
            'Efternamn' => $data['Efternamn']
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel vid skapande av huvudman.', 'message' => $e->getMessage()]);
}
?>