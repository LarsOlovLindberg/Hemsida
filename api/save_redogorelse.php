<?php
// Fil: api/save_redogorelse.php
// Syfte: Sparar eller uppdaterar en redogörelse.
// Version: 3.0 - Dynamisk och felsäker.

require_once('auth_check.php');
require_once('db_connect.php');

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$pnr = $_GET['pnr'] ?? null;
$ar = isset($_GET['ar']) ? intval($_GET['ar']) : null;

if (!$pnr || !$ar) {
    http_response_code(400);
    echo json_encode(['error' => 'Personnummer (pnr) och år (ar) måste anges.']);
    exit();
}

$data_from_js = json_decode(file_get_contents('php://input'), true);
if (!$data_from_js) {
    http_response_code(400);
    echo json_encode(['error' => 'Ingen giltig data mottogs.']);
    exit();
}

$pdo = get_db_connection();

try {
    // 1. Hämta de faktiska kolumnnamnen från databasen för att vara 100% säker.
    $stmt_cols = $pdo->query("PRAGMA table_info(HuvudmanRedogorelse)");
    $db_columns_info = $stmt_cols->fetchAll(PDO::FETCH_ASSOC);
    
    $columns_for_sql = [];
    $placeholders_for_sql = [];
    $values_to_bind = [];

    // 2. Loopa igenom de faktiska DB-kolumnerna
    foreach ($db_columns_info as $column_info) {
        $col_name = $column_info['name'];

        // Hoppa över primärnyckeln ID
        if ($col_name === 'ID') {
            continue;
        }

        $columns_for_sql[] = $col_name;
        $placeholders_for_sql[] = "?";

        // Hitta motsvarande värde från JS-datan
        if ($col_name === 'HuvudmanPnr') {
            $values_to_bind[] = $pnr;
        } elseif ($col_name === 'ArsrakningAr') {
            $values_to_bind[] = $ar;
        } else {
            $value = $data_from_js[$col_name] ?? null;
            if (is_bool($value)) {
                $values_to_bind[] = $value ? 1 : 0;
            } else {
                $values_to_bind[] = ($value === '') ? null : $value;
            }
        }
    }

    $col_names_string = implode(', ', $columns_for_sql);
    $placeholders_string = implode(', ', $placeholders_for_sql);

    // 3. Bygg och kör den säkra SQL-frågan
    $sql = "INSERT OR REPLACE INTO HuvudmanRedogorelse ($col_names_string) VALUES ($placeholders_string)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values_to_bind);

    echo json_encode(['message' => 'Redogörelse sparad!']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasfel vid sparande av redogörelse.', 'message' => $e->getMessage()]);
}
?>