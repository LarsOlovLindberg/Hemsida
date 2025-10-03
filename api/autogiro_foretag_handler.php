<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json');

require_once __DIR__ . '/db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = get_db_connection();

    switch ($method) {
        case 'GET':
            // Hämta alla företag
            $stmt = $pdo->query("SELECT * FROM AutogiroForetag ORDER BY Foretagsnamn ASC");
            $foretag = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($foretag ?: []);
            break;

        case 'POST':
            // Spara ett nytt företag
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['Foretagsnamn'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Företagsnamn är obligatoriskt.']);
                exit;
            }

            $sql = "INSERT INTO AutogiroForetag (Foretagsnamn, Bankgiro, Plusgiro, MottagarID, Noteringar) VALUES (?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['Foretagsnamn'],
                $data['Bankgiro'] ?? null,
                $data['Plusgiro'] ?? null,
                $data['MottagarID'] ?? null,
                $data['Noteringar'] ?? null
            ]);
            
            $newId = $pdo->lastInsertId();
            http_response_code(201);
            echo json_encode(['message' => 'Företag sparat!', 'id' => $newId]);
            break;

        case 'DELETE':
            // Radera ett företag
            $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Giltigt ID krävs för att radera.']);
                exit;
            }
            $stmt = $pdo->prepare("DELETE FROM AutogiroForetag WHERE ID = ?");
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['message' => 'Företaget har raderats.']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Företaget hittades inte.']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Metod ej tillåten.']);
            break;
    }

} catch (PDOException $e) {
    http_response_code(500);
    // Om det är ett unikt-villkor-fel
    if ($e->getCode() == 23000 || $e->getCode() == 19) {
         echo json_encode(['error' => 'Ett företag med detta namn finns redan.']);
    } else {
         echo json_encode(['error' => 'Databasfel: ' . $e->getMessage()]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Serverfel: ' . $e->getMessage()]);
}
?>