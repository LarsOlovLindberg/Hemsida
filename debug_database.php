<?php
// DEBUG: Kolla vad som finns i databasen
require_once('api/db_connect.php');

try {
    $pdo = get_db_connection();
    
    // Hämta alla kolumner från huvudman-tabellen
    $stmt = $pdo->query("PRAGMA table_info(huvudman)");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "=== HUVUDMAN TABLE COLUMNS ===\n";
    foreach ($columns as $col) {
        echo "- {$col['name']} ({$col['type']})\n";
    }
    
    // Hämta första huvudman-raden
    echo "\n=== FIRST HUVUDMAN RECORD ===\n";
    $stmt = $pdo->query("SELECT * FROM huvudman LIMIT 1");
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($record) {
        foreach ($record as $key => $value) {
            $displayVal = is_null($value) ? 'NULL' : (strlen($value) > 50 ? substr($value, 0, 50) . '...' : $value);
            echo "{$key}: {$displayVal}\n";
        }
    } else {
        echo "Ingen rad hittad!\n";
    }
    
    // Visa vilka kostnader-kolumner vi söker efter
    echo "\n=== LOOKING FOR COST/INCOME COLUMNS ===\n";
    $costCols = ['HYRA', 'EL_KOSTNAD', 'HEMFORSAKRING', 'RESKOSTNADER', 'FACK_AVGIFT_AKASSA'];
    foreach ($costCols as $col) {
        $found = false;
        foreach ($columns as $dbCol) {
            if (strtoupper($dbCol['name']) === $col) {
                $found = true;
                break;
            }
        }
        echo ($found ? '✓' : '✗') . " {$col}\n";
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
?>
