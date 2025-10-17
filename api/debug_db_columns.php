<?php
// debug_db_columns.php - Visar alla kolumner i huvudman-tabellen

require_once('auth_check.php');
require_once('db_connect.php');

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = get_db_connection();
    
    // Hämta en rad från huvudman för att se kolumnnamnen
    $stmt = $pdo->query("SELECT * FROM huvudman LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$row) {
        echo json_encode(['error' => 'Ingen huvudman funnen']);
        exit;
    }
    
    $columns = array_keys($row);
    sort($columns);
    
    echo json_encode([
        'success' => true,
        'columns_count' => count($columns),
        'columns' => $columns,
        'boende_related' => array_filter($columns, function($col) {
            return stripos($col, 'bostad') !== false || stripos($col, 'boende') !== false || 
                   stripos($col, 'sysselsatt') !== false || stripos($col, 'inkomst') !== false ||
                   stripos($col, 'deklarerat') !== false || stripos($col, 'arvode') !== false ||
                   stripos($col, 'merkostnad') !== false;
        })
    ]);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
