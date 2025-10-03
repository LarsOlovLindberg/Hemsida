<?php
require_once('auth_check.php');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$db_path = '../huvudman_data.sqlite';
$data = json_decode(file_get_contents('php://input'), true);

// Hämta profil-ID från URL:en om det finns (för PUT)
$profile_id = basename($_SERVER['REQUEST_URI']);

try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Om IsCurrentUser är satt till 1, måste vi först nollställa alla andra
    if (isset($data['IsCurrentUser']) && $data['IsCurrentUser'] == 1) {
        $pdo->exec("UPDATE GodManProfiler SET IsCurrentUser = 0");
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT' && is_numeric($profile_id)) {
        // ----- UPPDATERA BEFINTLIG PROFIL -----
        $sql = "UPDATE GodManProfiler SET 
                    Fornamn = :Fornamn, Efternamn = :Efternamn, Personnummer = :Personnummer, Adress = :Adress, 
                    Postnummer = :Postnummer, Postort = :Postort, Telefon = :Telefon, Mobil = :Mobil, 
                    Epost = :Epost, IsCurrentUser = :IsCurrentUser, Clearingnummer = :Clearingnummer, 
                    Kontonummer = :Kontonummer
                WHERE ID = :ID";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':Fornamn' => $data['Fornamn'] ?? null,
            ':Efternamn' => $data['Efternamn'] ?? null,
            ':Personnummer' => $data['Personnummer'] ?? null,
            ':Adress' => $data['Adress'] ?? null,
            ':Postnummer' => $data['Postnummer'] ?? null,
            ':Postort' => $data['Postort'] ?? null,
            ':Telefon' => $data['Telefon'] ?? null,
            ':Mobil' => $data['Mobil'] ?? null,
            ':Epost' => $data['Epost'] ?? null,
            ':IsCurrentUser' => $data['IsCurrentUser'] ?? 0,
            ':Clearingnummer' => $data['Clearingnummer'] ?? null,
            ':Kontonummer' => $data['Kontonummer'] ?? null,
            ':ID' => $profile_id
        ]);
        echo json_encode(['message' => 'Profil uppdaterad!', 'id' => $profile_id]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // ----- SKAPA NY PROFIL -----
        $sql = "INSERT INTO GodManProfiler 
                    (Fornamn, Efternamn, Personnummer, Adress, Postnummer, Postort, Telefon, Mobil, Epost, IsCurrentUser, Clearingnummer, Kontonummer) 
                VALUES 
                    (:Fornamn, :Efternamn, :Personnummer, :Adress, :Postnummer, :Postort, :Telefon, :Mobil, :Epost, :IsCurrentUser, :Clearingnummer, :Kontonummer)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':Fornamn' => $data['Fornamn'] ?? null,
            ':Efternamn' => $data['Efternamn'] ?? null,
            ':Personnummer' => $data['Personnummer'] ?? null,
            ':Adress' => $data['Adress'] ?? null,
            ':Postnummer' => $data['Postnummer'] ?? null,
            ':Postort' => $data['Postort'] ?? null,
            ':Telefon' => $data['Telefon'] ?? null,
            ':Mobil' => $data['Mobil'] ?? null,
            ':Epost' => $data['Epost'] ?? null,
            ':IsCurrentUser' => $data['IsCurrentUser'] ?? 0,
            ':Clearingnummer' => $data['Clearingnummer'] ?? null,
            ':Kontonummer' => $data['Kontonummer'] ?? null
        ]);
        $newId = $pdo->lastInsertId();
        echo json_encode(['message' => 'Ny profil skapad!', 'id' => $newId]);

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Metod ej tillåten. Använd POST för ny, PUT för att uppdatera.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    // Om det är ett UNIQUE constraint-fel (t.ex. dubblett på personnummer)
    if ($e->getCode() == 23000) { 
        echo json_encode(['error' => 'Kunde inte spara profilen. Personnumret finns troligen redan.']);
    } else {
        echo json_encode(['error' => 'Databasfel vid sparande av profil: ' . $e->getMessage()]);
    }
}
?>